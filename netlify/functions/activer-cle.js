const { createClient } = require('@supabase/supabase-js');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: CORS, body: '' };

  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Non authentifié.' }) };
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Vérifier la session
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

  // ── 0. Garde-fou : la service-role key DOIT être configurée ──────────────────
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY).' }) };
  }

  // ── 1. Vérifier que la clé est disponible ────────────────────────────────────
  const { data: cle, error: cleErr } = await sb
    .from('cles')
    .select('id, statut')
    .eq('code', code)
    .maybeSingle();

  if (cleErr) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Erreur base de données: ' + cleErr.message }) };
  }
  if (!cle) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Clé inexistante. Vérifie la saisie.' }) };
  }
  if (cle.statut !== 'unused') {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Cette clé a déjà été utilisée.' }) };
  }

  // ── 2. Charger config + profil + guide actif en parallèle ────────────────────
  const [
    { data: configRow },
    { data: profile },
    { data: guide }
  ] = await Promise.all([
    sb.from('config').select('prix_actuel').limit(1).single(),
    sb.from('profiles').select('ref_code').eq('id', user.id).maybeSingle(),
    sb.from('guides').select('id').eq('actif', true).maybeSingle()
  ]);

  if (!guide) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Aucun guide actif trouvé.' }) };
  }

  const prixActuel = configRow?.prix_actuel || 0;

  // ── 3. Marquer la clé utilisée ───────────────────────────────────────────────
  await sb.from('cles').update({
    statut: 'used',
    utilise_par: user.email,
    active_at: new Date().toISOString(),
    prix_achat: prixActuel
  }).eq('id', cle.id);

  // ── 4. Accès : UPDATE si existe, INSERT sinon ────────────────────────────────
  // Raison : creer-compte.js ne crée pas de ligne acces — il faut donc la créer ici.
  const { data: existingAcces } = await sb
    .from('acces')
    .select('id')
    .eq('user_id', user.id)
    .eq('guide_id', guide.id)
    .maybeSingle();

  let accesId;

  if (existingAcces) {
    await sb.from('acces')
      .update({ actif: true, type: 'paid' })
      .eq('id', existingAcces.id);
    accesId = existingAcces.id;
  } else {
    const { data: newAcces, error: insertErr } = await sb
      .from('acces')
      .insert({
        user_id: user.id,
        guide_id: guide.id,
        type: 'paid',
        actif: true
      })
      .select('id')
      .single();

    if (insertErr) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Erreur lors de la création de l'accès." }) };
    }
    accesId = newAcces.id;
  }

  // ── 5. Commission partenaire (si ref_code présent) ───────────────────────────
  // Règle : inscrit via lien partenaire = acquis à vie pour ce partenaire.
  if (profile?.ref_code && accesId) {
    const { data: partenaire } = await sb
      .from('partenaires')
      .select('id')
      .eq('code_partenaire', profile.ref_code)
      .eq('statut', 'validé')
      .maybeSingle();

    if (partenaire) {
      const { data: existingComm } = await sb
        .from('commissions')
        .select('id')
        .eq('partenaire_id', partenaire.id)
        .eq('acces_id', accesId)
        .maybeSingle();

      if (!existingComm) {
        const commission = Math.round(prixActuel * 0.35);
        await sb.from('commissions').insert({
          partenaire_id: partenaire.id,
          acces_id: accesId,
          montant_vente: prixActuel,
          montant_commission: commission,
          statut: 'en_attente'
        });
      }
    }
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
};
