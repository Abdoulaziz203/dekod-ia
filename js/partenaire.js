(async () => {

  // ── Garde : partenaire uniquement ───────────────────────────────────────
  await requireRole('partenaire');

  const session = await getSession();
  const userId  = session.user.id;

  // ── Déconnexion ──────────────────────────────────────────────────────────
  document.getElementById('signout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut();
    window.location.href = 'connexion.html';
  });

  // ── 1. Charger le profil (code promo, prénom) ────────────────────────────
  const { data: profile } = await sb
    .from('profiles')
    .select('prenom, code_promo')
    .eq('id', userId)
    .single();

  const codePromo = profile?.code_promo || '—';
  const prenom    = profile?.prenom     || 'Partenaire';

  // ── 2. Charger les commissions ───────────────────────────────────────────
  const { data: commissions } = await sb
    .from('commissions')
    .select('montant_vente, montant_commission, statut, created_at')
    .eq('partenaire_id', userId)
    .order('created_at', { ascending: false });

  const listComm = commissions || [];

  const totalVentes      = listComm.length;
  const totalCA          = listComm.reduce((s, c) => s + (c.montant_vente || 0), 0);
  const totalCommissions = listComm.reduce((s, c) => s + (c.montant_commission || 0), 0);
  const totalPaye        = listComm
    .filter(c => c.statut === 'payé')
    .reduce((s, c) => s + (c.montant_commission || 0), 0);

  // ── 3. Charger le nombre d'utilisations du code promo ───────────────────
  const { data: codeData } = await sb
    .from('codes_promo')
    .select('usage_count')
    .eq('code', codePromo)
    .single();

  const usageCount = codeData?.usage_count || 0;

  // ── 4. Rendu : code promo card ───────────────────────────────────────────
  const codeCard = document.getElementById('code-card');
  codeCard.classList.remove('skeleton');
  codeCard.innerHTML = `
    <p class="code-label">Ton code promo</p>
    <div class="code-value" id="code-display">${codePromo}</div>
    <button class="btn-copy" id="btn-copy">
      <i data-lucide="copy"></i>
      Copier le code
    </button>
  `;

  document.getElementById('btn-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(codePromo).then(() => {
      toast('Code copié !', 'success');
    });
  });

  // ── 5. Rendu : stats ─────────────────────────────────────────────────────
  const statsGrid = document.getElementById('stats-grid');
  statsGrid.innerHTML = `
    <div class="part-stat">
      <div class="part-stat-label">
        <i data-lucide="shopping-cart"></i> Ventes
      </div>
      <div class="part-stat-value">${totalVentes}</div>
    </div>
    <div class="part-stat">
      <div class="part-stat-label">
        <i data-lucide="tag"></i> Utilisations code
      </div>
      <div class="part-stat-value">${usageCount}</div>
    </div>
    <div class="part-stat">
      <div class="part-stat-label">
        <i data-lucide="trending-up"></i> Commissions totales
      </div>
      <div class="part-stat-value green">${formatMontant(totalCommissions)}</div>
    </div>
    <div class="part-stat">
      <div class="part-stat-label">
        <i data-lucide="check-circle"></i> Déjà versé
      </div>
      <div class="part-stat-value green">${formatMontant(totalPaye)}</div>
    </div>
  `;

  // ── 6. Rendu : lien d'affiliation ────────────────────────────────────────
  const linkCard = document.getElementById('link-card');
  linkCard.classList.remove('skeleton');
  const lienAffil = `${window.location.origin}/inscription.html?ref=${codePromo}`;
  linkCard.innerHTML = `
    <p class="code-label" style="text-align:left;">Ton lien d'affiliation</p>
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <code style="
        font-family:monospace;
        font-size:13px;
        color:var(--color-text-soft);
        background:var(--color-bg);
        padding:8px 12px;
        border-radius:6px;
        border:1px solid var(--color-border);
        flex:1;
        word-break:break-all;
      ">${lienAffil}</code>
      <button class="btn-copy" id="btn-copy-link">
        <i data-lucide="link"></i>
        Copier
      </button>
    </div>
  `;

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    navigator.clipboard.writeText(lienAffil).then(() => {
      toast('Lien copié !', 'success');
    });
  });

  // ── 7. Rendu : tableau des ventes ────────────────────────────────────────
  const ventesWrap = document.getElementById('ventes-wrap');
  ventesWrap.classList.remove('skeleton');

  if (listComm.length === 0) {
    ventesWrap.innerHTML = `
      <div class="ventes-empty">
        <i data-lucide="inbox"></i>
        Aucune vente pour l'instant. Partage ton code !
      </div>
    `;
  } else {
    const rows = listComm.map(c => `
      <tr>
        <td>${formatDate(c.created_at)}</td>
        <td>${formatMontant(c.montant_vente)}</td>
        <td class="green-text">${formatMontant(c.montant_commission)}</td>
        <td>
          <span class="badge-statut ${c.statut === 'payé' ? 'badge-paye' : 'badge-attente'}">
            <i data-lucide="${c.statut === 'payé' ? 'check' : 'clock'}"></i>
            ${c.statut === 'payé' ? 'Versé' : 'En attente'}
          </span>
        </td>
      </tr>
    `).join('');

    ventesWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Montant vente</th>
            <th>Ta commission</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // ── Réinitialiser les icônes Lucide après rendu ──────────────────────────
  lucide.createIcons();

})();

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatMontant(val) {
  if (!val || val === 0) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA';
}
