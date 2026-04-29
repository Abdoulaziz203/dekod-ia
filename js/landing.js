/* ===========================================
   DÉKOD-IA — Landing page interactions
   =========================================== */

// Scroll reveal
(function () {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay || (i * 60), 10);
        setTimeout(() => entry.target.classList.add('visible'), delay);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();

// Accordion toggle
function toggleAccordion(el) {
  el.classList.toggle('open');
}

// Contenu statique réel du guide (titres exacts depuis la base)
function renderStaticParties(container) {
  const parties = [
    {
      num: '01', titre: 'Les Fondations',
      desc: 'Les bases pour comprendre comment une app web fonctionne et comment planifier ton projet.',
      chapitres: [
        { num: '01', titre: 'Pourquoi Ce Guide Existe' },
        { num: '02', titre: 'Comment une Application Web Fonctionne' },
        { num: '03', titre: "La Gestion de Projet : de l'Idée au Produit" },
        { num: '04', titre: "Les Outils Gratuits du Créateur d'Apps" },
      ]
    },
    {
      num: '02', titre: 'Maîtriser Claude Code',
      desc: "Comprendre et maîtriser l'outil en profondeur — modèles, tokens, prompting, commandes.",
      chapitres: [
        { num: '05', titre: "Claude Code : c'est quoi exactement" },
        { num: '06', titre: 'Les 3 cerveaux : Haiku, Sonnet, Opus' },
        { num: '07', titre: "Les tokens : LE secret que personne n'explique" },
        { num: '08', titre: 'Installer Claude Code pas à pas' },
        { num: '09', titre: "L'art de parler à Claude : le prompting" },
        { num: '10', titre: 'Maîtriser le Desktop : prendre le contrôle' },
      ]
    },
    {
      num: '03', titre: 'Construire le Projet Guidé',
      desc: 'On construit ensemble une vraie application de gestion commerciale.',
      chapitres: [
        { num: '11', titre: 'Le cahier des charges du projet guidé' },
        { num: '12', titre: 'Travailler avec Claude pas à pas' },
        { num: '13', titre: 'Tester et valider ton application' },
      ]
    },
    {
      num: '04', titre: 'Lancer et Gagner',
      desc: 'Déployer en ligne, trouver des clients, monétiser ton app.',
      chapitres: [
        { num: '14', titre: 'Mettre ton app en ligne' },
        { num: '15', titre: 'Trouver tes premiers clients' },
        { num: '16', titre: 'Comprendre les modèles business' },
      ]
    },
    {
      num: '05', titre: 'Bonus',
      desc: "Prompts prêts à l'emploi, erreurs fatales à éviter, et ton plan d'action 14 jours.",
      chapitres: [
        { num: '17', titre: 'Bonus : 30 Prompts, 10 Erreurs Fatales & Plan 14 Jours' },
      ]
    },
  ];

  container.innerHTML = parties.map((p, i) => {
    const chapHTML = p.chapitres.map(ch => `
      <div class="chapitre-item">
        <span class="chapitre-num">Ch.${ch.num}</span>
        <span class="chapitre-titre">${ch.titre}</span>
      </div>`).join('');
    return `
      <div class="partie-accordion ${i === 0 ? 'open' : ''}" onclick="toggleAccordion(this)">
        <div class="partie-header">
          <span class="partie-num-lp">${p.num}</span>
          <div class="partie-titles">
            <h3>${p.titre}</h3>
            <p>${p.desc}</p>
          </div>
          <div class="partie-header-right">
            <span class="partie-ch-count">${p.chapitres.length} chapitre${p.chapitres.length > 1 ? 's' : ''}</span>
            <svg class="partie-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div class="partie-chapitres">${chapHTML}</div>
      </div>`;
  }).join('');
}

// Loader (Supabase if available, else static)
(async function loadGuideStructure() {
  const container = document.getElementById('guide-accordion');
  if (!container) return;

  try {
    const sb = window.supabaseClient;
    if (!sb) { renderStaticParties(container); return; }

    const { data: parties, error } = await sb
      .from('parties')
      .select('id, titre, description, ordre, chapitres(id, titre, ordre)')
      .order('ordre', { ascending: true });

    if (error || !parties || parties.length === 0) {
      renderStaticParties(container);
      return;
    }
    parties.forEach(p => {
      if (p.chapitres) p.chapitres.sort((a, b) => a.ordre - b.ordre);
    });
    container.innerHTML = parties.map((partie, index) => {
      const chapCount = partie.chapitres ? partie.chapitres.length : 0;
      const chapHTML = partie.chapitres ? partie.chapitres.map(ch => `
        <div class="chapitre-item">
          <span class="chapitre-num">Ch.${String(ch.ordre).padStart(2,'0')}</span>
          <span class="chapitre-titre">${ch.titre}</span>
        </div>`).join('') : '';
      const isOpen = index === 0 ? 'open' : '';
      const ordreStr = String(partie.ordre).padStart(2,'0');
      return `
        <div class="partie-accordion ${isOpen}" onclick="toggleAccordion(this)">
          <div class="partie-header">
            <span class="partie-num-lp">${ordreStr}</span>
            <div class="partie-titles">
              <h3>${partie.titre}</h3>
              <p>${partie.description || ''}</p>
            </div>
            <div class="partie-header-right">
              <span class="partie-ch-count">${chapCount} chapitre${chapCount > 1 ? 's' : ''}</span>
              <svg class="partie-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div class="partie-chapitres">${chapHTML}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    renderStaticParties(container);
  }
})();

// Tracking partner ref — saves to localStorage + enregistre la visite via Supabase Edge Function
(function () {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (!ref) return;
  const code = ref.trim().toUpperCase();
  try { localStorage.setItem('dekod_ref', code); } catch (e) {}

  let vid = null;
  try { vid = localStorage.getItem('dekod_vid'); } catch (e) {}
  if (!vid) {
    vid = 'v' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { localStorage.setItem('dekod_vid', vid); } catch (e) {}
  }

  // Enregistrer la visite via Supabase Edge Function
  const sb = window.supabaseClient;
  if (sb) {
    sb.functions.invoke('enregistrer-visite', {
      body: { code, visitorId: vid }
    }).catch(() => {});
  }
})();

// Header shadow on scroll
(function () {
  const h = document.querySelector('.lp-header');
  if (!h) return;
  function onScroll() {
    if (window.scrollY > 8) h.classList.add('scrolled');
    else h.classList.remove('scrolled');
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

// Compteur places fondateurs — seul élément dynamique lié à l'admin
(async function () {
  const valueEl = document.getElementById('prix-counter-value');
  const totalEl = document.getElementById('prix-counter-total');
  const fillEl  = document.getElementById('prix-counter-fill');
  if (!valueEl || !fillEl) return;

  let total     = 0;
  let remaining = 0;

  try {
    const sb = window.supabaseClient;
    if (sb) {
      const [{ count: tot }, { count: rem }] = await Promise.all([
        sb.from('cles').select('id', { count: 'exact', head: true }).eq('is_fondateur', true),
        sb.from('cles').select('id', { count: 'exact', head: true }).eq('is_fondateur', true).eq('statut', 'unused')
      ]);
      total     = tot || 0;
      remaining = rem || 0;
    }
  } catch (e) {}

  if (totalEl) totalEl.textContent = total;
  const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;

  function animateNumber(from, to, duration, el) {
    const start = performance.now();
    function step(now) {
      const t     = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counterEl = document.querySelector('.prix-counter');
  if (counterEl && 'IntersectionObserver' in window) {
    const o = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateNumber(total, remaining, 1400, valueEl);
          requestAnimationFrame(() => { fillEl.style.width = pct + '%'; });
          o.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    o.observe(counterEl);
  } else {
    valueEl.textContent = remaining;
    fillEl.style.width = pct + '%';
  }
})();
