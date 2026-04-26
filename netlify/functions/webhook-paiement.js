const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'JSON invalide' };
  }

  const { statut, tokenPay, totalPrice, personal_Info } = payload;

  // Vérification 1 : MoneyFusion confirme le paiement
  if (statut !== true) {
    return { statusCode: 200, body: 'Paiement non confirmé' };
  }

  // Vérification 2 : montant exact attendu
  if (Number(totalPrice) !== 12000) {
    return { statusCode: 200, body: 'Montant invalide' };
  }

  // Vérification 3 : token présent
  if (!tokenPay) {
    return { statusCode: 400, body: 'Token manquant' };
  }

  // Vérification 4 : paiementId présent (envoyé par nous lors de l'initiation)
  const paiementId = personal_Info?.[0]?.paiementId;
  if (!paiementId) {
    return { statusCode: 400, body: 'paiementId manquant' };
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Vérification 5 : paiementId connu + non encore traité (anti-forgery + idempotence)
  const { data: paiement, error: fetchError } = await sb
    .from('paiements')
    .select('id, user_id, guide_id, statut')
    .eq('id', paiementId)
    .eq('statut', 'en_attente')
    .single();

  if (fetchError || !paiement) {
    return { statusCode: 200, body: 'Paiement inconnu ou déjà traité' };
  }

  // Marquer le paiement comme payé
  const { error: payError } = await sb
    .from('paiements')
    .update({ statut: 'payé', token: tokenPay, paye_le: new Date().toISOString() })
    .eq('id', paiementId);

  if (payError) {
    return { statusCode: 500, body: 'Erreur mise à jour paiement' };
  }

  // Activer l'accès au guide (permanent, sans expiration)
  const { error: accesError } = await sb
    .from('acces')
    .update({ actif: true, type: 'paid', expire_le: null })
    .eq('user_id', paiement.user_id)
    .eq('guide_id', paiement.guide_id);

  if (accesError) {
    return { statusCode: 500, body: 'Erreur activation accès' };
  }

  return { statusCode: 200, body: 'OK' };
};
