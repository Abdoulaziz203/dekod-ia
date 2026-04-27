let guideId = null;
let _currentUserId = null;

async function initDashboard() {
  const session = await requireAuth();
  if (!session) return;
  _currentUserId = session.user.id;

  // Charger le guide actif
  const { data: guide } = await sb.from('guides').select('id, titre').eq('actif', true).single();
  if (!guide) return;
  guideId = guide.id;

  const ok = await checkAcces(guideId);
  if (!ok) return;

  // Afficher le prénom + charger avatar
  const { data: profile } = await sb.from('profiles').select('prenom, avatar_url, onboarding_done').eq('id', session.user.id).single();
  // Garde : si l'onboarding n'a pas été complété, y envoyer
  if (!profile?.onboarding_done) { window.location.href = 'onboarding.html'; return; }

  const prenom = profile?.prenom || '';
  document.getElementById('user-prenom').textContent = prenom ? `Bonjour, ${prenom}` : '';
  renderAvatar(profile?.avatar_url, session.user.id);

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
  await initCommentaire(session.user.id, guideId, totalLus, totalChapitres);
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

// ── Avatar profil ─────────────────────────────────────────────────────────────

function renderAvatar(url, userId) {
  const wrap = document.getElementById('dash-avatar');
  if (!wrap) return;

  if (url) {
    wrap.innerHTML = `<img src="${url}" alt="Profil" class="dash-avatar-img">
      <input type="file" id="avatar-input" accept="image/jpeg,image/png,image/webp" style="display:none">`;
  } else {
    wrap.innerHTML = `<div class="dash-avatar-default"><i data-lucide="user"></i></div>
      <input type="file" id="avatar-input" accept="image/jpeg,image/png,image/webp" style="display:none">`;
    lucide.createIcons();
  }

  wrap.addEventListener('click', () => document.getElementById('avatar-input')?.click());
  document.getElementById('avatar-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) uploadAvatar(file, userId);
  });
}

async function uploadAvatar(file, userId) {
  if (file.size > 2 * 1024 * 1024) { toast('Image trop lourde (max 2 Mo).', 'error'); return; }
  toast('Chargement de la photo…', 'info');

  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${userId}/avatar.${ext}`;

  const { error: upErr } = await sb.storage.from('avatars').upload(path, file, {
    upsert: true, contentType: file.type
  });
  if (upErr) { toast("Erreur lors de l'upload.", 'error'); return; }

  const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path);
  const url = publicUrl + '?t=' + Date.now();

  await sb.from('profiles').update({ avatar_url: url }).eq('id', userId);

  // Synchroniser le commentaire existant si déjà soumis
  await sb.from('commentaires').update({ avatar_url: url })
    .eq('user_id', userId).neq('avatar_url', url);

  toast('Photo de profil mise à jour !', 'success');
  renderAvatar(url, userId);
}

// ── Avis lecteur ──────────────────────────────────────────────────────────────

let _dashNote = 0; // note sélectionnée par l'utilisateur

async function initCommentaire(userId, guideId, totalLus, totalChapitres) {
  const section = document.getElementById('commentaire-section');
  if (!section) return;

  // Chapitres pas tous lus → section verrouillée
  if (totalLus < totalChapitres) {
    section.innerHTML = `
      <div class="comment-lock">
        <i data-lucide="lock"></i>
        <div>
          <p class="comment-lock-title">Laisse ton avis</p>
          <p class="comment-lock-sub">Accessible une fois tous les chapitres marqués comme lus
            — ${totalLus} / ${totalChapitres} lus pour l'instant.</p>
        </div>
      </div>`;
    lucide.createIcons();
    return;
  }

  // Vérifier si déjà commenté
  const { data: existing } = await sb.from('commentaires')
    .select('contenu, note, created_at')
    .eq('user_id', userId)
    .eq('guide_id', guideId)
    .maybeSingle();

  if (existing) {
    renderCommentaireDone(section, existing.note, existing.contenu, existing.created_at);
    return;
  }

  // Vérifier si l'utilisateur a un avatar (pour la notice landing page)
  const { data: prof } = await sb.from('profiles').select('avatar_url').eq('id', userId).maybeSingle();
  const hasAvatar = !!prof?.avatar_url;

  // Formulaire
  section.innerHTML = `
    <div class="comment-section">
      <p class="comment-section-title">Laisse ton avis</p>
      <p class="comment-section-sub">Tu as terminé le guide — ton retour nous aide à nous améliorer.</p>
      ${!hasAvatar ? `<div class="comment-avatar-notice">
        <i data-lucide="image"></i>
        <span>Ajoute ta <strong>photo de profil</strong> (en cliquant ton avatar en haut à droite)
        pour que ton avis apparaisse sur la page d'accueil.</span>
      </div>` : ''}
      <div class="comment-form">
        <div class="star-row">
          <span class="star" data-value="1">★</span>
          <span class="star" data-value="2">★</span>
          <span class="star" data-value="3">★</span>
          <span class="star" data-value="4">★</span>
          <span class="star" data-value="5">★</span>
          <span class="star-label" id="star-label">Sélectionne une note</span>
        </div>
        <textarea id="comment-text" class="comment-textarea"
          placeholder="Ton avis sur le guide (min. 20 caractères)…"
          maxlength="500" rows="4"></textarea>
        <div class="comment-footer">
          <span class="comment-char" id="comment-char">0 / 500</span>
          <button class="comment-submit" id="comment-submit"
            onclick="soumettreCommentaire('${userId}', '${guideId}')">
            <i data-lucide="send"></i> Envoyer
          </button>
        </div>
      </div>
    </div>`;

  const starLabels = ['', 'Décevant', 'Passable', 'Bien', 'Très bien', 'Excellent !'];

  function highlightStars(n) {
    document.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.value) <= n);
    });
    const lbl = document.getElementById('star-label');
    if (lbl) lbl.textContent = n > 0 ? starLabels[n] : 'Sélectionne une note';
  }

  _dashNote = 0;
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      _dashNote = parseInt(star.dataset.value);
      highlightStars(_dashNote);
    });
    star.addEventListener('mouseover', () => highlightStars(parseInt(star.dataset.value)));
    star.addEventListener('mouseout', () => highlightStars(_dashNote));
  });

  const textarea = document.getElementById('comment-text');
  const counter  = document.getElementById('comment-char');
  textarea.addEventListener('input', () => {
    counter.textContent = `${textarea.value.length} / 500`;
  });

  lucide.createIcons();
}

function renderCommentaireDone(section, note, contenu, createdAt) {
  const stars = '★'.repeat(note) + '☆'.repeat(5 - note);
  section.innerHTML = `
    <div class="comment-section">
      <p class="comment-section-title">Ton avis</p>
      <div class="comment-done">
        <div class="comment-stars-display">${stars}</div>
        <p class="comment-done-text">"${contenu}"</p>
        <p class="comment-done-date">Soumis le ${formatDate(createdAt)}</p>
      </div>
    </div>`;
}

async function soumettreCommentaire(userId, guideId) {
  const note    = _dashNote;
  const contenu = (document.getElementById('comment-text')?.value || '').trim();
  const btn     = document.getElementById('comment-submit');

  if (!note || note < 1) { toast('Sélectionne une note (1 à 5 étoiles).', 'error'); return; }
  if (contenu.length < 20) { toast('Ton avis doit faire au moins 20 caractères.', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader"></i> Envoi…';
  lucide.createIcons();

  const { data: profile } = await sb.from('profiles')
    .select('prenom, avatar_url')
    .eq('id', userId).single();

  const { error } = await sb.from('commentaires').insert({
    user_id: userId,
    guide_id: guideId,
    prenom: profile?.prenom || '',
    email: (await sb.auth.getSession()).data.session?.user?.email || '',
    avatar_url: profile?.avatar_url || null,
    contenu,
    note
  });

  if (error) {
    toast("Erreur lors de l'envoi. Réessaie.", 'error');
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send"></i> Envoyer';
    lucide.createIcons();
    return;
  }

  toast('Merci pour ton avis !', 'success');
  renderCommentaireDone(document.getElementById('commentaire-section'), note, contenu, new Date().toISOString());
}

initDashboard();
