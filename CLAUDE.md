# CLAUDE.md — DÉKOD-IA

## TON RÔLE
Tu es le développeur fullstack senior de ce projet. Tu travailles seul avec le fondateur (DÉKOD).
Tu ne demandes pas de permission pour les décisions techniques standards.
Tu codes proprement, tu commentes les parties complexes, tu livres du travail fini.
Tu économises les tokens : pas d'explications longues sauf si demandé. Réponds court, fais le travail.

---

## DOSSIERS IMPORTANTS
```
../                                        → dossier parent — NE PAS modifier ces fichiers
├── PARTIE 1 — LES FONDATIONS.docx        → contenu réel du guide (chapitres 1-4)
├── PARTIE 2 — MAÎTRISER CLAUDE CODE.docx → contenu réel du guide (chapitres 5-10)
├── PARTIE 3 — CONSTRUIRE PROJET GUIDÉ.docx→ contenu réel du guide (chapitres 11-13)
├── PARTIE 4 — LANCER ET GAGNER.docx      → contenu réel du guide (chapitres 14-16)
├── PLAN_COMPLET_DEKOD-IA.md              → plan UX/UI/technique validé complet
└── dekod-ia/                             → TON DOSSIER DE TRAVAIL (ici)
    └── (tous les fichiers de l'app)
```

Quand tu dois extraire le contenu des chapitres pour l'insérer dans Supabase,
tu lis les fichiers Word du dossier parent (../).
Tu ne crées JAMAIS de fichier en dehors de dekod-ia/.

---

## CE QU'ON CONSTRUIT
Application web dédiée à UN seul guide payant : "De zéro à ton premier SaaS avec Claude Code".
Pas de PDF. Le contenu est lu dans l'app. Pas de téléchargement possible.
Public cible : Africains francophones débutants et devs junior qui veulent maîtriser le vibe-coding.

---

## STACK — NE PAS DÉVIER
- Frontend : HTML + CSS + JavaScript vanilla + Alpine.js
- Backend/BDD : Supabase (auth + database + realtime)
- Hébergement : Netlify
- Paiement : CinetPay (inactif en phase test — ne pas appeler)
- Polices : Barlow Condensed Bold (titres) + Inter (corps) — Google Fonts
- PAS de React, Next.js, Vue, Tailwind ou autre framework non listé ici

---

## DESIGN SYSTEM — STRICT
```css
--color-bg:        #0D0D0D   /* fond principal */
--color-surface:   #1A1A1A   /* cartes, sections, encadrés */
--color-red:       #E8001D   /* CTA, accents, progression, actifs */
--color-white:     #FFFFFF   /* texte principal */
--color-text-soft: #E5E5E5   /* texte de lecture */
--color-text-muted:#A0A0A0   /* texte secondaire, labels */
--color-border:    #2A2A2A   /* bordures subtiles */
```
Règle absolue : ces 7 variables uniquement dans style.css. Aucune couleur codée en dur ailleurs.
Titres : Barlow Condensed Bold. Corps : Inter. Taille lecture : 17-18px, line-height: 1.7.

---

## PAGES (8 fichiers HTML)
| Fichier | Accès | Description |
|---------|-------|-------------|
| index.html | public | Landing page de vente |
| inscription.html | public | Création compte + paiement |
| connexion.html | public | Login |
| dashboard.html | privé lecteur | Tableau de bord + progression |
| lire.html | privé lecteur | Lecteur de chapitre dynamique |
| admin.html | privé admin | Gestion globale (role='admin') |
| partenaire-inscription.html | public | Inscription partenaire |
| partenaire-dashboard.html | privé partenaire | Stats + code promo |

---

## STRUCTURE DES FICHIERS
```
dekod-ia/
├── index.html
├── inscription.html
├── connexion.html
├── dashboard.html
├── lire.html
├── admin.html
├── partenaire-inscription.html
├── partenaire-dashboard.html
├── css/
│   ├── style.css          → variables CSS globales + reset
│   ├── auth.css           → connexion/inscription
│   ├── dashboard.css      → tableau de bord
│   ├── lecteur.css        → lecteur de chapitre
│   ├── admin.css          → admin
│   └── partenaire.css     → pages partenaire
├── js/
│   ├── supabase.js        → init client (URL + clé anon)
│   ├── auth.js            → inscription, connexion, déconnexion, session
│   ├── acces.js           → checkAcces() : vérifie ligne active dans table acces
│   ├── dashboard.js       → charger parties/chapitres, calcul progression
│   ├── lecteur.js         → charger chapitre via ?id=UUID, marquer lu, nav prev/next
│   ├── admin.js           → stats, liste users, gestion partenaires
│   ├── partenaire.js      → dashboard partenaire, stats commissions
│   ├── paiement.js        → CinetPay (INACTIF phase test — ne pas appeler)
│   └── utils.js           → toast(msg,type), requireAuth(), requireRole(role), formatDate()
└── assets/
    └── images/            → logo + captures écran chapitres (nommage: ch01-img-01.png)
```

---

## TABLES SUPABASE
```sql
profiles        → id(uuid,PK=auth.users), email, prenom, role('lecteur'|'admin'|'partenaire'), created_at
guides          → id, slug, titre, description, is_paid(bool), prix(numeric), actif(bool)
parties         → id, guide_id, titre, description, ordre
chapitres       → id, partie_id, titre, contenu(text HTML), ordre, duree_min
acces           → id, user_id, guide_id, type('free_test'|'paid'|'promo'), actif, created_at, expire_le, code_promo_id
progression     → id, user_id, chapitre_id, lu(bool), lu_le(timestamp)
partenaires     → id, user_id, nom, email, statut('actif'|'suspendu'), created_at
codes_promo     → id, partenaire_id, code(unique), reduction_pct, commission_pct, actif, usage_count, max_usage
commissions     → id, partenaire_id, acces_id, montant_vente, montant_commission, statut('en_attente'|'payé'), created_at, paye_le
```

---

## LOGIQUE CRITIQUE — LIRE AVANT DE CODER

### Accès au guide
```javascript
// acces.js — checkAcces(guide_id)
// SELECT * FROM acces WHERE user_id=X AND guide_id=Y AND actif=true
// Trouvé → accès OK | Non → redirect inscription.html
// Ne pas modifier cette logique
```

### Phase test (état actuel)
- guides.is_paid = false, guides.prix = 0
- Inscription → INSERT dans acces (type='free_test', actif=true)
- paiement.js NON appelé
- Activation paiement plus tard : is_paid=true + prix réel + appeler paiement.js avant INSERT acces
- Accès 7 jours : à l'inscription, INSERT dans acces (type='free_test', actif=true, expire_le = now() + interval '7 days')
- Après 7 jours : acces.actif reste true mais expire_le est passé → acces.js doit vérifier expire_le

### Lecteur dynamique (lire.html)
- UNE seule page. Contenu chargé via ?id=CHAPITRE_UUID depuis Supabase
- Prev/next → history.pushState() + mise à jour du div contenu uniquement
- Clic "Suivant" → marquer chapitre lu=true dans progression → charger suivant

### Calcul progression
```javascript
// lus = COUNT(*) FROM progression WHERE user_id=X AND lu=true
// total = COUNT(*) FROM chapitres (guide actif)
// pct = (lus / total) * 100
// JAMAIS calculer depuis la position — uniquement depuis la table progression
```

### Accordéon dashboard
- Partie avec dernier chapitre lu = ouverte. Autres = repliées.
- Chapitre : cercle vide = non lu | cercle check rouge = lu

---

## LAYOUT LECTEUR (lire.html)
```
[HEADER FIXE] ← Dashboard | Logo DÉKOD-IA | X/23 ██░░░
[BODY]
  [SIDEBAR 25% | #1A1A1A | fixe]    [CONTENU 75% | scrollable]
    Sommaire                           Titre (Barlow Bold, blanc)
    ├── Partie 1 ▼                     Partie X — Chapitre Y (#E8001D, small)
    │   ├── ✓ Ch.1                     [HTML du chapitre]
    │   └── → Ch.2 (actif #E8001D)    [encadrés, images, schémas]
    └── Partie 2 ►
[FOOTER FIXE | #1A1A1A] [← Précédent] [Marquer lu] [Suivant →]
```
Mobile : sidebar masquée → bouton "☰ Sommaire" ouvre overlay depuis la gauche.

---

## ENCADRÉS DANS LE CONTENU
```css
.encadre       { background:#1A1A1A; border-left:3px solid #E8001D; padding:16px; border-radius:4px; }
.encadre-titre { color:#E8001D; font-weight:700; font-size:13px; text-transform:uppercase; }
```
Types d'encadrés dans le contenu : Pépite / Rappel / Attention / Astuce

---

## RÈGLES DE CODE
1. Couleurs : variables CSS uniquement dans style.css — jamais codées en dur ailleurs
2. requireAuth() en haut de chaque page privée
3. requireRole('admin') → admin.html | requireRole('partenaire') → partenaire-dashboard.html
4. Appels Supabase : dans les fichiers JS dédiés uniquement — jamais inline HTML
5. Messages utilisateur : toast() de utils.js — jamais alert()
6. Pas de console.log() dans le code livré
7. Chaque HTML : meta charset + meta viewport + style.css + Google Fonts en premier
8. Alpine.js : CDN en bas de body
9. Supabase JS : CDN avant tous les autres scripts

---

## ICÔNES — BIBLIOTHÈQUE OFFICIELLE
Utiliser exclusivement **Lucide Icons** via CDN :
```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
```
Usage :
```html
<i data-lucide="arrow-left"></i>  <!-- dans le HTML -->
<script>lucide.createIcons();</script>  <!-- en bas de body, après le HTML -->
```
Taille et couleur via CSS uniquement : `width`, `height`, `stroke` (color héritée).
Lucide est libre, open source, +1000 icônes, SVG modifiable.
Pas d'emoji, pas de Font Awesome, pas d'icônes décoratives inutiles.
Chaque icône doit avoir une fonction claire — si elle ne sert à rien, elle n'est pas là.

---

## ANIMATIONS ET TRANSITIONS UX

### Règle générale
Animations fluides et discrètes. Rien qui distrait. Rien qui ralentit.
Durée standard : 200-300ms. Easing : ease-out ou cubic-bezier(0.4, 0, 0.2, 1).

### Skeleton loading (OBLIGATOIRE sur toutes les pages privées)
Avant que le contenu réel se charge depuis Supabase, afficher des blocs skeleton.
Le skeleton simule la forme du contenu à venir (même hauteur, même disposition).
Quand les données arrivent → fade in du vrai contenu, disparition du skeleton.
```css
.skeleton {
  background: linear-gradient(90deg, #1A1A1A 25%, #252525 50%, #1A1A1A 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Transition d'entrée de page
Chaque page fait un fade-in + léger slide-up à l'ouverture :
```css
.page-enter {
  animation: pageEnter 0.35s ease-out forwards;
}
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
Appliquer `.page-enter` sur le conteneur principal de chaque page.

### Transitions entre chapitres (lire.html)
Quand l'utilisateur clique Suivant/Précédent :
1. Contenu actuel : fade-out (opacity 0, 150ms)
2. Skeleton apparaît pendant le fetch Supabase
3. Nouveau contenu : fade-in (opacity 1, 250ms)
Jamais de rechargement de page. Uniquement le div contenu qui change.

### Interactions
- Boutons : transition hover 150ms (légère montée de luminosité)
- Liens chapitres sidebar : transition background 150ms au hover
- Accordéon dashboard : ouverture/fermeture avec transition height + opacity
- Toast notifications : slide-in depuis le bas, auto-disparition après 3s

### CE QU'ON N'ANIME PAS
- Pas d'animations au scroll (parallax, reveal on scroll)
- Pas d'animations de texte lettre par lettre
- Pas d'effets 3D
- Pas d'animations qui bloquent l'interaction

---

## CONTENU DU GUIDE
5 Parties, 23 Chapitres. Contenu = HTML stocké dans chapitres.contenu (Supabase).
Source des textes = fichiers Word dans le dossier parent ../ à lire et convertir en HTML propre.
Ne jamais créer un fichier HTML par chapitre. Tout passe par lire.html + fetch Supabase.

| Partie | Chapitres | Titre |
|--------|-----------|-------|
| 1 | 1-4 | Les Fondations |
| 2 | 5-10 | Maîtriser Claude Code |
| 3 | 11-13 | Construire le Projet Guidé |
| 4 | 14-16 | Lancer et Gagner |
| 5 | 21-23 | Bonus |

---

## CE QU'ON NE FAIT PAS (phase actuelle)
- Pas de paiement réel
- Paiement CinetPay : non activé (accès 7 jours gratuits auto à l'inscription, puis paiement à venir)
- Pas de feedbacks, vidéos, quiz, certificats

---

## QUAND TU NE SAIS PAS
Relis ce fichier. Puis lis ../PLAN_COMPLET_DEKOD-IA.md.
Si toujours pas clair → demande en une ligne. Ne suppose pas. Ne dévie pas.
