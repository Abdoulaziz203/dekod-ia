let allParties = [];
let allChapitres = [];
let lusSet = new Set();
let currentChapId = null;
let userId = null;
let guideId = null;

async function initLecteur() {
  const session = await requireAuth();
  if (!session) return;
  userId = session.user.id;

  const { data: guide } = await sb.from('guides').select('id').eq('actif', true).single();
  if (!guide) return;
  guideId = guide.id;

  const ok = await checkAcces(guideId);
  if (!ok) return;

  // Charger parties + chapitres
  const [{ data: parties }, { data: chapitres }, { data: prog }] = await Promise.all([
    sb.from('parties').select('id, titre, ordre').eq('guide_id', guideId).order('ordre'),
    sb.from('chapitres').select('id, partie_id, titre, ordre').order('ordre'),
    sb.from('progression').select('chapitre_id').eq('user_id', userId).eq('lu', true)
  ]);

  allParties = parties || [];
  allChapitres = sortChapitres(chapitres || [], allParties);
  lusSet = new Set((prog || []).map(r => r.chapitre_id));

  renderSidebar();
  renderSidebarMobile();

  // Lire l'id depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const chapId = params.get('id') || allChapitres[0]?.id;
  if (chapId) await loadChapitre(chapId, false);
}

function sortChapitres(chapitres, parties) {
  return [...chapitres].sort((a, b) => {
    const pa = parties.find(p => p.id === a.partie_id)?.ordre ?? 0;
    const pb = parties.find(p => p.id === b.partie_id)?.ordre ?? 0;
    return pa !== pb ? pa - pb : a.ordre - b.ordre;
  });
}

async function loadChapitre(chapId, animate = true) {
  currentChapId = chapId;

  // Update URL sans rechargement
  const params = new URLSearchParams(window.location.search);
  params.set('id', chapId);
  history.pushState({}, '', `?${params.toString()}`);

  const contentEl = document.getElementById('chapitre-content');

  if (animate) {
    contentEl.classList.add('fade-out');
    await sleep(150);
  }

  showContentSkeleton(contentEl);
  if (animate) contentEl.classList.remove('fade-out');

  const { data: chap } = await sb.from('chapitres')
    .select('id, titre, contenu, ordre, partie_id')
    .eq('id', chapId)
    .single();

  if (!chap) return;

  const partie = allParties.find(p => p.id === chap.partie_id);
  const idx = allChapitres.findIndex(c => c.id === chapId);
  const total = allChapitres.length;
  const pct = Math.round((lusSet.size / total) * 100);

  // Header
  document.getElementById('progress-label').textContent = `${lusSet.size}/${total}`;
  document.getElementById('progress-fill').style.width = `${pct}%`;

  // Contenu
  contentEl.innerHTML = `
    <p class="content-meta">Partie ${partie?.ordre || ''} — Chapitre ${idx + 1}</p>
    <h1 class="content-titre">${chap.titre}</h1>
    <div class="content-body">${chap.contenu || '<p>Contenu à venir.</p>'}</div>
  `;

  if (animate) {
    contentEl.style.opacity = '0';
    requestAnimationFrame(() => {
      contentEl.style.transition = 'opacity 0.25s ease-out';
      contentEl.style.opacity = '1';
    });
  }

  // Boutons nav
  const prevChap = allChapitres[idx - 1];
  const nextChap = allChapitres[idx + 1];
  document.getElementById('btn-prev').disabled = !prevChap;
  document.getElementById('btn-next').disabled = false;
  document.getElementById('btn-next').dataset.nextId = nextChap?.id || '';

  // Bouton marquer lu
  updateMarquerBtn(lusSet.has(chapId));

  // Sidebar actif
  document.querySelectorAll('.sidebar-chap').forEach(el => {
    el.classList.toggle('actif', el.dataset.id === chapId);
  });

  // Ouvrir la partie active dans sidebar
  document.querySelectorAll('.sidebar-partie').forEach(bloc => {
    const hasActive = bloc.querySelector('.sidebar-chap.actif');
    if (hasActive) bloc.classList.add('open');
  });

  lucide.createIcons();

  // Scroll haut
  document.getElementById('chapitre-content').scrollTop = 0;
  window.scrollTo(0, 0);
}

function showContentSkeleton(el) {
  el.innerHTML = `
    <div class="skeleton content-skeleton-meta"></div>
    <div class="skeleton content-skeleton-titre"></div>
    ${Array(8).fill(0).map((_, i) =>
      `<div class="skeleton content-skeleton-line${i % 3 === 2 ? ' short' : ''}"></div>`
    ).join('')}
  `;
}

function updateMarquerBtn(isLu) {
  const btn = document.getElementById('btn-marquer');
  if (isLu) {
    btn.className = 'nav-marquer lu';
    btn.innerHTML = '<i data-lucide="check-circle"></i><span>Lu</span>';
  } else {
    btn.className = 'nav-marquer';
    btn.innerHTML = '<i data-lucide="circle"></i><span>Marquer comme lu</span>';
  }
  lucide.createIcons();
}

async function marquerLu(chapId) {
  if (lusSet.has(chapId)) return;
  const { error } = await sb.from('progression').upsert({
    user_id: userId,
    chapitre_id: chapId,
    lu: true,
    lu_le: new Date().toISOString()
  }, { onConflict: 'user_id,chapitre_id' });
  if (!error) {
    lusSet.add(chapId);
    updateMarquerBtn(true);
    // Update progress header
    const total = allChapitres.length;
    const pct = Math.round((lusSet.size / total) * 100);
    document.getElementById('progress-label').textContent = `${lusSet.size}/${total}`;
    document.getElementById('progress-fill').style.width = `${pct}%`;
    // Update sidebar check
    document.querySelectorAll(`.sidebar-chap[data-id="${chapId}"] .sidebar-chap-check`).forEach(el => {
      el.classList.add('lu');
      el.innerHTML = '<i data-lucide="check"></i>';
    });
    lucide.createIcons();
  }
}

function renderSidebar() {
  const sidebar = document.getElementById('sidebar-inner');
  sidebar.innerHTML = buildSidebarHTML();
  attachSidebarEvents(sidebar);
}

function renderSidebarMobile() {
  const sidebar = document.getElementById('sidebar-mobile-inner');
  sidebar.innerHTML = buildSidebarHTML();
  attachSidebarEvents(sidebar);
}

function buildSidebarHTML() {
  return allParties.map(partie => {
    const chaps = allChapitres.filter(c => c.partie_id === partie.id);
    return `
      <div class="sidebar-partie open">
        <div class="sidebar-partie-header">
          <span class="sidebar-partie-num">${String(partie.ordre).padStart(2,'0')}</span>
          <span class="sidebar-partie-titre">${partie.titre}</span>
          <span class="sidebar-partie-chevron"><i data-lucide="chevron-down"></i></span>
        </div>
        <div class="sidebar-chapitres">
          ${chaps.map(c => `
            <div class="sidebar-chap" data-id="${c.id}">
              <span class="sidebar-chap-check${lusSet.has(c.id) ? ' lu' : ''}">
                ${lusSet.has(c.id) ? '<i data-lucide="check"></i>' : ''}
              </span>
              <span class="sidebar-chap-titre">${c.titre}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function attachSidebarEvents(container) {
  container.querySelectorAll('.sidebar-partie-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.sidebar-partie').classList.toggle('open');
      lucide.createIcons();
    });
  });
  container.querySelectorAll('.sidebar-chap').forEach(el => {
    el.addEventListener('click', () => {
      closeMobileSidebar();
      loadChapitre(el.dataset.id, true);
    });
  });
}

function openMobileSidebar() {
  document.getElementById('sidebar-overlay').classList.add('open');
  document.getElementById('sidebar-mobile').classList.add('open');
}
function closeMobileSidebar() {
  document.getElementById('sidebar-overlay').classList.remove('open');
  document.getElementById('sidebar-mobile').classList.remove('open');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function copyCode(btn) {
  const code = btn.closest('.code-block').querySelector('pre').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.innerHTML = '<i data-lucide="check"></i> Copié';
    lucide.createIcons();
    setTimeout(() => {
      btn.innerHTML = '<i data-lucide="copy"></i> Copier';
      lucide.createIcons();
    }, 2000);
  });
}

// ===== EVENTS =====

document.getElementById('btn-prev').addEventListener('click', () => {
  const idx = allChapitres.findIndex(c => c.id === currentChapId);
  if (idx > 0) loadChapitre(allChapitres[idx - 1].id, true);
});

document.getElementById('btn-next').addEventListener('click', async () => {
  await marquerLu(currentChapId);
  const nextId = document.getElementById('btn-next').dataset.nextId;
  if (nextId) loadChapitre(nextId, true);
});

document.getElementById('btn-marquer').addEventListener('click', () => {
  marquerLu(currentChapId);
});

document.getElementById('btn-sommaire').addEventListener('click', openMobileSidebar);
document.getElementById('sidebar-overlay').addEventListener('click', closeMobileSidebar);
document.getElementById('sidebar-mobile-close').addEventListener('click', closeMobileSidebar);

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const chapId = params.get('id');
  if (chapId) loadChapitre(chapId, false);
});

initLecteur();
