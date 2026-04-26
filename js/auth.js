async function getSession() {
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

async function getRoleRedirect(userId) {
  const { data: profile } = await sb.from('profiles').select('role, suspendu').eq('id', userId).single();

  if (profile?.suspendu) {
    await sb.auth.signOut();
    const err = new Error('Compte suspendu. Contacte le support.');
    err.code = 'SUSPENDED';
    throw err;
  }

  const role = profile?.role || 'lecteur';
  if (role === 'admin')      return 'admin.html';
  if (role === 'partenaire') return 'partenaire-dashboard.html';

  // Vérifier si l'accès est activé (clé valide saisie)
  const { data: acces } = await sb
    .from('acces')
    .select('actif')
    .eq('user_id', userId)
    .eq('actif', true)
    .maybeSingle();

  if (!acces) return 'activation.html';
  return 'dashboard.html';
}

async function signUp(prenom, email, password) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { prenom } }
  });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await sb.auth.signOut();
  if (error) throw error;
  window.location.href = 'connexion.html';
}

async function redirectIfLoggedIn() {
  const session = await getSession();
  if (session) {
    try {
      const dest = await getRoleRedirect(session.user.id);
      window.location.href = dest;
    } catch (err) {
      if (err.code === 'SUSPENDED') {
        toast('Compte suspendu. Contacte le support.', 'error');
      }
    }
  }
}
