let guideId = null;

async function initDashboard() {
  const session = await requireAuth();
  if (!session) return;

  // Charger le guide actif
  const { data: guide } = await sb.from('guides').select('id, titre').eq('actif', true).single();
  if (!guide) return;
  guideId = guide.id;

  const ok = await checkAcces(guideId);
  if (!ok) return;

  // Afficher le prénom
  const { data: profile } = await sb.from('profiles').select('prenom').eq('id', session.user.id).single();
  const prenom = profile?.prenom || '';
  document.getElementById('user-prenom').textContent = prenom ? `Bonjour, ${prenom}` : '';

  // Charger parties + chapitres
  const { data: parties } = await sb.from('parties')
    .select('id, titre, ordre')
    .eq('guide_id', guideId)
    .order('ordre');

  const { data: chapitres } = await sb.from('chapitres')
    .select('id, partie_id, titre, ordre')
    .order('ordre');

  // Charger progression
  const { data: progressionRows } = await sb.from('progression')
    .select('chapitre_id')
    .eq('user_id', session.user.id)
    .eq('lu', true);

  const lusSet = new Set((progressionRows || []).map(r => r.chapitre_id));
  const totalChapitres = chapitres?.length || 0;
  const totalLus = lusSet.size;
  const pct = totalChapitres > 0 ? Math.round((totalLus / totalChapitres) * 100) : 0;

  // Trouver le prochain chapitre (premier non lu dans l'ordre)
  let nextChap = null;
  if (parties && chapitres) {
    const ordered = [...chapitres].sort((a, b) => {
      const pa = parties.find(p => p.id === a.partie_id)?.ordre ?? 0;
      const pb = parties.find(p => p.id === b.partie_id)?.ordre ?? 0;
      return pa !== pb ? pa - pb : a.ordre - b.ordre;
    });
    nextChap = ordered.find(c => !lusSet.has(c.id));
    if (!nextChap) nextChap = ordered[ordered.length - 1];
  }

  renderProgress(totalLus, totalChapitres, pct, nextChap);
  renderParties(parties || [], chapitres || [], lusSet);
}

function renderProgress(lus, total, pct, nextChap) {
  const card = document.getElementById('progress-card');
  card.classList.remove('skeleton');
  card.innerHTML = `
    <div class="progress-top">
      <div class="progress-label">
        <h2>Ta progression</h2>
        <p class="progress-count">${lus} chapitre${lus > 1 ? 's' : ''} lu${lus > 1 ? 's' : ''} sur ${total}</p>
      </div>
      <div class="progress-pct">${pct}%</div>
    </div>
    <div class="progress-bar-track">
      <div class="progress-bar-fill" style="width: ${pct}%"></div>
    </div>
    ${nextChap ? `<a href="lire.html?id=${nextChap.id}" class="progress-continue">
      Continuer — ${nextChap.titre}
      <i data-lucide="arrow-right"></i>
    </a>` : ''}
  `;
  lucide.createIcons();
}

function renderParties(parties, chapitres, lusSet) {
  const container = document.getElementById('parties-container');
  container.innerHTML = '';

  // Trouver la partie avec le dernier chapitre lu (pour l'ouvrir par défaut)
  let openPartieId = parties[0]?.id;
  const lusArr = chapitres.filter(c => lusSet.has(c.id));
  if (lusArr.length > 0) {
    const lastLu = lusArr[lusArr.length - 1];
    openPartieId = lastLu.partie_id;
  }

  parties.forEach(partie => {
    const chapsDeLaPartie = chapitres
      .filter(c => c.partie_id === partie.id)
      .sort((a, b) => a.ordre - b.ordre);

    const lusCount = chapsDeLaPartie.filter(c => lusSet.has(c.id)).length;
    const isOpen = partie.id === openPartieId;

    const block = document.createElement('div');
    block.className = `partie-block${isOpen ? ' open' : ''}`;

    block.innerHTML = `
      <div class="partie-header">
        <span class="partie-num">${String(partie.ordre).padStart(2, '0')}</span>
        <div class="partie-info">
          <div class="partie-titre">${partie.titre}</div>
          <div class="partie-count">${lusCount}/${chapsDeLaPartie.length} chapitres lus</div>
        </div>
        <span class="partie-chevron"><i data-lucide="chevron-down"></i></span>
      </div>
      <div class="partie-chapitres">
        ${chapsDeLaPartie.map(c => `
          <a href="lire.html?id=${c.id}" class="chapitre-item">
            <span class="chapitre-check${lusSet.has(c.id) ? ' lu' : ''}">
              ${lusSet.has(c.id) ? '<i data-lucide="check"></i>' : ''}
            </span>
            <span class="chapitre-titre">${c.titre}</span>
            <i data-lucide="chevron-right" style="width:14px;height:14px;color:var(--color-text-muted)"></i>
          </a>
        `).join('')}
      </div>
    `;

    block.querySelector('.partie-header').addEventListener('click', () => {
      block.classList.toggle('open');
    });

    container.appendChild(block);
  });

  lucide.createIcons();
}

initDashboard();
