# AUDIT-QA-01 — Audit fonctionnel exhaustif (DEV + PROD)

> **Carte Kanban** : `AUDIT-QA-01` (colonne **Plus tard** tant que la gate mobile n’est pas close).  
> **Focus actuel** : ne **pas** démarrer cette carte tant que **MOB-HUB-01** / file B n’est pas clôturée (sauf correctif bloquant).  
> **Complète** : [`../operations/VALIDATION_A_Z_AGENT.md`](../operations/VALIDATION_A_Z_AGENT.md) (lots agent) + ligne « Audit final A-Z » dans [`TODOS.md`](TODOS.md).

**But** : pour **chaque** surface (web, mobile, backend, frontend), **chaque** rôle (utilisateur lambda, administrateur), **chaque** environnement (DEV local HTTPS, préprod, PROD), vérifier ligne à ligne que :

1. le **bouton / lien / formulaire / tableau** fait l’action attendue ;
2. le **chargement** et l’**accès aux données** restent dans des délais acceptables ;
3. l’**API** et le **frontend** renvoient le résultat métier attendu ;
4. les **erreurs** affichent un message contrôlé (**pas de crash**, pas d’écran blanc, pas de stack brute utilisateur) ;
5. chaque KO a une **solution** notée (fix, contournement, ou ticket).

**Règles d’exécution**

- Une **sous-tâche** = une ligne cochetée ici + preuve (URL, capture, curl, smoke, ticket).
- Environnements : cocher **DEV** puis **PREPROD** puis **PROD** (jamais prod sans GO porteur).
- Rôles : cocher **USER** et **ADMIN** (SUPER_ADMIN si applicable) séparément.
- Délais cibles indicatifs (ajuster si besoin) :
  - page shell visible ≤ **2 s** ressenti (DEV peut être plus lent — noter l’écart) ;
  - liste métier ≤ **3 s** ;
  - action mutation (POST/PUT/DELETE) feedback ≤ **1 s** ou spinner explicite ;
  - mobile cold start → shell ≤ **5 s** appareil réel.
- Erreur attendue : toast / `StatusAlert` / snack Flutter / HTTP 4xx-5xx **avec message** ; jamais unthrow non catché.

**Légende cases** : `[ ]` à faire · `[x]` OK + preuve · `[~]` PARTIEL · `[!]` KO documenté

---

## 0. Prérequis campagne

### 0.1. Gouvernance
- [ ] 0.1.1. Lire `PILOTAGE.md` + focus Kanban avant de démarrer un lot
- [ ] 0.1.2. Ne pas voler le WIP=1 (carte focus) — lot en parallèle seulement si porteur OK
- [ ] 0.1.3. Journal des preuves : dater chaque lot dans `TODOS_A_TESTER.md` § AUDIT-QA-01
- [ ] 0.1.4. Chaque KO → ticket / ligne `ERRORS.md` + solution proposée

### 0.2. Environnements
- [ ] 0.2.1. **DEV** : `https://jobbingtrack.localhost:5443` + API gateway healthy
- [ ] 0.2.2. **PREPROD** : URLs VPS / NPM documentées, secrets hors Git
- [ ] 0.2.3. **PROD** : uniquement après GO — checklist prod séparée

### 0.3. Comptes
- [ ] 0.3.1. Compte **USER** lambda (pas admin)
- [ ] 0.3.2. Compte **ADMIN** / **SUPER_ADMIN**
- [ ] 0.3.3. Pas de secrets dans captures / commits

---

## 1. Matrice transversale (à rejouer par env + rôle)

Pour chaque case : **DEV / PREPROD / PROD** × **USER / ADMIN**.

### 1.1. Chargements & perf
- [ ] 1.1.1. Temps jusqu’au premier contenu utile (FCP ressenti)
- [ ] 1.1.2. Temps jusqu’aux données métier (listes / KPI)
- [ ] 1.1.3. Pas de rechargement **page entière** pour un refresh partiel
- [ ] 1.1.4. Onglet arrière-plan : pas de poll agressif (`visibilityState`)
- [ ] 1.1.5. Erreur réseau → message + retry, pas crash

### 1.2. Navigation & liens
- [ ] 1.2.1. Chaque lien sidebar / menu ouvre la bonne route
- [ ] 1.2.2. Ctrl/Cmd/molette nouvel onglet **sans** refresh parasite de l’onglet source
- [ ] 1.2.3. Breadcrumbs / retour arrière cohérents
- [ ] 1.2.4. 404 / access-denied gérés (pas d’écran blanc)

### 1.3. Boutons & actions
- [ ] 1.3.1. Clic primaire → action attendue (create/update/delete/navigate)
- [ ] 1.3.2. Bouton désactivé si prérequis manquant (pas de double submit)
- [ ] 1.3.3. Confirmation sur actions destructives
- [ ] 1.3.4. Feedback succès / échec visible

### 1.4. Tableaux & listes
- [ ] 1.4.1. Colonnes / cartes affichent les bonnes métadonnées
- [ ] 1.4.2. Tri / filtre / pagination (si présents) persistent au refresh
- [ ] 1.4.3. Liste vide → état empty explicite
- [ ] 1.4.4. Liste erreur API → alerte, pas liste fantôme

### 1.5. API (contrat)
- [ ] 1.5.1. Auth : 401/403 sans token / mauvais rôle
- [ ] 1.5.2. Validation body : 400 avec message
- [ ] 1.5.3. Success : payload aligné UI (champs utilisés réellement)
- [ ] 1.5.4. 5xx : log serveur + message client générique (pas de stack)

### 1.6. Gestion d’erreurs & non-crash
- [ ] 1.6.1. Exception front catchée (ErrorBoundary / snack)
- [ ] 1.6.2. Exception mobile catchée (AppSnack / dialog)
- [ ] 1.6.3. Timeout API → message timeout
- [ ] 1.6.4. Données corrompues → fallback sûr
- [ ] 1.6.5. Solution documentée pour chaque `[!]`

---

## 2. WEB — Frontend utilisateur (hors backoffice)

### 2.1. Auth & session (USER)
- [ ] 2.1.1. Page `/login` charge (DEV/PREPROD/PROD)
- [ ] 2.1.2. Login OK → redirection attendue
- [ ] 2.1.3. Login KO → message FR, pas de fuite compte
- [ ] 2.1.4. Logout → session purgée, retour login
- [ ] 2.1.5. Refresh page → session conservée si keep-alive
- [ ] 2.1.6. Token expiré → re-login propre

### 2.2. Parcours métier USER (web si exposé)
- [ ] 2.2.1. Dashboard / home USER
- [ ] 2.2.2. Entités liées (entreprises, contacts, candidatures…) selon produit web
- [ ] 2.2.3. Formulaires create/edit : validation + persistance
- [ ] 2.2.4. Droits : USER **ne voit pas** Administration

### 2.3. Responsive USER
- [ ] 2.3.1. Mobile viewport
- [ ] 2.3.2. Tablet
- [ ] 2.3.3. Desktop

---

## 3. WEB — Backoffice administrateur

### 3.1. Shell admin
- [ ] 3.1.1. Login ADMIN → `/backoffice`
- [ ] 3.1.2. Menu sections (Dashboard, Sécurité, Emails, Mobile, Dev…)
- [ ] 3.1.3. Drawer collapse / mobile hamburger
- [ ] 3.1.4. Recherche globale (si présente)
- [ ] 3.1.5. Thème clair / sombre lisible
- [ ] 3.1.6. Actualiser données page (refresh ciblé)

### 3.2. Pilotage `/backoffice/pilotage`
- [ ] 3.2.1. Chargement Kanban ≤ cible (voir **PILOTAGE-PERF**)
- [ ] 3.2.2. Onglets Kanban / Liste / Synthèse / Fichiers
- [ ] 3.2.3. Déplacer carte / checklist / note (SUPER_ADMIN)
- [ ] 3.2.4. Inbox retours / erreurs (summary crashes)
- [ ] 3.2.5. Fichiers bruts lecture / écriture selon rôle

### 3.3. Pages métier admin (échantillon obligatoire → étendre)
Pour **chaque** page listée : ouverture, données, 1 action, erreur forcée (couper API), délais.

- [ ] 3.3.1. Vue d’ensemble `/backoffice`
- [ ] 3.3.2. Users
- [ ] 3.3.3. Companies / Contacts / Applications / Followups / Interviews / Calls / Events
- [ ] 3.3.4. Statistics (+ sous-onglets)
- [ ] 3.3.5. Performances (+ sous-pages Réseau, Latence, Conteneurs, Corrélation…)
- [ ] 3.3.6. Sécurité (+ Logs, Menaces, Firewall, Analyse, Réseau)
- [ ] 3.3.7. Emails / Email monitor
- [ ] 3.3.8. Services & logs
- [ ] 3.3.9. Mobile — releases OTA (wizard Build→Promote)
- [ ] 3.3.10. Mobile — émulateur / ADB
- [ ] 3.3.11. Tests / Playwright / API tester
- [ ] 3.3.12. Deployments (métriques) — documenter si lecture seule
- [ ] 3.3.13. Settings / maintenance / data-management

### 3.4. Impersonation / rôles
- [ ] 3.4.1. ADMIN impersonnalise USER → hub USER
- [ ] 3.4.2. Retour admin propre
- [ ] 3.4.3. USER ne peut pas appeler routes ADMIN

---

## 4. MOBILE — App Flutter (`mobile/`)

### 4.1. Socle
- [ ] 4.1.1. Build APK debug/release sans Zip/kernel_blob (**APK-BUILD-01**)
- [ ] 4.1.2. Install appareil réel + versionName = pubspec
- [ ] 4.1.3. Cold start → splash → login ou shell
- [ ] 4.1.4. Offline / erreur réseau → message, pas crash

### 4.2. Auth USER mobile
- [ ] 4.2.1. Login USER
- [ ] 4.2.2. Keep logged in
- [ ] 4.2.3. Logout purge locale
- [ ] 4.2.4. Session expirée

### 4.3. Shell & navigation
- [ ] 4.3.1. Onglets shell (Accueil, Candidatures, …)
- [ ] 4.3.2. Drawer
- [ ] 4.3.3. Retour système (**MOB-NAV-01**)
- [ ] 4.3.4. Double retour Accueil → arrière-plan
- [ ] 4.3.5. Snacks auto-dismiss (**MOB-SNACK-01**)

### 4.4. Listes (métadonnées) — **MOB-LIST-01**
- [ ] 4.4.1. Entreprises
- [ ] 4.4.2. Contacts
- [ ] 4.4.3. Candidatures
- [ ] 4.4.4. Relances
- [ ] 4.4.5. Entretiens
- [ ] 4.4.6. Appels

### 4.5. Hubs détail / liens croisés — **MOB-HUB-01**
- [ ] 4.5.1. Entreprise (apps, contacts, relances, entretiens, appels)
- [ ] 4.5.2. Contact (+ entretiens, FAB lié)
- [ ] 4.5.3. Candidature
- [ ] 4.5.4. Relance (+ appels, entreprise)
- [ ] 4.5.5. Entretien (+ relances, appels)
- [ ] 4.5.6. Appel

### 4.6. FAB & création
- [ ] 4.6.1. FAB Relance (**D.6**)
- [ ] 4.6.2. FAB Appel (**D.7**)
- [ ] 4.6.3. FAB Entretien (**D.8**)
- [ ] 4.6.4. FAB Contact (**D.9**)
- [ ] 4.6.5. Erreurs validation formulaire

### 4.7. Admin mobile (si applicable)
- [ ] 4.7.1. Login ADMIN
- [ ] 4.7.2. Surfaces admin / impersonation
- [ ] 4.7.3. USER drawer sans Administration (**B.3**)

### 4.8. OTA
- [ ] 4.8.1. Canal DEV : détection MAJ
- [ ] 4.8.2. Install OTA
- [ ] 4.8.3. Promote PRODUCTION (admin backoffice)

---

## 5. BACKEND — Services & API

### 5.1. Santé
- [ ] 5.1.1. Gateway `/health`
- [ ] 5.1.2. Services critiques healthy (docker / metrics)
- [ ] 5.1.3. Postgres / Redis joignables

### 5.2. Auth-service
- [ ] 5.2.1. Login / refresh / logout
- [ ] 5.2.2. Rate-limit
- [ ] 5.2.3. Erreurs sans stack client

### 5.3. Services métier (échantillon → étendre à tous)
Pour chaque service : health, CRUD minimal, droits, logs corrélation.

- [ ] 5.3.1. application-service
- [ ] 5.3.2. company / contact
- [ ] 5.3.3. followup / interview / call / event
- [ ] 5.3.4. notification / email
- [ ] 5.3.5. security-service
- [ ] 5.3.6. deployment-service
- [ ] 5.3.7. workflow / profile / …

### 5.4. Gateway / WAF
- [ ] 5.4.1. Requêtes légitimes 200
- [ ] 5.4.2. Injections bloquées 403 + log
- [ ] 5.4.3. CORS / headers corrélation

### 5.5. Jobs / workers / emails
- [ ] 5.5.1. Envoi email (MailHog DEV / SMTP réel PREPROD)
- [ ] 5.5.2. Alertes critiques
- [ ] 5.5.3. Échec SMTP → log + pas de crash process

---

## 6. FRONTEND technique (qualité)

- [ ] 6.1. `npm run type-check` vert
- [ ] 6.2. Lint : pas d’erreur bloquante nouvelle
- [ ] 6.3. Jest ciblés pages critiques
- [ ] 6.4. Playwright smokes backoffice (échantillon)
- [ ] 6.5. Pas de memory leak évident (onglets lourds Statistics/Perf)

---

## 7. DEV vs PROD — écarts à valider

- [ ] 7.1. Variables d’env documentées (pas de secret Git)
- [ ] 7.2. HTTPS / HSTS / cookies secure en PROD
- [ ] 7.3. Logs sans PII excessive
- [ ] 7.4. Feature flags / écriture pilotage désactivée en PROD
- [ ] 7.5. Budgets perf PROD plus stricts que DEV
- [ ] 7.6. Rollback documenté si deploy KO

---

## 8. Livrables de fin

- [ ] 8.1. Tableau synthèse GO / NO-GO (DEV, PREPROD, PROD)
- [ ] 8.2. Liste KO ouverts avec **solution** ou ticket
- [ ] 8.3. Preuves liées dans `TODOS_A_TESTER.md`
- [ ] 8.4. Décision porteur dans `TODOS_A_VALIDER.md`
- [ ] 8.5. Archive partielle dans `TODOS_DONE.md` si lots OK

---

## Ordre de campagne recommandé

1. Matrice §1 sur **DEV × USER** puis **DEV × ADMIN**  
2. Mobile §4 sur appareil réel (gate B)  
3. Backoffice §3 pages critiques  
4. Backend §5 health + auth + 1 CRUD métier  
5. Rejouer **PREPROD**  
6. **PROD** seulement après GO  

Ne pas tout lancer en parallèle : découper en sous-cartes Kanban si besoin (`AUDIT-QA-01a` web, `01b` mobile, `01c` API…) en gardant **une** carte « En cours ».
