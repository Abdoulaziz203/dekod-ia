/* ===========================================
   Animated Claude Code Terminal — Hero
   =========================================== */
(function () {
  const root = document.getElementById('terminal-body');
  if (!root) return;

  // Each step: type = "type" (typed line) or "out" (instant output)
  // class = CSS class to wrap content in
  const script = [
    { t: 'out', html: '<span class="term-comment">$ claude code --new "gestion-clients"</span>' },
    { t: 'wait', ms: 400 },
    { t: 'out', html: '<span class="term-claude">●</span> <span class="term-claude">Claude Code v2.0</span> <span class="term-comment">— prêt</span>' },
    { t: 'wait', ms: 300 },
    { t: 'out', html: '' },
    { t: 'type', prefix: '<span class="term-prompt">›</span> ', text: 'Crée une app de gestion clients avec auth Supabase', cls: 'term-user', ms: 28 },
    { t: 'wait', ms: 350 },
    { t: 'out', html: '' },
    { t: 'out', html: '<span class="term-claude">⏺</span> <span class="term-output">J\'analyse ton besoin…</span>' },
    { t: 'wait', ms: 500 },
    { t: 'out', html: '  <span class="term-green">✓</span> <span class="term-output">Stack choisie : HTML + Supabase</span>' },
    { t: 'wait', ms: 250 },
    { t: 'out', html: '  <span class="term-green">✓</span> <span class="term-output">Tables créées : <span class="term-cyan">profiles</span>, <span class="term-cyan">clients</span></span>' },
    { t: 'wait', ms: 250 },
    { t: 'out', html: '  <span class="term-green">✓</span> <span class="term-output">Auth configurée</span>' },
    { t: 'wait', ms: 250 },
    { t: 'out', html: '  <span class="term-green">✓</span> <span class="term-output">Dashboard généré</span>' },
    { t: 'wait', ms: 250 },
    { t: 'out', html: '  <span class="term-green">✓</span> <span class="term-output">Déployé sur Netlify</span>' },
    { t: 'wait', ms: 400 },
    { t: 'out', html: '' },
    { t: 'out', html: '<span class="term-red">▸</span> <span class="term-yellow">https://gestion-clients.netlify.app</span>' },
    { t: 'wait', ms: 300 },
    { t: 'out', html: '<span class="term-comment"># Ton SaaS est en ligne. Temps : 47 min.</span>' },
  ];

  let idx = 0;

  function appendLine(html) {
    const div = document.createElement('div');
    div.className = 'term-line';
    div.innerHTML = html || '&nbsp;';
    root.appendChild(div);
  }

  function typeInto(prefix, text, cls, speed, done) {
    const div = document.createElement('div');
    div.className = 'term-line';
    div.innerHTML = prefix + '<span class="' + cls + '" data-typing></span><span class="term-cursor"></span>';
    root.appendChild(div);
    const target = div.querySelector('[data-typing]');
    let i = 0;
    function step() {
      if (i >= text.length) {
        const cur = div.querySelector('.term-cursor');
        if (cur) cur.remove();
        done && done();
        return;
      }
      target.textContent += text.charAt(i++);
      setTimeout(step, speed + Math.random() * 25);
    }
    step();
  }

  function next() {
    if (idx >= script.length) {
      // Add final blinking prompt
      const div = document.createElement('div');
      div.className = 'term-line';
      div.style.marginTop = '8px';
      div.innerHTML = '<span class="term-prompt">›</span> <span class="term-cursor"></span>';
      root.appendChild(div);
      return;
    }
    const step = script[idx++];
    if (step.t === 'out') {
      appendLine(step.html);
      setTimeout(next, 80);
    } else if (step.t === 'wait') {
      setTimeout(next, step.ms);
    } else if (step.t === 'type') {
      typeInto(step.prefix, step.text, step.cls, step.ms, next);
    }
  }

  // Start when terminal enters viewport
  const startObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        startObs.disconnect();
        setTimeout(next, 400);
      }
    });
  }, { threshold: 0.3 });
  startObs.observe(root);
})();
