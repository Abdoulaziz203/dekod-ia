// ── Modal de confirmation custom (remplace confirm() natif) ──────────────────
// Usage : const ok = await confirmModal({ title, message, confirmLabel, cancelLabel, danger });
// Retourne Promise<boolean>
function confirmModal(opts) {
  opts = opts || {};
  const title        = opts.title        || 'Confirmer l\'action';
  const message      = opts.message      || 'Es-tu sûr de vouloir continuer ?';
  const confirmLabel = opts.confirmLabel || 'Confirmer';
  const cancelLabel  = opts.cancelLabel  || 'Annuler';
  const danger       = !!opts.danger;
  const icon         = opts.icon || (danger ? 'alert-triangle' : 'help-circle');

  return new Promise(function(resolve) {
    // Nettoyage si une modale précédente traîne
    const old = document.getElementById('confirm-modal-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.className = 'confirm-modal-overlay';
    overlay.innerHTML = `
      <div class="confirm-modal ${danger ? 'is-danger' : ''}" role="dialog" aria-modal="true">
        <div class="confirm-modal-icon">
          <i data-lucide="${icon}"></i>
        </div>
        <h3 class="confirm-modal-title">${title}</h3>
        <p class="confirm-modal-message">${message}</p>
        <div class="confirm-modal-actions">
          <button type="button" class="confirm-modal-cancel">${cancelLabel}</button>
          <button type="button" class="confirm-modal-confirm ${danger ? 'is-danger' : ''}">${confirmLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Animation d'entrée
    requestAnimationFrame(() => overlay.classList.add('is-open'));

    function close(result) {
      overlay.classList.remove('is-open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { overlay.remove(); }, 180);
      resolve(result);
    }
    function onKey(e) {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter')  close(true);
    }
    document.addEventListener('keydown', onKey);

    overlay.querySelector('.confirm-modal-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('.confirm-modal-confirm').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  });
}

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
    window.location.href = 'connexion';
    return null;
  }
  return session;
}

async function requireRole(role) {
  const session = await requireAuth();
  if (!session) return null;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
  if (!profile || profile.role !== role) {
    window.location.href = 'dashboard';
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
    let tr = rowFn(item, i);
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
