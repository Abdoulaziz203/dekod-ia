let allUsers = [];
let totalChapitres = 0;

async function initAdmin() {
  const session = await requireRole('admin');
  if (!session) return;

  await Promise.all([loadStats(), loadUsers()]);
}

async function loadStats() {
  const [
    { count: totalInscrits },
    { count: totalPayants },
    { data: progData },
    { data: chapData }
  ] = await Promise.all([
    sb.from('profiles').select('id', { count: 'exact', head: true }),
    sb.from('acces').select('id', { count: 'exact', head: true }).eq('type', 'paid').eq('actif', true),
    sb.from('progression').select('user_id, lu').eq('lu', true),
    sb.from('chapitres').select('id', { count: 'exact', head: true })
  ]);

  totalChapitres = chapData || 0;

  // Progression moyenne
  let progMoy = 0;
  if (progData && totalInscrits > 0 && totalChapitres > 0) {
    const byUser = {};
    progData.forEach(r => { byUser[r.user_id] = (byUser[r.user_id] || 0) + 1; });
    const vals = Object.values(byUser);
    const moy = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    progMoy = Math.round((moy / totalChapitres) * 100);
  }

  // Chapitre le plus lu
  const chapCount = {};
  (progData || []).forEach(r => {
    // We don't have chapitre_id here because we didn't select it — use a separate query
  });

  const { data: topChap } = await sb.from('progression')
    .select('chapitre_id, chapitres(titre)')
    .eq('lu', true)
    .limit(500);

  let topTitre = '—';
  if (topChap && topChap.length > 0) {
    const freq = {};
    topChap.forEach(r => { freq[r.chapitre_id] = (freq[r.chapitre_id] || 0) + 1; });
    const topId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
    const found = topChap.find(r => r.chapitre_id === topId);
    topTitre = found?.chapitres?.titre?.slice(0, 28) + '…' || '—';
  }

  renderStats(totalInscrits || 0, totalPayants || 0, progMoy, topTitre);
}

function renderStats(inscrits, payants, progMoy, topChap) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label"><i data-lucide="users"></i> Inscrits total</div>
      <div class="stat-value">${inscrits}</div>
      <div class="stat-sub">comptes créés</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i data-lucide="credit-card"></i> Payants</div>
      <div class="stat-value red">${payants}</div>
      <div class="stat-sub">accès actifs payants</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i data-lucide="trending-up"></i> Progression moy.</div>
      <div class="stat-value">${progMoy}%</div>
      <div class="stat-sub">moyenne lecteurs actifs</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i data-lucide="book-open"></i> Chap. + lu</div>
      <div class="stat-value" style="font-size:18px;padding-top:6px">${topChap}</div>
      <div class="stat-sub">le plus consulté</div>
    </div>
  `;
  lucide.createIcons();
}

async function loadUsers() {
  const { data: profiles } = await sb.from('profiles').select('id, prenom, email, role, created_at').order('created_at', { ascending: false });
  const { data: accesRows } = await sb.from('acces').select('user_id, type, actif');
  const { data: progRows } = await sb.from('progression').select('user_id').eq('lu', true);

  const accesMap = {};
  (accesRows || []).forEach(r => { accesMap[r.user_id] = r; });

  const progMap = {};
  (progRows || []).forEach(r => { progMap[r.user_id] = (progMap[r.user_id] || 0) + 1; });

  allUsers = (profiles || []).map(p => ({
    ...p,
    acces: accesMap[p.id],
    chapLus: progMap[p.id] || 0,
    pct: totalChapitres > 0 ? Math.round(((progMap[p.id] || 0) / totalChapitres) * 100) : 0
  }));

  renderUsers(allUsers);
}

function renderUsers(users) {
  const tbody = document.getElementById('users-tbody');
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:32px">Aucun utilisateur trouvé.</td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td class="name">${u.prenom || '—'}</td>
      <td class="muted">${u.email || '—'}</td>
      <td class="muted">${formatDate(u.created_at)}</td>
      <td>${u.chapLus} / ${totalChapitres}</td>
      <td>
        <div class="progress-mini">
          <div class="progress-mini-bar"><div class="progress-mini-fill" style="width:${u.pct}%"></div></div>
          <span class="progress-mini-pct">${u.pct}%</span>
        </div>
      </td>
      <td>
        ${u.acces?.actif
          ? '<span class="badge-actif"><i data-lucide="check-circle"></i> Actif</span>'
          : '<span class="badge-actif badge-revoke"><i data-lucide="x-circle"></i> Révoqué</span>'}
      </td>
      <td>
        ${u.acces?.actif
          ? `<button class="btn-revoke" onclick="revoquerAcces('${u.id}')"><i data-lucide="ban"></i> Révoquer</button>`
          : '—'}
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}

async function revoquerAcces(userId) {
  if (!confirm('Révoquer l\'accès de cet utilisateur ?')) return;
  const { error } = await sb.from('acces').update({ actif: false }).eq('user_id', userId);
  if (!error) {
    toast('Accès révoqué.', 'success');
    allUsers = allUsers.map(u => u.id === userId ? { ...u, acces: { ...u.acces, actif: false } } : u);
    renderUsers(allUsers);
  } else {
    toast('Erreur lors de la révocation.', 'error');
  }
}

function filterUsers(query) {
  if (!query.trim()) { renderUsers(allUsers); return; }
  const q = query.toLowerCase();
  renderUsers(allUsers.filter(u => (u.email || '').toLowerCase().includes(q) || (u.prenom || '').toLowerCase().includes(q)));
}

document.getElementById('search-input').addEventListener('input', e => filterUsers(e.target.value));

initAdmin();
