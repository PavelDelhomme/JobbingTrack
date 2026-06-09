# TODOs à valider par le porteur

Dernière mise à jour : 8 juin 2026

## Règle

Ce fichier bloque la suite produit. Tant qu’une ligne **bloquante** est ouverte ici, l’agent ne doit pas avancer vers une nouvelle fonctionnalité.

Règle d’ordre : l’agent et le porteur traitent **la première ligne ouverte uniquement**. Pas de validation suivante, pas de préparation parallèle, pas de “suite” tant que cette ligne n’est pas validée explicitement ou transformée en problème à corriger.

Quand une ligne est validée par le porteur, la déplacer vers `TODOS_DONE.md` avec la date, l’environnement et la preuve.

## Priorités (échelle)

| Niveau | Sens |
|--------|------|
| **P0** | Bloquant produit local : sécurité, rapports, menaces, HTTPS — à valider avant le reste. |
| **P1A** | Sécurité / opérations sensibles : alertes, archives, restauration, tests offensifs contrôlés, actions avant purge. |
| **P1B** | Observabilité métier : Statistics, logs, corrélation, chiffres cohérents. |
| **P1C** | UX backoffice et lisibilité sécurité : thème, popup, graphes, navigation, pages de sécurité non destructives. |
| **P1D** | Gate de fin de journée / avant gros merge : suite complète et lecture rapports. |
| **P2** | Utile mais non bloquant pour la file courte ; peut attendre la fin des P0/P1 ou aller dans `docs/BACKLOG.md` si reporté. |

## Comment valider

Le porteur valide la première ligne ouverte soit en répondant dans le chat avec `OK` ou `KO` + détail, soit en renseignant la colonne `Retour porteur` de cette même ligne. La colonne `Preuve attendue` décrit exactement ce qui doit être vérifié avant de répondre.

L’agent ne coche pas à la place du porteur : après un `OK` explicite, il archive la ligne dans `TODOS_DONE.md` ; après un `KO`, il corrige ou crée la tâche de correction avant toute suite.

## À valider maintenant (ordre strict — une ligne à la fois)

| Priorité | Validation porteur | Environnement | Preuve attendue | Statut | Retour porteur |
|----------|--------------------|---------------|-----------------|--------|----------------|
| P0 | Comparaison de rapports sécurité (CVE) | local | Sur `/b4ck0ff1ce/test-reports`, mode comparaison : sélectionner **2** rapports catégorie **Sécurité** (ex. `security-results-cve-20260521-201336` + un autre CVE), lancer la comparaison → **pas** d’erreur « Rapport non trouvé » ; cartes Critical/High/Medium/Low/Info par rapport ; tableau par surface avec statut et écarts ; notes/payloads bruts non exposés dans la comparaison par défaut ; explication claire des cas `Absent`, `skipped`, `fail/vulnerable`, doublons Docker/dépendances, et priorité exploitable. Les surfaces avec `critical/high` doivent être marquées **à traiter/vulnerable**, jamais `OK`. | [ ] | **KO 21/05** : comparaison trop pauvre / 0 partout. **KO 08/06** : chiffres énormes, libellés trompeurs. **08/06 agent** : tri exploitabilité, filtres docker/node + critical/high, badges Ignoré/Absent, texte d’aide. **08/06 porteur 16h** : `node .` avec `high js-cookie` affiché `ok`. **08/06 agent** : statut dérivé des compteurs + libellés comparaison ; à revalider après merge PR #4 et recreate frontend. |
| P0 | Menaces historiques/lab comprises avant nettoyage | local | Confirmer que `10.0.0.x`, `198.51.100.42`, `172.19.x/172.20.x` sont à classer lab/bruit avant toute purge. Page Menaces : lecture seule, **aucune suppression** sans `OK` explicite. | [ ] | Ne rien supprimer sans validation explicite. |
| P0 | Rapports sécurité — ouverture et téléchargement (régression) | local | Liste catégorie Sécurité, ouverture HTML d’un `summary.md` CVE, téléchargement OK ; rapport applicatif `tests/results/<timestamp>` ouvrable même si seul `security-report.json` existe. | [ ] | Rendu CVE validé 21/05. **08/06 porteur 16h** : `20260608-140148` non trouvé depuis lien direct ; fallback JSON ajouté, à revalider. |
| P0 | CVE applicatives localisées dans JobbingTrack | local/preprod | Sur `/b4ck0ff1ce/tests-security` : rechercher `CVE-2026-49975` (ou autre) → chemins lockfile/rapport CVE/npm audit ; lancer **Scan CVE** puis rechercher à nouveau. Pour chaque `critical/high` visible (ex. `js-cookie` frontend) : package, version, lockfile/service, surface exposée, exploitabilité réelle, correctif ou justification `non applicable`. | [ ] | **08/06 agent** : API `cve-locate` + UI livrées. **08/06 suite** : fiches finding (`cve-findings` + cartes UI) ; valider `js-cookie` / CVE demandée avec version lockfile et correctif proposé. |
| P1A | Archive logs sécurité sans purge | local | Export JSONL gzip + `manifest.json` lisibles ; aucune suppression BDD. | [ ] | |
| P1A | Restauration logs sécurité en staging | local | `security_logs_restore_staging` alimentée ; aucune écriture dans `security_logs`. | [ ] | |
| P1A | Alertes email critiques JobbingTrack | local/preprod | Configurer l’envoi des reports/alertes `critical/high` depuis l’adresse mail JobbingTrack vers les adresses dev et admin du porteur, avec catégories claires (CVE, WAF/intrusion, service down, firewall, backup) ; vérifier Paramètres → Notifications (activation, niveaux, destinataires), réauth mot de passe admin, bouton test, email visible MailHog ou SMTP configuré ; pas d’`AUTH PLAIN` vide ni fuite de secrets ; `EmailLog.status=SENT` si table disponible. | [ ] | Réauth + audit + bouton test implémentés côté origin (07/06) ; remplace/complète l’ancienne ligne alertes email sécurité. Validation porteur à faire après P0. |
| P1A | Tests offensifs contrôlés par conteneur JobbingTrack | lab autorisé | Pour chaque conteneur/service exposé ou sensible : vérifier tentatives de remote host / shell injection / command injection / URL injection / headers spoofing / chemins suspects ; les tests doivent rester bornés, reproductibles, non destructifs et journalisés. | [ ] | À rattacher à B15 ; ne pas lancer sur prod réelle sans autorisation et fenêtre dédiée. |
| P1A | Leurres / désinformation contrôlée VPS-Portainer | preprod/prod design | Définir un système sûr pour éviter d’exposer les vraies infos serveur/conteneurs/réseau à un attaquant : minimisation des erreurs, masquage versions/bannières, réponses génériques, honeypot/leurres éventuels isolés, sans polluer les logs internes ni tromper l’admin. | [ ] | À cadrer comme durcissement prod : défense par réduction d’exposition d’abord, leurres seulement si isolés et audités. |
| P1B | Corrélation performances — KPI logs après login | local | `/b4ck0ff1ce/performances/correlation` : KPI logs / ERROR-WARN ≠ 0 sur un service focal (central logging 15/15). | [ ] | |
| P1B | Statistics — onglet Sécurité cohérent avec `/security` | local | `/b4ck0ff1ce/statistics/security` : chiffres ≠ écran vide trompeur ; pas de doublon contradictoire avec `/b4ck0ff1ce/security`. | [ ] | |
| P1B | Statistics — onglet Logs (`log-stats`) | local | Filtres service/niveau, sources actives/historiques, compteurs cohérents avec `/persistence/stats`. | [ ] | Partiellement validé 20/05 — reconfirmer après recreate. |
| P1B | Statistics — onglet Données applicatives (`app-data`) | local | Totaux, timeline, états vides « Non renseigné », pas de `undefined` brut. | [ ] | |
| P1B | Statistics — graphes disponibilité / erreur (vue d’ensemble) | local | Onglet Vue d’ensemble : courbes chargent, légende source visible, plage 24h↔7j OK. | [ ] | Technique 21/05 OK — validation navigateur porteur. |
| P1C | Mode sombre persistant après refresh | local | Choisir sombre, rafraîchir login/backoffice, le thème reste sombre. | [ ] | |
| P1C | Popup paramètres fermeture | local | Clic extérieur et `Escape` ferment la mini-fenêtre sans perte de clic interne. | [ ] | |
| P1C | Graphes conteneurs multi-séries lisibles | local | Performances → Conteneurs, mode « Tous les conteneurs » : couleurs distinctes et stables CPU/mémoire. | [ ] | |
| P1C | Performances — plages temporelles sans flash vide | local | Synthèse / Réseau / Disque / Conteneurs / Latence : changement 24h→7j→personnalisé sans écran vide ni Network Error. | [ ] | Playwright 21/05 OK — reconfirmer si besoin. |
| P1C | Performances — première navigation depuis hub | local | Clic `/b4ck0ff1ce` → Performances : délai acceptable, graphes présents (dette ~6s notée). | [ ] | |
| P1C | Sécurité — titres FR et navigation | local | Parcours Politiques, Menaces, Firewall, Logs, Analyse, Réseau : titres navigateur FR, sous-nav cohérente. | [ ] | Playwright 8/8 — validation visuelle porteur. |
| P1C | Comparaison rapports tests agrégés (non sécurité) | local | Comparer 2 rapports `tests/results` même catégorie (ex. Tests API) : succès, tableau par test. | [ ] | |
| P1C | Backoffice Développement → Tests — navigation et regroupement rapports | local | Menu gauche : cliquer **Tests** doit ouvrir directement la vue d’ensemble ; le sous-menu Tests doit être regroupé de façon plus lisible, avec un sous-menu **Rapports** contenant **Rapports de tests** et **Rapports de parcours** ; vérifier que Playwright/API/Backend/Frontend/Backoffice/Sécurité/Performance, programmation et parcours restent accessibles sans doublon confus. | [ ] | **09/06 porteur** : menu Tests trop long et pas assez sous-catégorisé ; à traiter après la validation P0 CVE en cours. |
| P2 | Rapports tests — taille et compression | local | `/b4ck0ff1ce/test-reports` affiche la taille de chaque rapport (Ko/Mo) et le volume total filtré ; cadrer ensuite une compression/archivage des anciens rapports sans casser l’ouverture, le téléchargement ni les détails sensibles. | [ ] | Taille affichée ajoutée côté agent ; compression à traiter après P0 CVE. |
| P2 | Mode clair backoffice — lisibilité page par page | local | Si une page est illisible en clair, noter la route exacte (ne bloque plus le lot global). | [ ] | Acceptation provisoire 21/05. |
| P2 | Performances — Disque stockage BDD | local | Page Disque : cartes + Block I/O ; validation données réelles. | [ ] | |
| P2 | Préférences refresh par graphique | local | Vérifier héritage zone globale vs override local (si UI exposée). | [ ] | |
| P2 | Mobile — source officielle | décision | Choisir `mobile/` vs `flutter-mobile-app/` avant archivage doublon. | [ ] | |
| P2 | Agent email / tâches recherche emploi — cadrage produit | local | Après clôture/reclassement des P0/P1 bloquants : relire `docs/features/EMAIL_TRIAGE_AGENT.md`, confirmer le périmètre MVP (worker planifié, tâches internes, OAuth Gmail lecture seule, boîtes configurées hors Git, stockage interne emails utiles, règles déterministes, digest 18h + récap hebdomadaire via le socle SMTP JobbingTrack, interface utilisateur `/` dédiée et backoffice `/b4ck0ff1ce` séparé, Google Tasks/Calendar obligatoires, IA locale en renfort) et le périmètre élargi (base de composants partagée, option future `user-frontend` / `backoffice-frontend`, dashboard mobile, revalidation PIN, autocomplete accessible, boîte de réception agent, préparation/envoi relance-email contrôlé, calendrier agrégé, programmation manuelle d’appels/tâches/rappels/événements même sans email déclencheur, fiches candidature/entreprise enrichies, suivi intérim, import contacts, PDF offre depuis URL, enrichissement entreprise, salons/job dating par ville/région), puis décider si on ouvre une branche `feat/` d’implémentation. | [ ] | **09/06 porteur** : besoin prioritaire noté ; Make.com ne doit pas être le socle ; ne pas démarrer l’implémentation tant que la comparaison CVE P0 reste ouverte. |

## Gate technique fin de journée / avant push majeur

À lancer **en fin de journée**, **avant un push complet sur `dev`** ou **avant une PR importante**. Exception acceptée le 21/05 : ne pas lancer cette campagne pendant la correction P0/P1 pour éviter de perdre du temps ; garder les tests ciblés par changement, puis faire la campagne complète quand la session de corrections est stabilisée.

| Étape | Commande / cible (référence) | Preuve attendue |
|-------|------------------------------|-----------------|
| 1. Stack + BDD | Cible Make documentée **`test-full-quick`** (= `up-full` + `db-push-all` + `seed-auth` + `status`) **ou** équivalent manuel si la stack tourne déjà | `make status` / conteneurs `jobbingtrack-*` healthy ; pas d’erreur `db-push-all` |
| 2. Suite complète | **`bash scripts/run-all-tests-with-reports.sh`** avec `TEST_NOPROMPT=1` et variables hôte (voir bloc ci-dessous) | Sortie script **code 0** ; dossier `tests/results/<horodatage>/` créé |
| 3. Lecture détaillée | Ouvrir `tests/results/<horodatage>/summary.json`, `report.html`, `report.txt` **et** `/b4ck0ff1ce/test-reports` | **0 échec bloquant** ; comprendre chaque ligne en échec avant de pousser |
| 4. Frontend rapide (complément) | Depuis `frontend/` : `npm run type-check` + `npm run lint` | Pas de nouvelle erreur introduite par le lot |

Bloc recommandé (équivalent validé le 13/05 — voir `docs/TODOS.md`) :

```bash
TEST_NOPROMPT=1 \
API_URL=http://127.0.0.1:5002 \
API_GATEWAY_URL=http://127.0.0.1:5002 \
PLAYWRIGHT_BASE_URL=http://localhost:5003 \
PLAYWRIGHT_FRONTEND_MODE=smoke \
PLAYWRIGHT_MOBILE_MODE=smoke \
PERF_LIGHT=1 \
bash scripts/run-all-tests-with-reports.sh
```

**Sans stack Docker** : des centaines d’échecs sont **normaux** (`ECONNREFUSED`, conteneurs absents) — voir `docs/ERRORS.md` et `docs/STATUS.md` § 11/04/2026. Ne pas interpréter comme régression si Postgres/gateway/front ne tournent pas.

**Durée** : ~10–20 min (smoke). Campagne Playwright **full** : variable `PLAYWRIGHT_FRONTEND_MODE=full` (plus long, hors agrégat par défaut).

**Checklist longue** : `docs/tests/TESTS_END.md` (tous les points manuels en fin de projet).

| Priorité | Validation porteur | Environnement | Preuve attendue | Statut | Retour porteur |
|----------|--------------------|---------------|-----------------|--------|----------------|
| P1D | Gate suite complète tests fin de journée / avant push majeur | local | Dernière campagne `run-all-tests-with-reports.sh` **verte** (exit 0) + rapport lu dans `tests/results/<horodatage>/` ; noter date/heure dans retour porteur. | [ ] | Dernière campagne complète : **à relancer en fin de journée**, pas pendant le P0 courant. |

## File technique liée (pas de validation ici)

Les chantiers non encore prêts pour validation porteur restent dans `docs/TODOS.md` (env strictes, pentest, PQC, purge menaces après OK P0, etc.).

## À ne pas valider ici

- Préprod/prod réelle : utiliser `A_VALIDER_AVANT_PRODUCTION.md`.
- Déploiement serveur : utiliser `DEPLOIEMENT_PRODUCTION.md`.
- Validation production réelle : utiliser `VALIDATION_PRODUCTION.md`.
- Tâche technique non livrée : rester dans `docs/TODOS.md`.
