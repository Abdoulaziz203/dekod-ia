const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: '' }; }

  const { code, visitorId } = body;
  if (!code || !visitorId || visitorId.length > 64) {
    return { statusCode: 400, body: JSON.stringify({ ok: false }) };
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const codeUpper = code.trim().toUpperCase();

  // Si le mode gratuit est actif, les liens d'affiliation sont désactivés
  const { data: configRow } = await sb.from('config').select('est_gratuit').limit(1).single();
  if (configRow?.est_gratuit) return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'gratuit' }) };

  // Vérifier que le code appartient à un partenaire validé
  const { data: part } = await sb
    .from('partenaires')
    .select('id')
    .eq('code_partenaire', codeUpper)
    .eq('statut', 'validé')
    .single();

  if (!part) return { statusCode: 200, body: JSON.stringify({ ok: false }) };

  // Insérer (UNIQUE empêche les doublons par code+visitor_id)
  await sb.from('visiteurs').upsert(
    { code_partenaire: codeUpper, visitor_id: visitorId },
    { onConflict: 'code_partenaire,visitor_id', ignoreDuplicates: true }
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};
