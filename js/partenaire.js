(async () => {

  await requireRole('partenaire');

  const session = await getSession();
  const userId  = session.user.id;

  document.getElementById('signout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut();
  });

  const main = document.getElementById('part-main');

  // Charger le record partenaire
  const { data: partenaire } = await sb
    .from('partenaires')
    .select('nom, email, statut, code_partenaire')
    .eq('user_id', userId)
    .single();

  if (!partenaire) {
    main.innerHTML = `<div class="status-card waiting"><i data-lucide="loader"></i><h2>Chargement…</h2></div>`;
    lucide.createIcons();
    return;
  }

  // ── En attente ───────────────────────────────────────────────────────────────
  if (partenaire.statut === 'en_attente') {
    main.innerHTML = `
      <div class="status-card waiting">
        <i data-lucide="clock"></i>
        <h2>Demande en cours de validation</h2>
        <p>Notre équipe examine ta candidature.<br>
           Tu seras notifié par email à <strong>${partenaire.email}</strong> dès que ton compte est activé.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // ── Rejeté ───────────────────────────────────────────────────────────────────
  if (partenaire.statut === 'rejeté') {
    main.innerHTML = `
      <div class="status-card rejected">
        <i data-lucide="x-circle"></i>
        <h2>Demande refusée</h2>
        <p>Ta candidature n'a pas été retenue cette fois.<br>
           Contacte-nous si tu penses que c'est une erreur.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // ── Validé → Dashboard complet ───────────────────────────────────────────────
  const code    = partenaire.code_partenaire || '—';
  const lienRef = `https://dekod-ia.netlify.app/?ref=${code}`;

  // Charger visiteurs, filleuls inscrits et acheteurs en parallèle
  const [
    { count: nbVisiteurs },
    { data: filleuls }
  ] = await Promise.all([
    sb.from('visiteurs')
      .select('id', { count: 'exact', head: true })
      .eq('code_partenaire', code),
    sb.from('profiles')
      .select('id, prenom, email, created_at')
      .eq('ref_code', code)
      .order('created_at', { ascending: false })
  ]);

  const liste = filleuls || [];

  // Acheteurs parmi les filleuls
  let acheteurIds = new Set();
  if (liste.length > 0) {
    const ids = liste.map(u => u.id);
    const { data: accesData } = await sb
      .from('acces')
      .select('user_id')
      .in('user_id', ids)
      .eq('actif', true)
      .eq('type', 'paid');
    (accesData || []).forEach(a => acheteurIds.add(a.user_id));
  }

  main.innerHTML = `
    <!-- Lien d'affiliation -->
    <div class="code-card">
      <p class="code-label">Ton lien d'affiliation</p>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:16px;">
        <code style="font-family:monospace;font-size:13px;color:var(--color-text-soft);background:var(--color-bg);padding:10px 14px;border-radius:6px;border:1px solid var(--color-border);word-break:break-all;">${lienRef}</code>
      </div>
      <button class="btn-copy" id="btn-copy-link">
        <i data-lucide="link"></i> Copier le lien
      </button>
    </div>

    <!-- Stats -->
    <div class="part-stats">
      <div class="part-stat">
        <div class="part-stat-label"><i data-lucide="mouse-pointer-click"></i> Visiteurs</div>
        <div class="part-stat-value">${nbVisiteurs || 0}</div>
      </div>
      <div class="part-stat">
        <div class="part-stat-label"><i data-lucide="user-plus"></i> Inscrits</div>
        <div class="part-stat-value">${liste.length}</div>
      </div>
      <div class="part-stat">
        <div class="part-stat-label"><i data-lucide="key"></i> Acheteurs</div>
        <div class="part-stat-value green">${acheteurIds.size}</div>
      </div>
      <div class="part-stat">
        <div class="part-stat-label"><i data-lucide="tag"></i> Ton code</div>
        <div class="part-stat-value" style="font-size:16px;color:var(--color-red);">${code}</div>
      </div>
    </div>

    <!-- Liste des filleuls -->
    <div class="ventes-wrap">
      ${liste.length === 0
        ? `<div class="ventes-empty">
             <i data-lucide="inbox"></i>
             Aucun inscrit via ton lien pour l'instant. Partage-le !
           </div>`
        : `<table>
             <thead>
               <tr>
                 <th>Nom</th>
                 <th>Email</th>
                 <th>Date inscription</th>
                 <th>Statut</th>
               </tr>
             </thead>
             <tbody>
               ${liste.map(u => `
                 <tr>
                   <td class="name">${u.prenom || '—'}</td>
                   <td class="muted">${u.email || '—'}</td>
                   <td class="muted">${formatDate(u.created_at)}</td>
                   <td>${acheteurIds.has(u.id)
                     ? '<span class="badge-statut badge-paye"><i data-lucide="key"></i> Acheteur</span>'
                     : '<span class="badge-statut badge-attente"><i data-lucide="clock"></i> Inscrit</span>'
                   }</td>
                 </tr>
               `).join('')}
             </tbody>
           </table>`
      }
    </div>
  `;

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    navigator.clipboard.writeText(lienRef).then(() => toast('Lien copié !', 'success'));
  });

  lucide.createIcons();

})();
