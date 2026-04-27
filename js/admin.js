let allUsers = [];
let totalChapitres = 0;
let allPartenaires = [];

async function initAdmin() {
  const session = await requireRole('admin');
  if (!session) return;

  await Promise.all([loadStats(), loadUsers(), loadCles(), loadConfig(), loadPartenaires(), loadAvis()]);
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
    .select('id, prenom, email, role, created_at, ref_code')
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
  tbody.innerHTML = buildToggleRows(users, u => `
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
          : u.acces
            ? '<span class="badge-actif badge-revoke"><i data-lucide="x-circle"></i> Inactif</span>'
            : '<span class="badge-actif badge-revoke" style="opacity:0.5"><i data-lucide="minus-circle"></i> Sans accès</span>'}
      </td>
      <td>
        ${u.role !== 'admin' && u.acces
          ? u.acces.actif
            ? `<button class="btn-revoke" onclick="setAccesActif('${u.id}', false)"><i data-lucide="x-circle"></i> Désactiver</button>`
            : `<button class="btn-validate" onclick="setAccesActif('${u.id}', true)"><i data-lucide="check-circle"></i> Activer</button>`
          : '—'}
      </td>
    </tr>
  `, 7);
  lucide.createIcons();
}

async function setAccesActif(userId, actif) {
  const action = actif ? 'activer' : 'désactiver';
  if (!confirm(`Voulez-vous ${action} l'accès de cet utilisateur ?`)) return;
  const { error } = await sb.from('acces').update({ actif }).eq('user_id', userId);
  if (!error) {
    toast(actif ? 'Accès activé.' : 'Accès désactivé.', 'success');
    allUsers = allUsers.map(u => u.id === userId ? { ...u, acces: { ...u.acces, actif } } : u);
    renderUsers(allUsers);
  } else {
    toast('Erreur lors de la mise à jour.', 'error');
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

function renderCles(cles) {
  const tbody = document.getElementById('cles-tbody');
  if (!tbody) return;

  if (cles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:32px">Aucune clé générée.</td></tr>`;
    return;
  }

  tbody.innerHTML = buildToggleRows(cles, c => {
    const masked = maskKey(c.code);
    return `<tr>
      <td class="muted" style="font-family:monospace">#${String(c.numero_interne).padStart(3, '0')}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <code style="font-family:monospace;font-size:12px;color:var(--color-text-soft)">${masked}</code>
          ${c.statut === 'unused'
            ? `<button class="btn-copy-key" title="Copier la clé" onclick="copierCle('${c.code}', this)"><i data-lucide="copy"></i></button>`
            : ''}
        </div>
      </td>
      <td>${c.statut === 'unused'
        ? '<span class="badge-actif"><i data-lucide="circle"></i> Disponible</span>'
        : '<span class="badge-actif badge-revoke"><i data-lucide="check-circle"></i> Utilisée</span>'}
      </td>
      <td class="muted">${c.utilise_par || '—'}</td>
      <td class="muted">${c.active_at ? formatDate(c.active_at) : '—'}</td>
      <td class="muted">${c.prix_achat > 0 ? c.prix_achat + ' FCFA' : '—'}</td>
    </tr>`;
  }, 6);
  lucide.createIcons();
}

function maskKey(code) {
  const parts = code.split('-');
  if (parts.length < 2) return code.slice(0, -4) + '****';
  const copy = [...parts];
  copy[copy.length - 1] = '****';
  return copy.join('-');
}

function copierCle(code, btn) {
  navigator.clipboard.writeText(code).then(() => {
    toast('Clé copiée !', 'success');
    btn.innerHTML = '<i data-lucide="check"></i>';
    lucide.createIcons();
    setTimeout(() => {
      btn.innerHTML = '<i data-lucide="copy"></i>';
      lucide.createIcons();
    }, 2000);
  });
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
  btn.innerHTML = '<i data-lucide="plus"></i> Générer';
  lucide.createIcons();
}

// ── Prix & Config ─────────────────────────────────────────────────────────────

async function loadConfig() {
  const { data } = await sb.from('config').select('prix_actuel, est_gratuit').limit(1).single();
  if (!data) return;

  const input   = document.getElementById('config-prix');
  const display = document.getElementById('config-prix-display');
  if (input)   input.value = data.prix_actuel;
  if (display) display.textContent = data.prix_actuel >= 600 ? data.prix_actuel.toLocaleString('fr-FR') + ' FCFA' : '— FCFA';

  updateGratuitLabel(data.est_gratuit);
}

function updateGratuitLabel(isGratuit) {
  const label = document.getElementById('gratuit-label');
  if (!label) return;
  // Le guide ne peut plus être à 0 — on affiche juste l'état des partenaires
  label.textContent = isGratuit ? 'Liens partenaires désactivés' : 'Liens partenaires actifs';
  label.className = isGratuit ? 'config-note red' : 'config-note';
}

async function saveConfig() {
  const prix = parseInt(document.getElementById('config-prix')?.value || '0', 10);

  if (!prix || prix < 600) {
    toast('Le prix minimum est 600 FCFA.', 'error');
    return;
  }

  const estGratuit = false; // prix toujours >= 600 → jamais gratuit via l'UI

  const btn = document.getElementById('btn-save-config');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader"></i> Sauvegarde…';
  lucide.createIcons();

  const { error } = await sb.from('config').update({ prix_actuel: prix, est_gratuit: estGratuit }).eq('id', 1);
  if (error) {
    toast('Erreur lors de la sauvegarde.', 'error');
  } else {
    const display = document.getElementById('config-prix-display');
    if (display) display.textContent = prix.toLocaleString('fr-FR') + ' FCFA';
    updateGratuitLabel(estGratuit);
    toast('Prix mis à jour.', 'success');
    await loadStats();
  }

  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="save"></i> Sauvegarder';
  lucide.createIcons();
}

// ── Avis lecteurs ─────────────────────────────────────────────────────────────

// Masquer partiellement un email : ab***@gmail.com
function maskEmail(email) {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return local.slice(0, 2) + '***@' + domain;
}

// Tronquer un texte long
function truncate(str, len) {
  len = len || 52;
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// Échapper les attributs HTML
function escAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Copier depuis un data-attribute (évite les problèmes d'échappement inline)
function copyFromData(btn) {
  const text = btn.dataset.copy || '';
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check"></i>';
    lucide.createIcons();
    setTimeout(() => { btn.innerHTML = orig; lucide.createIcons(); }, 2000);
  });
}

async function loadAvis() {
  // Charger avis + user_ids pour fallback email
  const { data: avis } = await sb
    .from('commentaires')
    .select('id, user_id, prenom, email, avatar_url, note, contenu, created_at')
    .order('created_at', { ascending: false });

  const tbody = document.getElementById('avis-tbody');
  const count = document.getElementById('avis-count');
  if (!tbody) return;

  const liste = avis || [];

  // Fallback email : chercher dans profiles pour ceux sans email stocké
  const manquants = liste.filter(a => !a.email).map(a => a.user_id);
  const profileMap = {};
  if (manquants.length > 0) {
    const { data: profs } = await sb.from('profiles').select('id, email').in('id', manquants);
    (profs || []).forEach(p => { profileMap[p.id] = p.email; });
  }

  if (count) count.textContent = liste.length > 0 ? `${liste.length} avis` : '';

  if (liste.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:32px">Aucun avis pour l'instant.</td></tr>`;
    return;
  }

  tbody.innerHTML = buildToggleRows(liste, a => {
    const emailVal  = a.email || profileMap[a.user_id] || '';
    const masked    = maskEmail(emailVal);
    const stars     = '★'.repeat(a.note) + '☆'.repeat(5 - a.note);
    const contenuCourt = truncate(a.contenu, 52);

    const avatar = a.avatar_url
      ? `<img src="${a.avatar_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block;">`
      : `<div style="width:32px;height:32px;border-radius:50%;background:#252525;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="user" style="width:14px;height:14px;color:var(--color-text-muted);"></i></div>`;

    const emailCell = masked
      ? `<div style="display:flex;align-items:center;gap:5px;">
           <span style="font-family:monospace;font-size:11px;color:var(--color-text-muted);white-space:nowrap;">${masked}</span>
           <button class="btn-copy-key" data-copy="${escAttr(emailVal)}" onclick="copyFromData(this)" title="Copier l'email"><i data-lucide="copy"></i></button>
         </div>`
      : '—';

    const avisCell = `<div style="display:flex;align-items:center;gap:5px;max-width:280px;">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;" title="${escAttr(a.contenu)}">${contenuCourt}</span>
        <button class="btn-copy-key" data-copy="${escAttr(a.contenu)}" onclick="copyFromData(this)" title="Copier l'avis" style="flex-shrink:0;"><i data-lucide="copy"></i></button>
      </div>`;

    return `<tr>
      <td style="padding:10px 16px;">${avatar}</td>
      <td class="name" style="white-space:nowrap;">${a.prenom || '—'}</td>
      <td style="white-space:nowrap;">${emailCell}</td>
      <td style="color:#f59e0b;font-size:15px;letter-spacing:2px;white-space:nowrap;">${stars}</td>
      <td style="white-space:nowrap;">${avisCell}</td>
      <td class="muted" style="white-space:nowrap;">${formatDate(a.created_at)}</td>
    </tr>`;
  }, 6);
  lucide.createIcons();
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

  tbody.innerHTML = buildToggleRows(parts, p => `
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
      <td>
        <button class="btn-activite" onclick="ouvrirModalActivite('${p.id}', '${p.code_partenaire || ''}', '${(p.nom || '').replace(/'/g, "\\'")}')">
          <i data-lucide="bar-chart-2"></i> Activité
        </button>
      </td>
    </tr>
  `, 9);
  lucide.createIcons();
}

// ── Modal Activité ────────────────────────────────────────────────────────────

function ouvrirModalActivite(partId, code, nom) {
  const modal = document.getElementById('activite-modal');
  const title = document.getElementById('modal-title');
  const body  = document.getElementById('modal-body');

  title.textContent = `Activité — ${nom}`;
  body.innerHTML = `<div class="activite-loading"><i data-lucide="loader"></i> Chargement…</div>`;
  lucide.createIcons();

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  chargerActivite(partId, code, body);
}

function fermerModal() {
  document.getElementById('activite-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function chargerActivite(partId, code, container) {
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

  container.innerHTML = `
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
          <tr><th>Nom</th><th>Email</th><th>Prix</th><th>Commission</th><th>Statut</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${commList.map(c => {
            const user = c.acces?.profiles || {};
            return `<tr>
              <td class="name">${user.prenom || '—'}</td>
              <td class="muted">${user.email || '—'}</td>
              <td class="muted">${c.montant_vente} FCFA</td>
              <td class="muted" style="color:#22c55e">${c.montant_commission} FCFA</td>
              <td>${c.statut === 'payé'
                ? '<span class="badge-actif"><i data-lucide="check-circle"></i> Payé</span>'
                : '<span class="badge-actif badge-revoke"><i data-lucide="clock"></i> En attente</span>'}
              </td>
              <td>${c.statut !== 'payé'
                ? `<button class="btn-validate" onclick="marquerPaye('${c.id}', '${partId}', '${code}', this)">
                     <i data-lucide="check"></i> Marquer payé
                   </button>`
                : `<span class="muted" style="font-size:11px">${c.paye_le ? formatDate(c.paye_le) : ''}</span>`}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : `<p style="color:var(--color-text-muted);font-size:13px;margin-top:12px;">Aucun acheteur pour ce partenaire.</p>`}
  `;
  lucide.createIcons();
}

async function marquerPaye(commissionId, partId, code, btn) {
  const { error } = await sb.from('commissions')
    .update({ statut: 'payé', paye_le: new Date().toISOString() })
    .eq('id', commissionId);

  if (!error) {
    toast('Commission marquée payée.', 'success');
    const body = document.getElementById('modal-body');
    await chargerActivite(partId, code, body);
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

// Fermer modal en cliquant sur le fond
document.getElementById('activite-modal').addEventListener('click', function(e) {
  if (e.target === this) fermerModal();
});

document.getElementById('search-input').addEventListener('input', e => filterUsers(e.target.value));

initAdmin();
