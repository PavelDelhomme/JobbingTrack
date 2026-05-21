# A valider / verifier avant production

Date de creation : 13 mai 2026

## Role du fichier

Ce fichier est le registre de validation porteur.

Les cases `[x]` dans `TODOS.md` veulent dire "fait dans le depot" ou "procedure disponible". Elles ne veulent pas dire "valide produit". Quand le porteur valide un element ici, reporter ensuite la validation dans `PLAN.md` ou `STATUS.md` avec la date.

## Mode d'emploi

Pour chaque ligne :

- cocher seulement apres verification reelle ;
- noter l'environnement (`local`, `preprod`, `prod`) ;
- noter le commit ou la branche ;
- ecrire les problemes constates dans la colonne "Retour porteur" ;
- transformer les problemes en nouvelles taches `TODOS.md`.

## Identite, acces et admin

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| Connexion admin avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env` | Login OK puis acces `/b4ck0ff1ce` | local | [x] | |
| Aucun identifiant de test affiche sur `/login` | Page visible sans `password123` ni compte de test | local/preprod | [x] | |
| Changement de mot de passe admin documente | Procedure claire, secret masque dans les logs | local | [ ] | ne sais pas |
| Actions sensibles admin avec reauth | Changement email alerte, purge, export, WAF/firewall | preprod | [ ] | |

## Securite applicative

> **Validation automatisee locale** : 19/05/2026 — branche `fix/dev-https-api-centralization` @ `47d7e8a9` (+ correctifs non commites incidents / notification-settings). Apres `make restart`, **`docker compose restart security-service api-gateway`** etait necessaire pour charger les routes `notification-settings` et `lab/sample-threat`.

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| WAF bloque payload externe dangereux | Payload XSS/SQLi borne bloque par gateway/proxy | local | [x] | `curl` GET `/api/v1/health?q=<script>…` et `?x=1' OR 1=1--` → **HTTP 403** `code:WAF_BLOCKED` (api `https://api.jobbingtrack.localhost:5443`, 19/05/2026). |
| WAF ne bypass pas un navigateur via `X-Forwarded-*` | Trafic proxy externe inspecte sauf secret interne valide | local | [x] | Meme origine avec `X-Forwarded-For` + `X-Forwarded-Proto` : payloads dangereux **403** ; requete legitime `blocked-ips?all=true` + JWT → **200** (pas de faux positif `consolidated=true`). |
| Rate-limit / intrusion ne bannit pas durablement les IP privees en dev | IP Docker/proxy debloquee apres tests | local | [x] | **30** appels authentifies `/api/v1/security/waf/config` → tous **200** ; re-login **200**. `INTRUSION_RELAX_HEURISTICS=true`, `NODE_ENV=development`. **21/05** : `BRUTE_FORCE` Docker `172.19.0.x` couvert par test `network-threat-detector` ; en mode relax aucune menace/alerte/log sécurité n’est créé pour le bridge Docker. |
| Pas de rafale `INTRUSION ÉLEVÉE` / `DOS_ATTACKS` sur navigation backoffice authentifiee | Logs gateway calmes sur `/backoffice`, `/api/v1/security/*`, `/api/v1/preferences` avec JWT ; `INTRUSION_RELAX_HEURISTICS=true` en dev coupe toute détection intrusion | local HTTPS | [x] | Rafale `preferences` + `security/*` (JWT) : **0** ligne `INTRUSION`/`DOS_ATTACK` dans `docker logs api-gateway --since 1m` (19/05). Relax actif en conteneur. |
| Alertes email menaces configurables en UI | Parametres → Notifications → bloc « Alertes email securite » ; enregistrement via API `notification-settings` | local | [x] | API `GET /api/v1/security/notification-settings` → **200** (`recipients: dev@delhomme.com`, `levels: critical,high`). UI : `/settings` onglet Notifications. Reauth avant save : **a faire** (preprod). |
| Page Incidents exploitable | Menaces → fiche menace ; alertes → detail alerte ; evenements → log surligne ou menace liee ; bouton « Menace lab » en dev | local | [x] | `POST …/firewall/lab/sample-threat` → **201** (`198.51.100.42`) ; fiche menace **200** (`country: Romania`, forensics). Parcours UI a confirmer au clic (table Incidents). |
| Connexion HTTPS `5443` avec `ADMIN_PASSWORD` du `.env` | Login 200, acces `/backoffice` sans 401 en boucle | local | [x] | `POST …/auth/login` → **200** ; token JWT `eyJ…` (len 249) ; `/login` page **200** (19/05). |
| Tokens mock runtime retires ou controles par env exacte | Pas de prefixe hardcode type `mock-jwt-token*` en runtime | local | [x] | Aucun `mock-jwt-token` dans `api-gateway/src` ni `auth-service/src` ; login renvoie JWT signe. Tests Jest conservent le prefixe en fixtures uniquement. |
| Logs securite exploitables | IP, route, method, status, requestId, payload redige si besoin | local | [x] | Echantillon `api_access` : `sourceIP`, `endpoint`, `method`, `level`, `timestamp` OK. `network_threat_detected` : IP + metadata `threatId` mais **endpoint/method null** (tache suite : journaliser a la source). Preprod : re-verifier volume 30j. |
| Export archive logs securite (sans purge) | `node scripts/security/security-logs-archive-export.cjs` produit gzip + manifest sous `data/archives/security-logs/` ; dry-run rétention toujours disponible | local | [ ] | **21/05** : test `--class=noise --limit=50` → 50 lignes exportées, manifest SHA-256 ; aucune suppression BDD. Valider lot complet + restauration avant purge. |
| Restauration archive logs securite (staging) | `node scripts/security/security-logs-archive-restore.cjs --class=noise --load-staging` vérifie manifest/SHA-256 et remplit `security_logs_restore_staging` sans écrire dans `security_logs` | local | [ ] | **21/05** : archive test `noise` → 50 lignes vérifiées, 50 déjà présentes dans `security_logs`, 50 chargées en staging. À valider avant toute purge réelle. |
| Menaces historiques/lab triées avant purge | Inventaire dry-run `network_threats` distinguant lab/test, IP privées Docker, vraies menaces externes, statut bloqué/non bloqué | local/preprod | [ ] | Constat porteur 21/05 : page Menaces encore chargée en historiques `10.0.0.x`, `198.51.100.42`, `172.19.x`/`172.20.x`. Ne pas supprimer sans rapport et validation. |

## Rapports securite

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| Rapports `reports/security/**/summary.md` generes | Rapport horodate avec outil, commit, environnement | local/preprod | [ ] | |
| Rapports `tests/results/security/**/summary.md` generes | Rapport CVE lisible | local/preprod | [ ] | |
| Backoffice liste les rapports securite | Categorie `Securite` visible dans `/backoffice/test-reports` apres generation d'au moins un rapport | local/preprod | [ ] | |
| Lecture rapport securite | Bouton `Voir` ouvre le contenu de `summary.md`, `summary.json` ou `report.html` sans erreur 404/500 | local/preprod | [ ] | |
| Telechargement rapport securite | Fichier telechargeable depuis `/api/test-reports/download` et lisible hors backoffice | local/preprod | [ ] | |
| Artefacts P0 recuperes ou regeneres | Dossiers dates `reports/security/*` et `tests/results/security/*` presents avec `summary.md`/`summary.json` | local/preprod/GitHub | [ ] | |
| Findings `critical/high` tries | Faux positifs justifies, vrais risques convertis en taches | preprod | [ ] | |

## UX backoffice et accessibilite visuelle

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| Mode clair backoffice lisible | Pages clés (`/b4ck0ff1ce`, Statistics, Analytics, Services, Security, formulaires) lisibles en clair : contraste texte/fond, cartes, tableaux, badges, tooltips | local | [x] | Validation porteur provisoire 21/05 : accepté pour l’instant après renforcement surfaces/cartes/champs/couleurs. Les cas résiduels précis seront rouverts page par page. |
| Mode sombre persistant après refresh | Choisir le mode sombre, rafraîchir `/login` puis `/b4ck0ff1ce` : page et bouton restent en sombre | local | [ ] | Correctif technique 20/05 : synchronisation `theme` + préférences UI v1 + legacy. À valider navigateur après rebuild frontend. |
| Popup paramètres fermeture | Ouvrir la mini-fenêtre JobbingTrack Paramètres, cliquer hors fenêtre ou appuyer `Escape` : fermeture sans perte de clic interne | local | [ ] | Correctif technique 20/05 ; à valider navigateur. |

## Monitoring et performance

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| `monitoring-agent-rs` actif par defaut | Compose lance Rust, pas C, pour la collecte bas niveau | local/preprod | [ ] | |
| `log-collector-rs` actif par defaut | Logs Docker lus et `log_collector_logs` alimentee | local/preprod | [ ] | |
| Central logging vers `aggregated_logs` | Smoke runtime `scripts/ops/smoke-central-logging-runtime.cjs` OK 15/15 + lignes par `serviceName` | local | [x] | Validé techniquement 20/05 : `aggregated_logs` reçoit une ligne smoke par service centralisé. Reste validation UI porteur sur corrélation/log-stats. |
| Statistics log-stats persistance | `/api/v1/persistence/stats` affiche des compteurs non nuls pour logs/métriques réellement alimentés | local | [x] | Validé techniquement 20/05 : `containerLogs`, `containerMetrics`, `logCollectorLogs`, `aggregatedLogs`, disponibilité, sécurité, `system_events` et `service_network_history` remontent. Reste validation visuelle porteur après login. |
| Statistics graphes erreur / disponibilité | Onglet Sécurité ou Vue d’ensemble : courbes non vides sur 7j ; légende source `system_metrics` ; taux d’erreur dérivé acceptable si `error_rate` absent en BDD | local | [x] | **21/05** : graphes sur vue d’ensemble + sécurité, légende `MetricsSeriesCaption`, plage partagée Performances ; Playwright `statistics-smoke` OK. Validation porteur optionnelle. |
| Performances — changement de période sans flash vide | `/b4ck0ff1ce/performances` : 24 h → 7 j → 3 j → Aujourd’hui → plage personnalisée → période actuelle garde les graphes visibles et remplace les données sans écran `Chargement…` intermédiaire | local | [x] | Validé automatiquement 21/05 avec token issu du login API `.env` : 22 graphes présents avant/pendant/après chaque transition, `loading=0`, aucune erreur console. |
| Performance conteneurs sans overlay Network Error | `/b4ck0ff1ce/performances/containers` ne déclenche pas d’overlay Next `AxiosError Network Error` si metrics direct est indisponible | local | [x] | Playwright 21/05 (`performances-range-smoke.spec.ts`) : page charge, graphes présents, 24 h ↔ 7 j, aucun Network Error. |
| Graphes conteneurs multi-séries lisibles | `/b4ck0ff1ce/performances/containers` → “Tous les conteneurs” : chaque conteneur a une couleur distincte et stable entre CPU et mémoire | local | [ ] | Socle `seriesColors` 20/05 : palette étendue + fallback HSL unique ; à valider navigateur avec beaucoup de conteneurs. |
| Performance disque alignée et Block I/O exploitable | `/b4ck0ff1ce/performances/disk` : design cohérent avec Performances, période sélectionnable, courbes usage/volume, Block I/O lecture/écriture et débit Mo/min visibles si données présentes | local | [x] | Playwright 21/05 : graphes visibles, changement de plage sans overlay réseau. Détail Block I/O / données réelles : validation porteur optionnelle. |
| Performance disque — stockage BDD détaillé | Vue Disque affiche taille PostgreSQL totale, détail par table/index/TOAST, regroupement logs/métriques/métier, tendances et recommandations rétention/compression sans action destructive automatique | local/preprod | [ ] | Chantier approfondi à implémenter : endpoint DB size + UI + stratégie archivage/compression validée porteur. |
| Performance corrélation sans overlay Network Error | `/b4ck0ff1ce/performances/correlation` charge les services sans overlay Next sur `getContainerStats` ; stats live optionnelles en repli | local | [ ] | Correctif 20/05 : proxy metrics + warnings discrets + `settleMetricCall` ; à valider avec plusieurs services chargés. |
| Alertes email sécurité envoyées | Déclencher une alerte `critical/high` : Email Monitor/MailHog affiche `SENT`, sans `Missing credentials for "PLAIN"` ; notification-service reçoit SMTP_* et `SECURITY_INTERNAL_SECRET` | local/preprod | [ ] | Correctif 20/05 : auth SMTP conditionnelle + propagation `SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE` à notification-service. Rebuild/restart requis. |
| Compression emails/logs/métriques/rapports sans perte | Plan validé : payloads anciens et rapports de tests compressés/archivés, metadata et index consultables, restauration possible, aucune purge non validée | local/preprod | [ ] | Chantier à implémenter après diagnostic taille par table/dossier (`tests/results`, `tests/user-journey-reports`, `reports/security`, traces/captures Playwright) et validation porteur. |
| Nettoyage données métier de test | Rapport `dry-run` listant uniquement les données jetables (utilisateurs de test, candidatures, relances, appels, événements, contacts/entreprises fixtures) ; sauvegarde faite ; purge exécutée seulement après validation explicite | local/preprod | [ ] | Ne pas supprimer comptes/admins, données seed indispensables, ni données utiles aux scénarios E2E. Étendre le nettoyage au-delà de contacts/companies. |
| Statistics app-data détaillée | `/b4ck0ff1ce/statistics/app-data` affiche totaux, nouveaux sur période, statuts, appels/relances/événements et états vides par source | local | [ ] | Implémenté techniquement 20/05 ; à vérifier après login avec données réelles. |
| Détail menace — enrichissement IP externe | Pour une menace à IP publique, détail affiche GeoIP/DNS inverse/RDAP/sources ; pour IP privée, mention non applicable | local/preprod | [ ] | Implémenté techniquement 20/05 via détails menace ; à valider avec une IP publique contrôlée. |
| Benchmark long post-bascule Rust | 40-60 min p95 CPU/RAM/IO dans gate preprod | preprod | [ ] | |
| Backoffice services affiche donnees coherentes | CPU, RAM, reseau, I/O, disponibilite, historique | local/preprod | [ ] | |
| Corrélation perf/logs/securite utilisable | Incidents lies a logs avec ecart temporel comprehensible | preprod | [ ] | |

## CI/CD et branches

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| Workflow CI/CD — Prettier frontend | `npm run format:check` local OK, puis prochain workflow GitHub #556 ne bloque plus sur le job « Vérification du formatage » | local/GitHub | [x] | Local + GitHub 21/05 : run `26202796200` succès. |
| Workflow CI/CD — Tests Frontend Jest | `npm run test:ci` passe en CI : suites Jest OK + rapport coverage généré sans seuil global irréaliste | local/GitHub | [x] | Local 24 suites / 118 tests ; CI run `26202796200` succès. |
| Workflow CI/CD — Tests Backend security-service | `tests/backend/test-security-service.test.js` ne timeoute plus en CI quand la gateway met plus de 10s à être prête | local/GitHub | [x] | Correctif 21/05 ; CI run `26202796200` succès. |
| Workflow CI/CD — Tests DB migrations | `tests/database/test-migrations.js` applique le schéma avec un `npx` portable sur runner GitHub | GitHub | [x] | Correctif `npx` via PATH ; CI run `26202796200` succès. |
| Workflow CI/CD passe sur GitHub | Jobs DB, backend, frontend, integration, perf initialises | GitHub | [x] | Run `26202796200` sur `feat/central-logging-full` — pipeline complet succès (21/05). |
| Workflow security-audit passe | Gitleaks/Trivy et artefacts disponibles | GitHub | [ ] | |
| Noms de branches respectent `BRANCHES.md` | Branche type `docs/...`, `feat/...`, `fix/...` | repo | [ ] | |
| Commits respectent la convention | `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `misc:` | repo | [ ] | |

## Structure projet

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| Rapports generes non versionnes | `backend-performance-reports`, `diagnostic-reports`, `test-results*` absents du suivi Git | repo | [ ] | |
| `services/` Python archive ou supprime | Plus de confusion avec `backend/*-service` actif | repo | [ ] | |
| `mobile-native-app` archive ou supprime | Plus de dossier racine inutile | repo | [ ] | |
| `mobile/` vs `flutter-mobile-app/` decide | Une source mobile officielle documentee | repo | [ ] | |
| Tests colocated backend conserves ou migrés proprement | Jest configs adaptees si migration | repo | [ ] | |

## Documentation a relire

| Document | A verifier | Statut porteur | Retour porteur |
|----------|------------|----------------|----------------|
| `TODOS.md` | Les taches a faire sont en premier et les realises n'encombrent pas la priorite | [ ] | |
| `STATUS.md` | Le statut explique l'etat reel sans sur-vendre | [ ] | |
| `PLAN.md` | La colonne "Valide porteur" est a jour | [ ] | |
| `docs/security/AUDIT_SEC_PROJECT.md` | Les risques sécurité sont compréhensibles | [ ] | |
| `monitoring/RAPPORT_MONITORING_GOOD_PRACTICE_GO_AND_C.md` | La strategie C/Rust est claire | [ ] | |
| `BRANCHES.md` | Les conventions sont acceptables | [ ] | |

## Resultat attendu

Quand toutes les lignes critiques sont validees ou converties en nouvelles taches, ce fichier sert de base au gate preprod puis au gate production.
