function toast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

async function requireAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'connexion.html';
    return null;
  }
  return session;
}

async function requireRole(role) {
  const session = await requireAuth();
  if (!session) return null;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
  if (!profile || profile.role !== role) {
    window.location.href = 'dashboard.html';
    return null;
  }
  return session;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Pagination tableau : 5 lignes visibles + toggle ───────────────────────────
// rowFn(item) → string HTML d'un <tr>...</tr>
function buildToggleRows(items, rowFn, colspan, limit) {
  limit = limit || 5;
  if (!items || items.length === 0) return '';
  let rows = '';
  items.forEach(function(item, i) {
    let tr = rowFn(item);
    if (i >= limit) {
      // Injecte class + style sur le premier <tr> de la chaîne
      tr = tr.replace('<tr', '<tr class="row-extra" style="display:none"');
    }
    rows += tr;
  });
  if (items.length <= limit) return rows;
  const extra = items.length - limit;
  rows += `<tr class="row-toggle-tr"><td colspan="${colspan}" style="padding:10px 16px;text-align:center;border-top:1px dashed var(--color-border)"><button class="btn-table-toggle" onclick="toggleRows(this)"><i data-lucide="chevrons-down"></i><span> Afficher ${extra} de plus</span></button></td></tr>`;
  return rows;
}

function toggleRows(btn) {
  const tbody = btn.closest('tbody');
  if (!tbody) return;
  const extras = tbody.querySelectorAll('.row-extra');
  const isHidden = extras.length > 0 && extras[0].style.display === 'none';
  extras.forEach(r => { r.style.display = isHidden ? '' : 'none'; });
  const icon = btn.querySelector('[data-lucide]');
  const span = btn.querySelector('span');
  if (isHidden) {
    if (icon) icon.setAttribute('data-lucide', 'chevrons-up');
    if (span) span.textContent = ' Masquer';
  } else {
    if (icon) icon.setAttribute('data-lucide', 'chevrons-down');
    if (span) span.textContent = ` Afficher ${extras.length} de plus`;
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
