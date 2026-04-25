# CLAUDE_CONTENU.md — Règles visuelles du guide DÉKOD-IA

## LIS CE FICHIER EN ENTIER avant de toucher à un seul chapitre.
## Puis lis CLAUDE.md pour le contexte technique global.

---

## POURQUOI CE GUIDE EXISTE ET POUR QUI

Ce guide s'appelle "De zéro à ton premier SaaS avec Claude Code".
Il est écrit pour deux personnes :

**Personne 1 — Le débutant complet**
Il vit au Sénégal, en Côte d'Ivoire, au Cameroun, en Guinée.
Il a vu une vidéo TikTok sur le vibe-coding. Il veut se lancer mais il a peur.
Il ne sait pas ce qu'est un backend, une table, une API.
Il a besoin de voir pour comprendre. Un schéma lui explique en 5 secondes ce qu'un paragraphe
n'explique pas en 5 minutes.

**Personne 2 — Le dev junior**
Il sait coder un peu. Il utilise ChatGPT. Il se perd sur le backend et Supabase.
Il cherche une méthode claire, pas juste du code à copier-coller.

**Ce que ça change pour le contenu :**
- Zéro jargon sans explication immédiate
- Chaque concept abstrait = une illustration visuelle
- Les chiffres importants = mis en valeur visuellement, pas noyés dans le texte
- Les processus en étapes = schémas, pas des paragraphes
- Les comparaisons = tableaux visuels, pas des listes

---

## PHILOSOPHIE VISUELLE DU CONTENU

Ce guide doit ressembler à un bon magazine tech africain, pas à un document Word mis en ligne.
Chaque chapitre doit être agréable à lire sur téléphone comme sur ordinateur.
Le fond est sombre (#0D0D0D). Le texte doit respirer. Les visuels doivent être rares mais percutants.
Pas de décoration inutile. Chaque composant visuel a une raison d'être.

---

## ÉTAPE 0 — CE QUE TU FAIS EN PREMIER (une seule fois)

Avant de travailler sur un chapitre, ajoute tous les composants CSS ci-dessous
à la fin du fichier `css/lecteur.css`.
Ne crée pas de nouveau fichier CSS. Ajoute à la suite de l'existant.
Fais-le une seule fois. Les chapitres suivants utilisent les mêmes classes.

---

## COMPOSANTS CSS À AJOUTER DANS lecteur.css

### 1. Paragraphe d'accroche (lead)
```css
.content-lead {
  font-size: 20px;
  line-height: 1.65;
  color: var(--color-white);
  font-weight: 400;
  margin-bottom: 28px;
  border-left: 3px solid var(--color-red);
  padding-left: 18px;
}
```

### 2. Sous-titre de section (h2 dans le contenu)
Déjà dans lecteur.css. Vérifie que h2 dans .content-body a bien :
font-family: 'Barlow Condensed', sans-serif; font-size: 26px; color: var(--color-white);

### 3. Callouts (encadrés)
```css
.callout {
  border-radius: 8px;
  padding: 18px 20px;
  margin: 24px 0;
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.callout-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 2px;
}
.callout-body { flex: 1; }
.callout-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}
.callout-text { font-size: 15px; line-height: 1.65; margin: 0; }

/* Variantes */
.callout-pepite   { background: rgba(232,0,29,0.08); border: 1px solid rgba(232,0,29,0.25); }
.callout-pepite   .callout-label { color: var(--color-red); }
.callout-pepite   .callout-icon  { color: var(--color-red); }

.callout-rappel   { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.25); }
.callout-rappel   .callout-label { color: #60a5fa; }
.callout-rappel   .callout-icon  { color: #60a5fa; }

.callout-attention { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); }
.callout-attention .callout-label { color: #fbbf24; }
.callout-attention .callout-icon  { color: #fbbf24; }

.callout-astuce   { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25); }
.callout-astuce   .callout-label { color: #4ade80; }
.callout-astuce   .callout-icon  { color: #4ade80; }
```

Usage HTML :
```html
<div class="callout callout-pepite">
  <i data-lucide="zap" class="callout-icon"></i>
  <div class="callout-body">
    <p class="callout-label">Pépite</p>
    <p class="callout-text">Texte de la pépite ici.</p>
  </div>
</div>
```
- Pépite → icône `zap` (rouge)
- Rappel → icône `rotate-ccw` (bleu)
- Attention → icône `alert-triangle` (orange)
- Astuce → icône `lightbulb` (vert)

### 4. Bloc statistique
Pour les grands chiffres percutants (ex: "41% du code mondial écrit par l'IA").
```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin: 28px 0;
}
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
}
.stat-number {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 48px;
  font-weight: 700;
  color: var(--color-red);
  line-height: 1;
  margin-bottom: 8px;
}
.stat-label {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.4;
}
```

Usage HTML :
```html
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-number">41%</div>
    <div class="stat-label">du code mondial écrit par l'IA</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">4h</div>
    <div class="stat-label">pour construire un SaaS complet</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">20$</div>
    <div class="stat-label">coût total au lieu de 3 millions FCFA</div>
  </div>
</div>
```

### 5. Schéma de processus (flow horizontal)
Pour les séquences d'étapes (ex: Comprendre → Agir → Vérifier).
```css
.schema-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0;
  margin: 28px 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 24px 16px;
}
.schema-step {
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 20px;
  text-align: center;
  min-width: 120px;
}
.schema-step-num {
  font-size: 11px;
  color: var(--color-red);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}
.schema-step-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-white);
}
.schema-step-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
  line-height: 1.4;
}
.schema-arrow {
  color: var(--color-red);
  font-size: 20px;
  padding: 0 10px;
  font-weight: 700;
}
@media (max-width: 600px) {
  .schema-flow { flex-direction: column; }
  .schema-arrow { transform: rotate(90deg); }
}
```

Usage HTML :
```html
<div class="schema-flow">
  <div class="schema-step">
    <div class="schema-step-num">Phase 1</div>
    <div class="schema-step-label">Comprendre</div>
    <div class="schema-step-desc">Claude analyse le projet</div>
  </div>
  <div class="schema-arrow">→</div>
  <div class="schema-step">
    <div class="schema-step-num">Phase 2</div>
    <div class="schema-step-label">Agir</div>
    <div class="schema-step-desc">Claude crée les fichiers</div>
  </div>
  <div class="schema-arrow">→</div>
  <div class="schema-step">
    <div class="schema-step-num">Phase 3</div>
    <div class="schema-step-label">Vérifier</div>
    <div class="schema-step-desc">Claude teste le résultat</div>
  </div>
</div>
```

### 6. Comparaison avant / après
```css
.comparaison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 28px 0;
}
.comp-col {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
}
.comp-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.comp-label.avant { color: var(--color-text-muted); }
.comp-label.apres { color: #4ade80; }
.comp-col ul { list-style: none; margin: 0; padding: 0; }
.comp-col li {
  font-size: 14px;
  color: var(--color-text-soft);
  padding: 6px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}
.comp-col li:last-child { border-bottom: none; }
.comp-col li svg { flex-shrink: 0; margin-top: 3px; }
@media (max-width: 600px) { .comparaison { grid-template-columns: 1fr; } }
```

Usage HTML :
```html
<div class="comparaison">
  <div class="comp-col">
    <div class="comp-label avant">
      <i data-lucide="x-circle" style="width:14px;height:14px"></i> Avant (2022)
    </div>
    <ul>
      <li><i data-lucide="minus" style="width:14px;height:14px;color:var(--color-text-muted)"></i> 6 mois de développement</li>
      <li><i data-lucide="minus" style="width:14px;height:14px;color:var(--color-text-muted)"></i> 3 millions FCFA minimum</li>
    </ul>
  </div>
  <div class="comp-col">
    <div class="comp-label apres">
      <i data-lucide="check-circle" style="width:14px;height:14px"></i> Maintenant (2026)
    </div>
    <ul>
      <li><i data-lucide="check" style="width:14px;height:14px;color:#4ade80"></i> 4 heures avec Claude Code</li>
      <li><i data-lucide="check" style="width:14px;height:14px;color:#4ade80"></i> 20$ soit ~12 000 FCFA</li>
    </ul>
  </div>
</div>
```

### 7. Liste d'étapes numérotées
```css
.step-list { list-style: none; margin: 24px 0; padding: 0; }
.step-item {
  display: flex;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
}
.step-item:last-child { border-bottom: none; }
.step-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-red);
  line-height: 1;
  min-width: 32px;
}
.step-content { flex: 1; }
.step-titre {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-white);
  margin-bottom: 4px;
}
.step-desc { font-size: 14px; color: var(--color-text-muted); line-height: 1.5; }
```

Usage HTML :
```html
<ul class="step-list">
  <li class="step-item">
    <span class="step-num">1</span>
    <div class="step-content">
      <div class="step-titre">Crée ton dossier projet</div>
      <div class="step-desc">Crée un dossier vide sur ton bureau et appelle-le "mon-saas".</div>
    </div>
  </li>
</ul>
```

### 8. Bloc de code avec bouton copier
```css
.code-block {
  position: relative;
  background: #0A0A0A;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin: 20px 0;
}
.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border);
}
.code-block-lang {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.code-copy-btn {
  font-size: 11px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  transition: color 0.15s, border-color 0.15s;
  cursor: pointer;
  background: none;
}
.code-copy-btn:hover { color: var(--color-white); border-color: var(--color-white); }
.code-copy-btn svg { width: 12px; height: 12px; }
.code-block pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.6;
  font-family: 'Courier New', monospace;
  color: var(--color-text-soft);
  background: none;
  border: none;
}
```

Usage HTML :
```html
<div class="code-block">
  <div class="code-block-header">
    <span class="code-block-lang">Prompt Claude Code</span>
    <button class="code-copy-btn" onclick="copyCode(this)">
      <i data-lucide="copy"></i> Copier
    </button>
  </div>
  <pre>Je veux une page de connexion avec email et mot de passe.</pre>
</div>
```

Ajouter aussi cette fonction dans lecteur.js :
```javascript
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
```

### 9. Image de démonstration
```css
.image-demo {
  margin: 24px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}
.image-demo img {
  width: 100%;
  display: block;
  margin: 0;
  border-radius: 0;
}
.image-demo-caption {
  background: var(--color-surface);
  padding: 10px 16px;
  font-size: 13px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  border-top: 1px solid var(--color-border);
}
.image-demo-caption svg { width: 14px; height: 14px; flex-shrink: 0; }
```

Usage HTML :
```html
<div class="image-demo">
  <img src="../assets/images/ch01-img-01.png" alt="Description de l'image">
  <div class="image-demo-caption">
    <i data-lucide="image"></i> Ce que tu vois quand tu ouvres Claude Code pour la première fois
  </div>
</div>
```

### 10. Citation d'ouverture
Pour les grandes citations qui ouvrent un chapitre.
```css
.citation-bloc {
  margin: 28px 0;
  padding: 24px 28px;
  border-left: 4px solid var(--color-red);
  background: var(--color-surface);
  border-radius: 0 8px 8px 0;
}
.citation-texte {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-white);
  line-height: 1.4;
  font-style: italic;
  margin-bottom: 0;
}
.citation-auteur {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 10px;
}
```

Usage HTML :
```html
<div class="citation-bloc">
  <p class="citation-texte">"Le plus grand secret de 2026, c'est que construire une application n'a plus rien à voir avec le code. C'est une question d'idées."</p>
</div>
```

### 11. Mini cartes icône + texte (exemples SaaS, outils...)
Pour illustrer une liste d'exemples concrets avec une icône et un label.
```css
.mini-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin: 20px 0;
}
.mini-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.mini-card-icon {
  color: var(--color-red);
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}
.mini-card-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-white);
}
.mini-card-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
```

Usage HTML :
```html
<div class="mini-cards">
  <div class="mini-card">
    <i data-lucide="tv-2" class="mini-card-icon"></i>
    <div>
      <div class="mini-card-label">Netflix</div>
      <div class="mini-card-desc">Tu paies chaque mois</div>
    </div>
  </div>
</div>
```

### 12. Concept map — Analogie → Terme technique
Pour les analogies qui expliquent un concept tech (ex: Restaurant → App web).
Chaque ligne montre : élément analogie → équivalent tech + explication courte.
```css
.concept-map { display: flex; flex-direction: column; gap: 10px; margin: 28px 0; }
.concept-item {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px 18px;
}
.concept-analogie {
  display: flex; align-items: center; gap: 10px;
}
.concept-analogie-icon { color: var(--color-text-muted); flex-shrink: 0; width:20px; height:20px; }
.concept-analogie-label { font-size: 14px; color: var(--color-text-muted); }
.concept-map-arrow { color: var(--color-red); font-weight: 700; font-size: 20px; text-align: center; }
.concept-tech { }
.concept-tech-nom { font-size: 15px; font-weight: 700; color: var(--color-white); margin-bottom: 3px; }
.concept-tech-desc { font-size: 13px; color: var(--color-text-muted); line-height: 1.4; }
@media (max-width: 600px) {
  .concept-item { grid-template-columns: 1fr; }
  .concept-map-arrow { transform: rotate(90deg); }
}
```

Usage HTML :
```html
<div class="concept-map">
  <div class="concept-item">
    <div class="concept-analogie">
      <i data-lucide="utensils" class="concept-analogie-icon"></i>
      <span class="concept-analogie-label">La salle du restaurant</span>
    </div>
    <div class="concept-map-arrow">→</div>
    <div class="concept-tech">
      <div class="concept-tech-nom">Frontend</div>
      <div class="concept-tech-desc">Tout ce que tu vois et touches dans l'app</div>
    </div>
  </div>
</div>
```

Icônes restaurant recommandées :
- Salle / décoration → `utensils`
- Cuisine → `chef-hat`
- Garde-manger → `package`
- Serveur (personne) → `user`
- Bâtiment → `building-2`

### 13. Citations de personnes connues
Pour les citations attribuées avec nom + rôle de l'auteur.
```css
.citations-personnes { display: flex; flex-direction: column; gap: 12px; margin: 24px 0; }
.citation-personne {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-border);
  border-radius: 0 8px 8px 0;
  padding: 16px 18px;
}
.citation-personne-texte {
  font-size: 15px; color: var(--color-text-soft);
  font-style: italic; margin-bottom: 10px; line-height: 1.6;
}
.citation-personne-auteur { display: flex; align-items: center; gap: 8px; }
.citation-personne-nom { font-size: 13px; font-weight: 700; color: var(--color-white); }
.citation-personne-role { font-size: 12px; color: var(--color-text-muted); }
```

Usage HTML :
```html
<div class="citations-personnes">
  <div class="citation-personne">
    <p class="citation-personne-texte">"Les idées ne valent rien tant qu'elles ne sont pas exécutées."</p>
    <div class="citation-personne-auteur">
      <span class="citation-personne-nom">Steve Jobs</span>
      <span class="citation-personne-role">— Fondateur d'Apple</span>
    </div>
  </div>
</div>
```

### 14. Exemples MVP (cas réels d'entreprises)
Pour montrer comment de grandes entreprises ont commencé petit.
```css
.exemples-mvp {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px; margin: 24px 0;
}
.exemple-mvp-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px; padding: 18px;
}
.exemple-mvp-nom {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 24px; font-weight: 700;
  color: var(--color-red); margin-bottom: 10px;
}
.exemple-mvp-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; color: var(--color-text-muted); margin-bottom: 4px;
}
.exemple-mvp-desc { font-size: 14px; color: var(--color-white); line-height: 1.5; margin-bottom: 10px; }
.exemple-mvp-resultat {
  font-size: 12px; color: #4ade80;
  font-weight: 600; display: flex; align-items: center; gap: 5px;
}
.exemple-mvp-resultat svg { width: 13px; height: 13px; }
```

Usage HTML :
```html
<div class="exemples-mvp">
  <div class="exemple-mvp-card">
    <div class="exemple-mvp-nom">Uber</div>
    <div class="exemple-mvp-label">Leur MVP</div>
    <div class="exemple-mvp-desc">Un simple échange de SMS. Pas d'app, pas de carte. Tu textes, un chauffeur répond.</div>
    <div class="exemple-mvp-resultat">
      <i data-lucide="trending-up"></i> Aujourd'hui : 120 milliards de dollars
    </div>
  </div>
</div>
```

---

## RÈGLES POUR LES ICÔNES LUCIDE

Bibliothèque : Lucide uniquement. `lucide.createIcons()` est déjà appelé dans lecteur.js.
Taille dans le contenu : width et height définis via l'attribut style ou une classe.
Standard contenu : `style="width:18px;height:18px"`.

Icônes à utiliser selon le contexte :
- Pépite / insight → `zap`
- Rappel → `rotate-ccw`
- Attention / warning → `alert-triangle`
- Astuce → `lightbulb`
- Étape complétée → `check-circle`
- Erreur / mauvaise pratique → `x-circle`
- Avant / ancienne méthode → `minus`
- Après / nouvelle méthode → `check`
- Copier du code → `copy`
- Image / screenshot → `image`
- Lien externe → `external-link`
- Terminal / ligne de commande → `terminal`
- Base de données → `database`
- Sécurité → `shield`
- Argent / paiement → `credit-card`
- Utilisateur → `user`
- Déploiement → `rocket`

---

## MÉTHODE DE TRAVAIL POUR CHAQUE CHAPITRE

Quand tu reçois un prompt de chapitre, tu fais exactement ceci dans l'ordre :

**1. Lis d'abord** le fichier Word source dans `../` pour ce chapitre.

**2. Analyse le contenu** et identifie :
- Les paragraphes d'accroche → `.content-lead`
- Les titres de sections → `<h2>` dans `.content-body`
- Les chiffres/stats importants → `.stats-grid` + `.stat-card`
- Les processus en étapes → `.schema-flow`
- Les comparaisons avant/après → `.comparaison`
- Les listes d'étapes → `.step-list`
- Les encadrés pépite/rappel/attention/astuce → `.callout`
- Les prompts ou commandes à copier → `.code-block`
- Les endroits où une image de démo aiderait → `.image-demo` (avec placeholder si pas d'image encore)

**3. Convertis le contenu** en HTML propre avec les bons composants.
Garde le texte exact du Word — ne reformule pas, ne coupe pas.
Structure-le avec les balises et classes appropriées.

**4. Mets à jour Supabase** :
```sql
UPDATE chapitres
SET contenu = '[HTML COMPLET]'
WHERE titre = '[TITRE EXACT DU CHAPITRE]';
```

**5. Arrête-toi** et dis en 2 lignes ce que tu as fait. Attends la validation.

---

## CE QU'ON NE FAIT PAS

- Pas de tableaux HTML complexes pour du contenu simple — utiliser les composants ci-dessus
- Pas d'animations dans le contenu des chapitres — les animations sont gérées par lecteur.js
- Pas d'images pour les schémas — les schémas sont codés en HTML/CSS
- Pas de couleurs en dehors des variables CSS définies dans style.css
- Pas de polices supplémentaires — Barlow Condensed + Inter uniquement
- Pas de résumé du chapitre, pas d'introduction ajoutée — texte exact du Word

---

*Référence contenu DÉKOD-IA — validé session du 17 avril 2026*
