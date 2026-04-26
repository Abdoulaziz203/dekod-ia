const { createClient } = require('@supabase/supabase-js');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const { prenom, email, password, telephone } = body;

  if (!prenom || !email || !password || !telephone) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Tous les champs sont requis.' }) };
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Créer le compte (email auto-confirmé — la vérification se fait par le paiement)
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prenom }
  });

  if (authError) {
    const dejaCree = authError.message?.toLowerCase().includes('already') ||
                     authError.code === 'email_exists';
    return {
      statusCode: 409,
      headers: CORS,
      body: JSON.stringify({
        error: dejaCree
          ? 'Cet email est déjà utilisé. Connecte-toi pour accéder à ton compte.'
          : authError.message
      })
    };
  }

  const userId = authData.user.id;

  // Récupérer le guide actif
  const { data: guide } = await sb
    .from('guides')
    .select('id')
    .eq('actif', true)
    .single();

  if (!guide) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Guide introuvable.' }) };
  }

  // Créer le record paiement (sans token — il arrivera après la redirection MoneyFusion)
  const { data: paiement, error: paiementError } = await sb
    .from('paiements')
    .insert({ user_id: userId, guide_id: guide.id, montant: 12000, statut: 'en_attente' })
    .select('id')
    .single();

  if (paiementError) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Erreur création paiement.' }) };
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ paiementId: paiement.id, prenom, email, telephone })
  };
};
