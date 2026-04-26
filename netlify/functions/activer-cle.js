const { createClient } = require('@supabase/supabase-js');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: '' };

  // Vérifier la session Supabase passée en header
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Non authentifié.' }) };
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Valider le token JWT de l'utilisateur
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

  // Marquer la clé comme utilisée
  await sb.from('cles')
    .update({ statut: 'used', utilise_par: user.email, active_at: new Date().toISOString() })
    .eq('id', cle.id);

  // Activer l'accès de l'utilisateur
  const { error: accesError } = await sb
    .from('acces')
    .update({ actif: true, type: 'paid' })
    .eq('user_id', user.id);

  if (accesError) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Erreur lors de l\'activation.' }) };
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
};
