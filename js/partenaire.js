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
  const code       = partenaire.code_partenaire || '—';
  const isServé    = window.location.protocol.startsWith('http');
  const lienRef    = isServé ? `${window.location.origin}/?ref=${code}` : null;

  const prixActuel   = configRow?.prix_actuel || 0;
  // Lien partenaire désactivé UNIQUEMENT si aucun prix n'est défini (< 600 FCFA).
  // Avec le nouveau système, les clés payantes ont leur propre prix sur la clé
  // donc tant qu'un prix de référence existe en config, le programme est actif.
  const estGratuit   = !prixActuel || prixActuel < 600;
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

  const liste    = filleuls || [];
  const commList = commissions || [];

  // Acheteurs détectés via commissions
  const acheteurIdsFromComm = new Set(commList.map(c => c.acces?.user_id).filter(Boolean));

  // Fallback : acheteurs via acces.type='paid' (couvre les cas où la commission
  // n'a pas été créée — ex. activation pendant mode test prix=0)
  let acheteurIds = acheteurIdsFromComm;
  if (liste.length > 0) {
    const filleulIds = liste.map(u => u.id);
    const { data: paidAcces } = await sb
      .from('acces')
      .select('user_id')
      .eq('type', 'paid')
      .in('user_id', filleulIds);
    acheteurIds = new Set([
      ...acheteurIdsFromComm,
      ...(paidAcces || []).map(r => r.user_id)
    ]);
  }

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
      ${estGratuit ? `
        <p style="color:var(--color-text-muted);font-size:13px;margin-bottom:12px;">Le lien est désactivé tant que le guide est gratuit.</p>
      ` : lienRef ? `
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:16px;">
          <code style="font-family:monospace;font-size:13px;color:var(--color-text-soft);background:var(--color-bg);padding:10px 14px;border-radius:6px;border:1px solid var(--color-border);word-break:break-all;">${lienRef}</code>
        </div>
        <button class="btn-copy" id="btn-copy-link">
          <i data-lucide="link"></i> Copier le lien
        </button>
      ` : `
        <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(255,255,255,0.04);border:1px solid var(--color-border);border-radius:8px;margin-bottom:12px;">
          <i data-lucide="info" style="color:var(--color-text-muted);flex-shrink:0;width:16px;height:16px;"></i>
          <span style="font-size:13px;color:var(--color-text-muted);">Lien disponible une fois le site hébergé. Ton code : <strong style="color:var(--color-red);font-family:monospace;">${code}</strong></span>
        </div>
      `}
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
      <div class="ventes-header">
        <p class="code-label">Mes clients <span style="font-size:11px;font-weight:400;opacity:0.6;">(acheteurs)</span></p>
      </div>
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
                 <th>Statut</th>
                 <th>Date</th>
               </tr>
             </thead>
             <tbody>
               ${buildToggleRows(commList, c => {
                 const user = c.acces?.profiles || {};
                 return `<tr>
                   <td class="name" data-label="Nom">${user.prenom || '—'}</td>
                   <td class="muted" data-label="Email" style="word-break:break-all;">${user.email || '—'}</td>
                   <td class="muted" data-label="Prix payé">${c.montant_vente.toLocaleString('fr-FR')} FCFA</td>
                   <td class="muted" data-label="Commission" style="color:#22c55e;">${c.montant_commission.toLocaleString('fr-FR')} FCFA</td>
                   <td data-label="Statut">${c.statut === 'payé'
                     ? '<span class="badge-statut badge-paye"><i data-lucide="check-circle"></i> Payé</span>'
                     : '<span class="badge-statut badge-attente"><i data-lucide="clock"></i> En attente</span>'}
                   </td>
                   <td class="muted" data-label="Date">${formatDate(c.created_at)}</td>
                 </tr>`;
               }, 6)}
             </tbody>
           </table>`
      }
    </div>

    <!-- Liste des filleuls inscrits -->
    <div class="ventes-wrap">
      <div class="ventes-header">
        <p class="code-label">Tous mes inscrits <span style="font-size:11px;font-weight:400;opacity:0.6;">(via ton lien)</span></p>
      </div>
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
                 <th>Inscription</th>
                 <th>Statut</th>
               </tr>
             </thead>
             <tbody>
               ${buildToggleRows(liste, u => `
                 <tr>
                   <td class="name" data-label="Nom">${u.prenom || '—'}</td>
                   <td class="muted" data-label="Email" style="word-break:break-all;">${u.email || '—'}</td>
                   <td class="muted" data-label="Inscription">${formatDate(u.created_at)}</td>
                   <td data-label="Statut">${acheteurIds.has(u.id)
                     ? '<span class="badge-statut badge-paye"><i data-lucide="key"></i> Acheteur</span>'
                     : '<span class="badge-statut badge-attente"><i data-lucide="clock"></i> Inscrit</span>'
                   }</td>
                 </tr>
               `, 4)}
             </tbody>
           </table>`
      }
    </div>
  `;

  if (!estGratuit && lienRef) {
    const copyBtn = document.getElementById('btn-copy-link');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(lienRef).then(() => toast('Lien copié !', 'success'));
    });
  }

  lucide.createIcons();

})();
