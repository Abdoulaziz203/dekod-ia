(async () => {

  await requireRole('partenaire');

  const session = await getSession();
  const userId  = session.user.id;

  document.getElementById('signout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut();
  });

  const main = document.getElementById('part-main');

  // Charger le record partenaire + config en parallèle
  const [
    { data: partenaire },
    { data: configRow }
  ] = await Promise.all([
    sb.from('partenaires').select('id, nom, email, statut, code_partenaire').eq('user_id', userId).single(),
    sb.from('config').select('prix_actuel, est_gratuit').limit(1).single()
  ]);

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

  const prixActuel  = configRow?.prix_actuel || 0;
  const estGratuit  = configRow?.est_gratuit ?? true;
  const gainParVente = Math.round(prixActuel * 0.35);

  // Charger visiteurs, filleuls inscrits, commissions en parallèle
  const [
    { count: nbVisiteurs },
    { data: filleuls },
    { data: commissions }
  ] = await Promise.all([
    sb.from('visiteurs').select('id', { count: 'exact', head: true }).eq('code_partenaire', code),
    sb.from('profiles').select('id, prenom, email, created_at').eq('ref_code', code).order('created_at', { ascending: false }),
    sb.from('commissions')
      .select('id, montant_vente, montant_commission, statut, created_at, paye_le, acces:acces_id(user_id, profiles:user_id(prenom, email))')
      .eq('partenaire_id', partenaire.id)
  ]);

  const liste     = filleuls || [];
  const commList  = commissions || [];

  const acheteurIds = new Set(commList.map(c => c.acces?.user_id).filter(Boolean));

  const totalGains  = commList.reduce((s, c) => s + (c.montant_commission || 0), 0);
  const totalPaye   = commList.filter(c => c.statut === 'payé').reduce((s, c) => s + (c.montant_commission || 0), 0);
  const enAttente   = totalGains - totalPaye;

  main.innerHTML = `
    <!-- Prix & Gains -->
    <div class="code-card" style="margin-bottom:20px;">
      <p class="code-label">Prix & Gains</p>
      <div class="part-stats" style="margin-bottom:${estGratuit ? '12px' : '0'};">
        <div class="part-stat">
          <div class="part-stat-label"><i data-lucide="tag"></i> Prix actuel</div>
          <div class="part-stat-value">${prixActuel > 0 ? prixActuel + ' FCFA' : 'Gratuit'}</div>
        </div>
        <div class="part-stat">
          <div class="part-stat-label"><i data-lucide="percent"></i> Ta commission (35%)</div>
          <div class="part-stat-value green">${gainParVente > 0 ? gainParVente + ' FCFA' : '—'}</div>
        </div>
        <div class="part-stat">
          <div class="part-stat-label"><i data-lucide="wallet"></i> Total gagné</div>
          <div class="part-stat-value green">${totalGains} FCFA</div>
        </div>
        <div class="part-stat">
          <div class="part-stat-label"><i data-lucide="clock"></i> En attente paiement</div>
          <div class="part-stat-value">${enAttente} FCFA</div>
        </div>
      </div>
      ${estGratuit ? `
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(232,0,29,0.08);border-radius:6px;border:1px solid rgba(232,0,29,0.2);">
          <i data-lucide="alert-triangle" style="color:var(--color-red);flex-shrink:0;"></i>
          <span style="font-size:13px;color:var(--color-red);">Lien d'affiliation temporairement désactivé — le guide est actuellement gratuit.</span>
        </div>
      ` : ''}
    </div>

    <!-- Lien d'affiliation -->
    <div class="code-card">
      <p class="code-label">Ton lien d'affiliation</p>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:16px;">
        <code style="font-family:monospace;font-size:13px;color:var(--color-text-soft);background:var(--color-bg);padding:10px 14px;border-radius:6px;border:1px solid var(--color-border);word-break:break-all;">${lienRef}</code>
      </div>
      <button class="btn-copy" id="btn-copy-link" ${estGratuit ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>
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

    <!-- Mes clients (acheteurs avec commissions) -->
    <div class="ventes-wrap">
      <p class="code-label" style="margin-bottom:14px;">Mes clients</p>
      ${commList.length === 0
        ? `<div class="ventes-empty">
             <i data-lucide="inbox"></i>
             Aucun acheteur via ton lien pour l'instant.
           </div>`
        : `<table>
             <thead>
               <tr>
                 <th>Nom</th>
                 <th>Email</th>
                 <th>Prix payé</th>
                 <th>Commission (35%)</th>
                 <th>Statut paiement</th>
                 <th>Date</th>
               </tr>
             </thead>
             <tbody>
               ${commList.map(c => {
                 const user = c.acces?.profiles || {};
                 return `<tr>
                   <td class="name">${user.prenom || '—'}</td>
                   <td class="muted">${user.email || '—'}</td>
                   <td class="muted">${c.montant_vente} FCFA</td>
                   <td class="muted" style="color:#22c55e;">${c.montant_commission} FCFA</td>
                   <td>${c.statut === 'payé'
                     ? '<span class="badge-statut badge-paye"><i data-lucide="check-circle"></i> Payé</span>'
                     : '<span class="badge-statut badge-attente"><i data-lucide="clock"></i> En attente</span>'}
                   </td>
                   <td class="muted">${formatDate(c.created_at)}</td>
                 </tr>`;
               }).join('')}
             </tbody>
           </table>`
      }
    </div>

    <!-- Liste des filleuls inscrits -->
    <div class="ventes-wrap">
      <p class="code-label" style="margin-bottom:14px;">Tous les inscrits via ton lien</p>
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

  if (!estGratuit) {
    document.getElementById('btn-copy-link').addEventListener('click', () => {
      navigator.clipboard.writeText(lienRef).then(() => toast('Lien copié !', 'success'));
    });
  }

  lucide.createIcons();

})();
