# PROMPT DE DÉMARRAGE — DÉKOD-IA
> Copie tout ce texte et colle-le dans Claude Code au démarrage de la session.

---

Tu vas construire l'application web DÉKOD-IA.
Toutes les instructions techniques sont dans le fichier CLAUDE.md de ce dossier. Lis-le entièrement avant toute action.
Lis aussi ../PLAN_COMPLET_DEKOD-IA.md pour le contexte UX/UI complet.

---

## RÈGLES DE TRAVAIL — RESPECTE-LES SANS EXCEPTION

**Économie de tokens**
Tu ne parles pas. Tu agis. Zéro explication non demandée.
Quand tu termines une étape → 2 lignes maximum pour dire ce que tu as fait. Rien de plus.
Si tu as une question → une seule ligne. Pas de liste de questions.

**Validation obligatoire**
Tu travailles étape par étape dans l'ordre ci-dessous.
À la fin de chaque étape → tu t'arrêtes complètement.
Tu écris 2 lignes : ce que tu as livré. Tu attends ma validation.
Tu ne commences JAMAIS l'étape suivante sans que j'écrive "OK" ou "continue".

**Supabase**
Mon compte Supabase est déjà connecté via le MCP Supabase.
Tu crées directement le projet et les tables — tu ne me demandes pas mes credentials.
Utilise le MCP Supabase pour toutes les opérations base de données.

**Première action**
Lis CLAUDE.md + ../PLAN_COMPLET_DEKOD-IA.md en entier.
Ensuite écris une seule ligne : "Lu. Prêt à commencer l'étape 1."
Tu n'écris rien d'autre. Tu attends mon GO.

---

## DÉCOUPAGE EN ÉTAPES

### ÉTAPE 1 — Fondations Supabase + fichiers de base
- Créer le projet Supabase via MCP
- Créer toutes les tables : profiles, guides, parties, chapitres, acces, progression, partenaires, codes_promo, commissions
- Créer le trigger Supabase : à l'inscription → INSERT automatique dans profiles
- Créer le trigger Supabase : à l'inscription → INSERT dans acces (type='free_test', actif=true)
- Configurer les RLS policies : chaque user ne voit que ses propres données
- Créer la structure de dossiers du projet
- Créer style.css avec les 7 variables CSS + reset + classes skeleton + animations pageEnter + shimmer
- Créer utils.js avec toast(), requireAuth(), requireRole(), formatDate()
- Créer supabase.js avec l'init client
- Insérer le guide dans la table guides (slug='saas-claude-code', is_paid=false, prix=0, actif=true)

### ÉTAPE 2 — Authentification
- Créer connexion.html + auth.css + auth.js
- Créer inscription.html (même CSS)
- Fonctions dans auth.js : signUp(), signIn(), signOut(), getSession()
- Skeleton loading sur les deux pages pendant vérification session
- Transition pageEnter sur les deux pages
- Redirect automatique : si déjà connecté → dashboard.html
- Phase test : signUp() crée le compte ET insère dans acces via trigger (pas de paiement)

### ÉTAPE 3 — Dashboard lecteur
- Créer dashboard.html + dashboard.css + dashboard.js + acces.js
- acces.js : checkAcces(guide_id) → vérifie ligne active dans table acces
- dashboard.js : charger les parties + chapitres depuis Supabase, calculer progression
- Affichage : bloc progression (barre rouge, pourcentage, bouton Continuer)
- Affichage : accordéon des 5 parties avec statut lu/non-lu par chapitre
- Skeleton loading pendant chargement des données
- Icônes Lucide pour statuts chapitres et navigation
- Transition pageEnter à l'ouverture

### ÉTAPE 4 — Lecteur de chapitre
- Créer lire.html + lecteur.css + lecteur.js
- UNE seule page : contenu chargé via ?id=CHAPITRE_UUID depuis Supabase
- Layout 2 colonnes : sidebar 25% fixe + contenu 75% scrollable
- Sidebar : sommaire avec toutes les parties/chapitres, chapitre actif surligné rouge
- Navigation prev/next via history.pushState() — zéro rechargement de page
- Clic Suivant → marquer chapitre lu=true dans progression → charger chapitre suivant
- Transition fade-out/skeleton/fade-in entre chapitres
- Skeleton loading pendant fetch du contenu chapitre
- Mobile : sidebar masquée, bouton Sommaire ouvre overlay
- Icônes Lucide pour navigation et statuts
- Transition pageEnter à l'ouverture

### ÉTAPE 5 — Insertion du contenu du guide
- Lire les 4 fichiers Word dans ../  (PARTIE 1, 2, 3, 4)
- Extraire le contenu de chaque chapitre
- Convertir en HTML propre avec les classes d'encadrés (.encadre, .encadre-titre)
- Insérer dans Supabase : d'abord les parties (table parties), ensuite les chapitres (table chapitres)
- Respecter l'ordre : ordre des parties et ordre des chapitres dans chaque partie
- Vérifier que les 23 chapitres sont bien insérés avec leurs titres et contenu

### ÉTAPE 6 — Page Admin
- Créer admin.html + admin.css + admin.js
- requireRole('admin') en haut — redirect si pas admin
- 4 cartes stats : inscrits total, payants, progression moyenne, chapitres les plus lus
- Tableau utilisateurs : prénom, email, date inscription, chapitres lus, progression %, statut, bouton révoquer
- Recherche par email
- Section partenaires (visible mais vide pour l'instant)
- Skeleton loading + icônes Lucide + transition pageEnter

### ÉTAPE 7 — Landing page
- Créer index.html
- Sections dans l'ordre : Header fixe → Hero → Problème → Solution → Pour qui → Prix → Footer
- PAS de section partenaires (activée plus tard)
- Bouton CTA → inscription.html
- Bouton "Se connecter" header → connexion.html
- Animations : pageEnter sur hero, fade-in progressif des sections au scroll (Intersection Observer, simple)
- Icônes Lucide pour les points de la section problème et pour qui
- Responsive mobile parfait

### ÉTAPE 8 — Pages partenaires
- Créer partenaire-inscription.html + partenaire-dashboard.html + partenaire.css + partenaire.js
- Inscription : formulaire simple → crée compte avec role='partenaire' + génère code promo unique
- Dashboard : afficher code promo, lien d'affiliation, 4 stats, tableau des ventes/commissions
- requireRole('partenaire') sur dashboard
- Pages non liées depuis l'app pour l'instant (accès direct URL seulement)
- Skeleton loading + icônes Lucide + transition pageEnter

### ÉTAPE 9 — Intégration paiement (architecture seulement)
- Créer paiement.js avec la structure CinetPay (fonctions écrites mais non appelées)
- Ajouter dans inscription.html : le bloc UI paiement commenté (<!-- PHASE PAIEMENT -->)
- Documenter dans paiement.js exactement ce qui doit changer pour activer : 3 lignes de commentaire
- Ne rien activer — juste préparer proprement

### ÉTAPE 10 — Tests + Déploiement Netlify
- Vérifier que toutes les pages s'ouvrent sans erreur console
- Vérifier le flux complet : inscription → dashboard → lire → marquer lu → progression mise à jour
- Vérifier responsive sur mobile (les 8 pages)
- Créer netlify.toml à la racine du projet
- Déployer sur Netlify via MCP ou instructions de déploiement
- Fournir l'URL de production

---

## RAPPELS FINAUX

Design : noir #0D0D0D / surface #1A1A1A / rouge #E8001D / blanc #FFFFFF uniquement.
Icônes : Lucide uniquement. Pas d'emoji. Pas d'icônes décoratives inutiles.
Animations : skeleton sur chaque chargement, pageEnter sur chaque page, fade entre chapitres.
L'app doit sembler construite par un humain attentif — pas générée par une IA.
Chaque détail UX compte : espacement, alignement, lisibilité, cohérence.

Commence maintenant : lis CLAUDE.md + ../PLAN_COMPLET_DEKOD-IA.md puis écris "Lu. Prêt à commencer l'étape 1."
