async function checkAcces(guide_id) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'connexion'; return false; }

  const { data } = await sb.from('acces')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('guide_id', guide_id)
    .eq('actif', true)
    .maybeSingle();

  if (!data) { window.location.href = 'activation'; return false; }
  return true;
}
