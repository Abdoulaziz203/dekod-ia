let allUsers = [];
let totalChapitres = 0;
let allPartenaires = [];

async function initAdmin() {
  const session = await requireRole('admin');
  if (!session) return;

  await Promise.all([loadStats(), loadUsers(), loadCles(), loadConfig(), loadPartenaires()]);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

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

// ── Utilisateurs ──────────────────────────────────────────────────────────────

async function loadUsers() {
  const { data: profiles } = await sb.from('profiles')
    .select('id, prenom, email, role, created_at, ref_code, suspendu')
    .order('created_at', { ascending: false });
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
    <tr class="${u.suspendu ? 'row-suspended' : ''}">
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
        ${u.suspendu
          ? '<span class="badge-actif badge-revoke"><i data-lucide="slash"></i> Suspendu</span>'
          : u.acces?.actif
            ? '<span class="badge-actif"><i data-lucide="check-circle"></i> Actif</span>'
            : '<span class="badge-actif badge-revoke"><i data-lucide="x-circle"></i> Inactif</span>'}
      </td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;">
        ${u.role !== 'admin'
          ? u.suspendu
            ? `<button class="btn-validate" onclick="reactiverUser('${u.id}')"><i data-lucide="check"></i> Réactiver</button>`
            : `<button class="btn-revoke" onclick="suspendreUser('${u.id}')"><i data-lucide="slash"></i> Suspendre</button>`
          : '—'}
        ${!u.suspendu && u.acces?.actif
          ? `<button class="btn-revoke" onclick="revoquerAcces('${u.id}')"><i data-lucide="ban"></i> Révoquer</button>`
          : ''}
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}

async function suspendreUser(userId) {
  if (!confirm('Suspendre ce compte ? L\'utilisateur ne pourra plus se connecter.')) return;
  const { error } = await sb.from('profiles').update({ suspendu: true }).eq('id', userId);
  if (!error) {
    toast('Compte suspendu.', 'success');
    allUsers = allUsers.map(u => u.id === userId ? { ...u, suspendu: true } : u);
    renderUsers(allUsers);
  } else {
    toast('Erreur lors de la suspension.', 'error');
  }
}

async function reactiverUser(userId) {
  const { error } = await sb.from('profiles').update({ suspendu: false }).eq('id', userId);
  if (!error) {
    toast('Compte réactivé.', 'success');
    allUsers = allUsers.map(u => u.id === userId ? { ...u, suspendu: false } : u);
    renderUsers(allUsers);
  } else {
    toast('Erreur lors de la réactivation.', 'error');
  }
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
  renderUsers(allUsers.filter(u =>
    (u.email || '').toLowerCase().includes(q) || (u.prenom || '').toLowerCase().includes(q)
  ));
}

// ── Clés d'activation ─────────────────────────────────────────────────────────

async function loadCles() {
  const { data: cles } = await sb
    .from('cles')
    .select('id, numero_interne, code, statut, utilise_par, active_at, prix_achat')
    .order('numero_interne', { ascending: false });

  renderCles(cles || []);
}

function maskKey(code) {
  const parts = code.split('-');
  if (parts.length < 2) return code.slice(0, -4) + '****';
  parts[parts.length - 1] = '****';
  return parts.join('-');
}

function renderCles(cles) {
  const tbody = document.getElementById('cles-tbody');
  if (!tbody) return;

  if (cles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:32px">Aucune clé générée.</td></tr>`;
    return;
  }

  tbody.innerHTML = cles.map(c => `
    <tr>
      <td class="muted" style="font-family:monospace">#${String(c.numero_interne).padStart(3, '0')}</td>
      <td><code style="font-family:monospace;font-size:12px;color:var(--color-text-soft)">${maskKey(c.code)}</code></td>
      <td>${c.statut === 'unused'
        ? '<span class="badge-actif"><i data-lucide="circle"></i> Disponible</span>'
        : '<span class="badge-actif badge-revoke"><i data-lucide="check-circle"></i> Utilisée</span>'}
      </td>
      <td class="muted">${c.utilise_par || '—'}</td>
      <td class="muted">${c.active_at ? formatDate(c.active_at) : '—'}</td>
      <td class="muted">${c.prix_achat > 0 ? c.prix_achat + ' FCFA' : '—'}</td>
    </tr>
  `).join('');
  lucide.createIcons();
}

function generateKeyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `DK-${seg()}-${seg()}-${seg()}`;
}

async function genererCles() {
  const qtyInput = document.getElementById('cles-qty');
  const qty = parseInt(qtyInput?.value || '1', 10);
  if (!qty || qty < 1 || qty > 100) {
    toast('Quantité invalide (1–100).', 'error');
    return;
  }

  const btn = document.getElementById('btn-generer-cles');
  btn.disabled = true;
  btn.textContent = 'Génération…';

  const rows = Array.from({ length: qty }, () => ({ code: generateKeyCode() }));

  const { error } = await sb.from('cles').insert(rows);
  if (error) {
    toast('Erreur lors de la génération.', 'error');
  } else {
    toast(`${qty} clé(s) générée(s).`, 'success');
    qtyInput.value = '';
    await loadCles();
  }

  btn.disabled = false;
  btn.textContent = 'Générer';
}

// ── Prix & Config ─────────────────────────────────────────────────────────────

async function loadConfig() {
  const { data } = await sb.from('config').select('prix_actuel, est_gratuit').limit(1).single();
  if (!data) return;

  const input = document.getElementById('config-prix');
  const toggle = document.getElementById('config-gratuit');
  if (input)  input.value = data.prix_actuel;
  if (toggle) toggle.checked = data.est_gratuit;

  updateGratuitLabel(data.est_gratuit);
}

function updateGratuitLabel(isGratuit) {
  const label = document.getElementById('gratuit-label');
  if (!label) return;
  label.textContent = isGratuit
    ? 'Mode gratuit actif — les liens partenaires sont désactivés'
    : 'Liens partenaires actifs';
  label.className = isGratuit ? 'config-note red' : 'config-note';
}

async function saveConfig() {
  const prix = parseInt(document.getElementById('config-prix')?.value || '0', 10);
  const estGratuit = prix === 0;

  const toggle = document.getElementById('config-gratuit');
  if (toggle) toggle.checked = estGratuit;
  updateGratuitLabel(estGratuit);

  const btn = document.getElementById('btn-save-config');
  btn.disabled = true;
  btn.textContent = 'Sauvegarde…';

  const { error } = await sb.from('config').update({ prix_actuel: prix, est_gratuit: estGratuit }).eq('id', 1);
  if (error) {
    toast('Erreur lors de la sauvegarde.', 'error');
  } else {
    toast('Prix mis à jour.', 'success');
    await loadStats();
  }

  btn.disabled = false;
  btn.textContent = 'Sauvegarder';
}

// ── Partenaires ──────────────────────────────────────────────────────────────

async function loadPartenaires() {
  const { data: parts } = await sb
    .from('partenaires')
    .select('id, user_id, nom, email, telephone, pays, statut, code_partenaire, created_at')
    .order('created_at', { ascending: false });

  allPartenaires = parts || [];
  renderPartenaires(allPartenaires);
}

function renderPartenaires(parts) {
  const tbody = document.getElementById('partenaires-tbody');
  if (!tbody) return;

  if (parts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--color-text-muted);padding:32px">Aucun partenaire pour l'instant.</td></tr>`;
    return;
  }

  const badgeStatut = (s) => {
    if (s === 'en_attente') return '<span class="badge-actif" style="background:rgba(234,179,8,0.12);color:#eab308;"><i data-lucide="clock"></i> En attente</span>';
    if (s === 'validé')     return '<span class="badge-actif"><i data-lucide="check-circle"></i> Validé</span>';
    return '<span class="badge-actif badge-revoke"><i data-lucide="x-circle"></i> Rejeté</span>';
  };

  tbody.innerHTML = parts.map(p => `
    <tr id="part-row-${p.id}">
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
      <td>
        <button class="btn-activite" onclick="toggleActivite('${p.id}', '${p.code_partenaire || ''}', this)">
          <i data-lucide="bar-chart-2"></i> Voir activité
        </button>
      </td>
    </tr>
    <tr id="activite-${p.id}" class="activite-panel" style="display:none">
      <td colspan="9" class="activite-cell">
        <div class="activite-loading"><i data-lucide="loader"></i> Chargement…</div>
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}

async function toggleActivite(partId, code, btn) {
  const row = document.getElementById(`activite-${partId}`);
  if (!row) return;

  if (row.style.display !== 'none') {
    row.style.display = 'none';
    btn.innerHTML = '<i data-lucide="bar-chart-2"></i> Voir activité';
    lucide.createIcons();
    return;
  }

  row.style.display = 'table-row';
  btn.innerHTML = '<i data-lucide="chevron-up"></i> Masquer';
  lucide.createIcons();

  await chargerActivite(partId, code, row.querySelector('.activite-cell'));
}

async function chargerActivite(partId, code, cell) {
  const [
    { count: nbVisiteurs },
    { data: inscrits },
    { data: commissions }
  ] = await Promise.all([
    sb.from('visiteurs').select('id', { count: 'exact', head: true }).eq('code_partenaire', code),
    sb.from('profiles').select('id, prenom, email').eq('ref_code', code),
    sb.from('commissions')
      .select('id, montant_vente, montant_commission, statut, paye_le, acces:acces_id(user_id, profiles:user_id(prenom, email))')
      .eq('partenaire_id', partId)
  ]);

  const inscritsList = inscrits || [];
  const commList = commissions || [];

  const totalComm = commList.reduce((s, c) => s + (c.montant_commission || 0), 0);
  const totalPaye = commList.filter(c => c.statut === 'payé').reduce((s, c) => s + (c.montant_commission || 0), 0);

  cell.innerHTML = `
    <div class="activite-stats">
      <div class="activite-stat"><span class="activite-stat-val">${nbVisiteurs || 0}</span><span class="activite-stat-lbl">Visiteurs</span></div>
      <div class="activite-stat"><span class="activite-stat-val">${inscritsList.length}</span><span class="activite-stat-lbl">Inscrits</span></div>
      <div class="activite-stat"><span class="activite-stat-val">${commList.length}</span><span class="activite-stat-lbl">Acheteurs</span></div>
      <div class="activite-stat"><span class="activite-stat-val green">${totalComm} FCFA</span><span class="activite-stat-lbl">Commission totale</span></div>
      <div class="activite-stat"><span class="activite-stat-val">${totalPaye} FCFA</span><span class="activite-stat-lbl">Déjà payé</span></div>
    </div>
    ${commList.length > 0 ? `
      <table class="activite-table">
        <thead>
          <tr>
            <th>Nom</th><th>Email</th><th>Prix payé</th><th>Commission (35%)</th><th>Statut</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${commList.map(c => {
            const user = c.acces?.profiles || {};
            return `<tr>
              <td class="name">${user.prenom || '—'}</td>
              <td class="muted">${user.email || '—'}</td>
              <td class="muted">${c.montant_vente} FCFA</td>
              <td class="muted">${c.montant_commission} FCFA</td>
              <td>${c.statut === 'payé'
                ? `<span class="badge-actif"><i data-lucide="check-circle"></i> Payé</span>`
                : `<span class="badge-actif badge-revoke"><i data-lucide="clock"></i> En attente</span>`}
              </td>
              <td>${c.statut !== 'payé'
                ? `<button class="btn-validate" onclick="marquerPaye('${c.id}', '${partId}', '${code}', this.closest('td').parentElement.closest('td'))">
                     <i data-lucide="check"></i> Marquer payé
                   </button>`
                : `<span class="muted" style="font-size:11px">${c.paye_le ? formatDate(c.paye_le) : ''}</span>`}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : `<p style="color:var(--color-text-muted);font-size:13px;margin-top:12px">Aucun acheteur pour ce partenaire.</p>`}
  `;
  lucide.createIcons();
}

async function marquerPaye(commissionId, partId, code, cell) {
  const { error } = await sb.from('commissions')
    .update({ statut: 'payé', paye_le: new Date().toISOString() })
    .eq('id', commissionId);

  if (!error) {
    toast('Commission marquée payée.', 'success');
    await chargerActivite(partId, code, cell);
  } else {
    toast('Erreur lors de la mise à jour.', 'error');
  }
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
