const { createClient } = require('@supabase/supabase-js');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: '' };

  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Non authentifié.' }) };
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Session invalide.' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Requête invalide.' }) };
  }

  const code = (body.code || '').trim().toUpperCase();
  if (!code) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Clé manquante.' }) };
  }

  // Vérifier que la clé existe et est disponible
  const { data: cle } = await sb
    .from('cles')
    .select('id')
    .eq('code', code)
    .eq('statut', 'unused')
    .single();

  if (!cle) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Clé invalide ou déjà utilisée.' }) };
  }

  // Lire le prix actuel depuis config
  const { data: configRow } = await sb.from('config').select('prix_actuel').limit(1).single();
  const prixActuel = configRow?.prix_actuel || 0;

  // Marquer la clé comme utilisée + snapshot du prix
  await sb.from('cles').update({
    statut: 'used',
    utilise_par: user.email,
    active_at: new Date().toISOString(),
    prix_achat: prixActuel
  }).eq('id', cle.id);

  // Activer l'accès de l'utilisateur
  const { error: accesError } = await sb
    .from('acces')
    .update({ actif: true, type: 'paid' })
    .eq('user_id', user.id);

  if (accesError) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Erreur lors de l\'activation.' }) };
  }

  // Créer une commission si l'utilisateur a été référé par un partenaire
  if (prixActuel > 0) {
    const { data: profile } = await sb
      .from('profiles')
      .select('ref_code')
      .eq('id', user.id)
      .single();

    if (profile?.ref_code) {
      const { data: partenaire } = await sb
        .from('partenaires')
        .select('id')
        .eq('code_partenaire', profile.ref_code)
        .eq('statut', 'validé')
        .single();

      if (partenaire) {
        const { data: acces } = await sb
          .from('acces')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (acces) {
          const commission = Math.round(prixActuel * 0.35);
          await sb.from('commissions').insert({
            partenaire_id: partenaire.id,
            acces_id: acces.id,
            montant_vente: prixActuel,
            montant_commission: commission,
            statut: 'en_attente'
          });
        }
      }
    }
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
};
