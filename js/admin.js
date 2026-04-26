let allUsers = [];
let totalChapitres = 0;

async function initAdmin() {
  const session = await requireRole('admin');
  if (!session) return;

  await Promise.all([loadStats(), loadUsers(), loadPartenaires()]);
}

async function loadStats() {
  const [
    { count: totalInscrits },
    { count: totalPayants },
    { data: progData }
  ] = await Promise.all([
    sb.from('profiles').select('id', { count: 'exact', head: true }),
    sb.from('acces').select('id', { count: 'exact', head: true }).eq('type', 'paid').eq('actif', true),
    sb.from('progression').select('user_id, lu').eq('lu', true)
  ]);

  const { count: chapCount } = await sb.from('chapitres').select('id', { count: 'exact', head: true });
  totalChapitres = chapCount || 0;

  let progMoy = 0;
  if (progData && totalInscrits > 0 && totalChapitres > 0) {
    const byUser = {};
    progData.forEach(r => { byUser[r.user_id] = (byUser[r.user_id] || 0) + 1; });
    const vals = Object.values(byUser);
    const moy = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    progMoy = Math.round((moy / totalChapitres) * 100);
  }

  const { count: totalPartenaires } = await sb
    .from('partenaires')
    .select('id', { count: 'exact', head: true })
    .eq('statut', 'en_attente');

  renderStats(totalInscrits || 0, totalPayants || 0, progMoy, totalPartenaires || 0);
}

function renderStats(inscrits, payants, progMoy, enAttente) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label"><i data-lucide="users"></i> Inscrits total</div>
      <div class="stat-value">${inscrits}</div>
      <div class="stat-sub">comptes créés</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i data-lucide="key"></i> Clés activées</div>
      <div class="stat-value red">${payants}</div>
      <div class="stat-sub">accès actifs</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i data-lucide="trending-up"></i> Progression moy.</div>
      <div class="stat-value">${progMoy}%</div>
      <div class="stat-sub">moyenne lecteurs actifs</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i data-lucide="handshake"></i> Partenaires en attente</div>
      <div class="stat-value ${enAttente > 0 ? 'red' : ''}">${enAttente}</div>
      <div class="stat-sub">demandes à valider</div>
    </div>
  `;
  lucide.createIcons();
}

async function loadUsers() {
  const { data: profiles } = await sb.from('profiles').select('id, prenom, email, role, created_at, ref_code').order('created_at', { ascending: false });
  const { data: accesRows } = await sb.from('acces').select('user_id, type, actif');
  const { data: progRows }  = await sb.from('progression').select('user_id').eq('lu', true);

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
      <td class="muted">
        ${u.email || '—'}
        ${u.ref_code ? `<br><span style="font-size:10px;font-family:monospace;color:var(--color-red);">via ${u.ref_code}</span>` : ''}
      </td>
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
          : '<span class="badge-actif badge-revoke"><i data-lucide="x-circle"></i> Inactif</span>'}
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

// ── Partenaires ──────────────────────────────────────────────────────────────

async function loadPartenaires() {
  const { data: parts } = await sb
    .from('partenaires')
    .select('id, user_id, nom, email, telephone, pays, statut, code_partenaire, created_at')
    .order('created_at', { ascending: false });

  renderPartenaires(parts || []);
}

function renderPartenaires(parts) {
  const tbody = document.getElementById('partenaires-tbody');
  if (!tbody) return;

  if (parts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--color-text-muted);padding:32px">Aucun partenaire pour l'instant.</td></tr>`;
    return;
  }

  const badgeStatut = (s) => {
    if (s === 'en_attente') return '<span class="badge-actif" style="background:rgba(234,179,8,0.12);color:#eab308;"><i data-lucide="clock"></i> En attente</span>';
    if (s === 'validé')     return '<span class="badge-actif"><i data-lucide="check-circle"></i> Validé</span>';
    return '<span class="badge-actif badge-revoke"><i data-lucide="x-circle"></i> Rejeté</span>';
  };

  tbody.innerHTML = parts.map(p => `
    <tr>
      <td class="name">${p.nom || '—'}</td>
      <td class="muted">${p.email || '—'}</td>
      <td class="muted">${p.telephone || '—'}</td>
      <td class="muted">${p.pays || '—'}</td>
      <td><code style="font-family:monospace;font-size:11px;color:var(--color-red)">${p.code_partenaire || '—'}</code></td>
      <td class="muted">${formatDate(p.created_at)}</td>
      <td>${badgeStatut(p.statut)}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;">
        ${p.statut !== 'validé'  ? `<button class="btn-validate" onclick="validerPartenaire('${p.id}')"><i data-lucide="check"></i> Valider</button>` : ''}
        ${p.statut !== 'rejeté' ? `<button class="btn-revoke"   onclick="rejeterPartenaire('${p.id}')"><i data-lucide="x"></i> Rejeter</button>` : ''}
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}

async function validerPartenaire(id) {
  const { error } = await sb.from('partenaires').update({ statut: 'validé' }).eq('id', id);
  if (!error) {
    toast('Partenaire validé.', 'success');
    loadPartenaires();
    loadStats();
  } else {
    toast('Erreur lors de la validation.', 'error');
  }
}

async function rejeterPartenaire(id) {
  if (!confirm('Rejeter ce partenaire ?')) return;
  const { error } = await sb.from('partenaires').update({ statut: 'rejeté' }).eq('id', id);
  if (!error) {
    toast('Partenaire rejeté.', 'success');
    loadPartenaires();
  } else {
    toast('Erreur lors du rejet.', 'error');
  }
}

document.getElementById('search-input').addEventListener('input', e => filterUsers(e.target.value));

initAdmin();
