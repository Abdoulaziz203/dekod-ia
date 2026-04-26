const { createClient } = require('@supabase/supabase-js');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: '' };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Requête invalide.' }) };
  }

  const { nom, email, password, telephone, pays } = body;
  if (!nom || !email || !password || !telephone || !pays) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Tous les champs sont requis.' }) };
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prenom: nom }
  });

  if (authError) {
    const dejaCree = authError.message?.toLowerCase().includes('already') || authError.code === 'email_exists';
    return {
      statusCode: 409,
      headers: CORS,
      body: JSON.stringify({ error: dejaCree ? 'Cet email est déjà utilisé.' : authError.message })
    };
  }

  const userId = authData.user.id;

  // Générer un code partenaire unique
  const prefix = nom.replace(/\s+/g, '').substring(0, 4).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const codePartenaire = `DEKOD_${prefix}${rand}`;

  // Mettre le profil en rôle partenaire
  await sb.from('profiles').update({ role: 'partenaire', prenom: nom }).eq('id', userId);

  // Créer le record partenaire
  const { error: partError } = await sb.from('partenaires').insert({
    user_id: userId,
    nom,
    email,
    telephone,
    pays,
    statut: 'en_attente',
    code_partenaire: codePartenaire
  });

  if (partError) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Erreur création partenaire.' }) };
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
};
