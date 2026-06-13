# TODOs à valider par le porteur

Dernière mise à jour : 12 juin 2026

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

Le porteur valide la première ligne ouverte soit en répondant dans le chat avec `OK` ou `KO` + détail, soit en renseignant les colonnes de cette même ligne :

- `Notes porteur` : observations libres, ressenti UI, problème vu, amélioration souhaitée.
- `Preuves porteur` : capture, chemin de rapport, URL testée, valeur observée, compteur avant/après.
- `Décision porteur` : `OK <nom exact>` ou `KO <nom exact>` + détail.

L’agent ne coche pas à la place du porteur : après un `OK` explicite, il archive la ligne dans `TODOS_DONE.md` ; après un `KO`, il corrige ou crée la tâche de correction avant toute suite.

## Mode opératoire détaillé pour valider

Guide pas à pas : **où cliquer**, **quelles commandes lancer**, **quoi regarder**, **quoi répondre**. Une ligne du tableau = une validation à la fois.

### Prérequis communs (toutes les validations UI)

| Étape | Action |
|-------|--------|
| 1 | Stack locale up : conteneurs `jobbingtrack-postgres` et `jobbingtrack-frontend` **healthy** (`docker ps --filter name=jobbingtrack`). Si down : cible Make documentée **`up-full`** (équivalent `docker compose up -d` depuis la racine du repo). |
| 2 | Connexion : [https://jobbingtrack.localhost:5443/login](https://jobbingtrack.localhost:5443/login) (ou [http://localhost:5003/login](http://localhost:5003/login)) avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env`. |
| 3 | Hub backoffice : [https://jobbingtrack.localhost:5443/b4ck0ff1ce](https://jobbingtrack.localhost:5443/b4ck0ff1ce) — menu latéral gauche. |
| 4 | Terminal : se placer à la racine du repo (`cd …/JobbingTrack`). Préférer `/usr/bin/env node …` si la commande `node` échoue silencieusement (shell `lazynvm`). |

---

### P1A — Archive logs sécurité sans purge

**But** : exporter des logs en archive gzip + manifest, **sans** `DELETE` ni baisse du compteur `security_logs`.

> **Important — pas de bouton dans l’interface** : l’archivage ne se fait **pas** depuis `/b4ck0ff1ce/security/logs`. C’est un **script terminal** (`security-logs-archive-export.cjs`). L’UI sert seulement à **vérifier** que les logs sont toujours visibles après l’export. La page Statistics → Sécurité mentionne les scripts mais ne les lance pas.

#### A. Interface (contrôle visuel uniquement — pas d’action « Archiver »)

| # | Où aller | URL directe | Quoi vérifier |
|---|----------|-------------|---------------|
| 1 | Menu **Sécurité** → **Logs** | [https://jobbingtrack.localhost:5443/b4ck0ff1ce/security/logs](https://jobbingtrack.localhost:5443/b4ck0ff1ce/security/logs) | La liste des logs s’affiche (pagination OK). **Aucun bouton « Archiver » attendu ici.** |
| 2 | Menu **Sécurité** → **Vue d’ensemble** | [https://jobbingtrack.localhost:5443/b4ck0ff1ce/security](https://jobbingtrack.localhost:5443/b4ck0ff1ce/security) | Bandeau éventuel « résultat tronqué » si > 2000 lignes sur 30 j — normal. |
| 3 | Menu **Statistics** → **Sécurité** | [https://jobbingtrack.localhost:5443/b4ck0ff1ce/statistics/security](https://jobbingtrack.localhost:5443/b4ck0ff1ce/statistics/security) | Carte ambre « Volume logs sécurité » + **noms** des scripts (info seulement). |

#### B. Terminal (export sans purge)

Copier-coller depuis la racine du projet :

```bash
# 0 — Postgres accessible
docker ps --filter name=jobbingtrack-postgres --format '{{.Names}} {{.Status}}'

# 1 — Compteur AVANT export (noter le chiffre)
docker exec jobbingtrack-postgres sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT COUNT(*) FROM security_logs;"'

# 2 — Dry-run lecture seule (optionnel, aucune écriture)
/usr/bin/env node scripts/security/security-logs-retention-dry-run.cjs

# 3 — Export archive SANS purge (commencer petit si erreur ENOBUFS)
/usr/bin/env node scripts/security/security-logs-archive-export.cjs --class=noise --limit=50

# 4 — Compteur APRÈS export (doit être IDENTIQUE à l’étape 1)
docker exec jobbingtrack-postgres sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT COUNT(*) FROM security_logs;"'

# 5 — Lire le manifest produit aujourd’hui
cat "data/archives/security-logs/$(date -I)/manifest.json"
ls -la "data/archives/security-logs/$(date -I)/"
```

**Fichiers attendus** (gitignorés, sur disque local) :

- Dossier : `data/archives/security-logs/YYYY-MM-DD/`
- `manifest.json` — champ `"note": "Export only — no rows deleted from security_logs"`
- `noise.jsonl.gz` (ou autre classe : `critical.jsonl.gz`, `high.jsonl.gz`, `standard.jsonl.gz`)

**Preuve agent déjà prête (10/06)** : export `noise` 50 lignes → `data/archives/security-logs/2026-06-10/` ; compteur `security_logs` **42311** avant et après.

#### C. Critères OK / KO

| OK si | KO si |
|-------|-------|
| `manifest.json` lisible, `exportedRows` > 0 | Pas de dossier `data/archives/security-logs/…` |
| Fichier `.jsonl.gz` présent | `manifest` illisible ou vide |
| Compteur étape 1 = compteur étape 4 | Compteur `security_logs` a baissé |
| UI logs toujours accessibles après export | Erreur script sans archive utilisable |

#### D. Réponse à copier dans le chat

- OK : `OK Archive logs sécurité sans purge`
- KO : `KO Archive logs sécurité` + chemin manquant ou compteur avant/après

### P1A — Restauration logs sécurité en staging

**But** : recharger une archive dans **`security_logs_restore_staging` uniquement**, jamais dans `security_logs`.

#### A. Interface (contrôle visuel)

| # | Où aller | URL | Quoi vérifier |
|---|----------|-----|---------------|
| 1 | **Sécurité** → **Logs** | [http://localhost:5003/b4ck0ff1ce/security/logs](http://localhost:5003/b4ck0ff1ce/security/logs) | Les logs normaux sont toujours là, inchangés. |

#### B. Terminal (restauration staging)

**Prérequis** : avoir fait l’export P1A (dossier `data/archives/security-logs/YYYY-MM-DD/`).

```bash
# 1 — Compteur table réelle (ne doit PAS changer après restore)
docker exec jobbingtrack-postgres sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT COUNT(*) FROM security_logs;"'

# 2 — Restauration en staging uniquement
/usr/bin/env node scripts/security/security-logs-archive-restore.cjs \
  --class=noise --load-staging

# 3 — Compteur staging (doit être > 0 si export non vide)
docker exec jobbingtrack-postgres sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT COUNT(*) FROM security_logs_restore_staging;"'

# 4 — Recompter table réelle (identique à l’étape 1)
docker exec jobbingtrack-postgres sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT COUNT(*) FROM security_logs;"'

# 5 — Aperçu staging (optionnel)
docker exec jobbingtrack-postgres sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT row_id, retention_class, source_file FROM security_logs_restore_staging LIMIT 3;"'
```

**Sortie attendue du script** : lignes `No write to public.security_logs` et `Target table: public.security_logs_restore_staging`.

**Preuve agent déjà prête (10/06)** : `staging_loaded=50`, `security_logs` reste **42311**.

#### C. Critères OK / KO

| OK si | KO si |
|-------|-------|
| Script affiche « No write to public.security_logs » | Message d’insert dans `security_logs` |
| `security_logs_restore_staging` > 0 | Staging vide après export non vide |
| Compteur `security_logs` inchangé | Compteur `security_logs` modifié |
| UI logs inchangée | Logs manquants ou différents en UI |

#### D. Réponse

- OK : `OK Restauration staging logs sécurité`
- KO : `KO Restauration staging` + compteur ou table concernée

### P1A — Alertes email critiques JobbingTrack

**But** : alias publics visibles, réauth admin pour modifier, email de test reçu dans MailHog.

#### A. Interface

| # | Où aller | URL / chemin | Action |
|---|----------|--------------|--------|
| 1 | **Menu latéral Sécurité → Alertes email** (ou sous-nav sur une page Sécurité) | [https://jobbingtrack.localhost:5443/b4ck0ff1ce/security/alerts](https://jobbingtrack.localhost:5443/b4ck0ff1ce/security/alerts) | Page dédiée avec le bloc **Alertes email — menaces & disponibilité**. Accès aussi via **Paramètres** (popup ou `/settings`) → onglet **Notifications** → bouton rouge **Ouvrir Alertes email sécurité**. |
| 2 | Bloc **Destinataires** | même page | Vérifier destinataires (`@jobbingtrack.test` ou alias publics, pas d’adresse perso). |
| 3 | Modifier / tester | champ **Mot de passe actuel** obligatoire | Saisir `ADMIN_PASSWORD`, **Enregistrer les alertes sécurité** puis **Envoyer un email de test**. |
| 4 | Boîte mail locale | [http://localhost:8025](http://localhost:8025) (MailHog) | Email reçu ; expéditeur = alias (`SECURITY_ALERT_FROM` / `SMTP_FROM`). |
| 5 | Boîtes réelles si miroir SMTP activé | SMTP OVH / fournisseur | Vérifier aussi la réception sur les destinataires réels attendus (`dev@…`, `admin@…`) ; MailHog reste la preuve locale principale. |
| 6 | Diagnostic admin | [https://jobbingtrack.localhost:5443/b4ck0ff1ce/email-monitor?type=NOTIFICATION](https://jobbingtrack.localhost:5443/b4ck0ff1ce/email-monitor?type=NOTIFICATION) | Filtre **Notification** actif ; vérifier statut, destinataire, date et bouton **Voir le contenu** si la boîte réelle ne reçoit pas. |
| 7 | Panneau diagnostic page Alertes | [https://jobbingtrack.localhost:5443/b4ck0ff1ce/security/alerts](https://jobbingtrack.localhost:5443/b4ck0ff1ce/security/alerts) — bloc **Derniers envois alertes** | Encart **Dernier envoi vers admin** avec sujet/horodatage/miroir ; cartes `admin@delhomme.ovh` surlignées ; rappel spam/délai fournisseur. |

**Note** : l’ancien accès via `/settings` onglet Notifications reste possible, mais la validation porteur doit utiliser la page dédiée Sécurité → Alertes email pour éviter toute ambiguïté.

**Limite connue** : ces alertes passent encore par la stack JobbingTrack (`security-service` / `notification-service`). Elles ne suffisent pas si toute la stack tombe. Un watcher externe léger, séparé de Docker/JobbingTrack, doit être prévu pour vérifier l’indisponibilité complète et envoyer une alerte mail directement via SMTP/fournisseur.

#### B. Critères OK / KO

| OK si | KO si |
|-------|-------|
| Réauth demandée avant sauvegarde/test | Modification sans mot de passe |
| Email visible dans MailHog :8025 | Pas d’email / erreur SMTP |
| Diagnostic visible dans **Gestion des emails → Historique** filtre **Notification** | Impossible de retrouver l’email dans l’admin |
| Expéditeur = alias public JobbingTrack | Adresse perso dans Git/UI/rapport |
| Si miroir SMTP activé : logs `miroir SMTP envoyé` et réception réelle confirmée | Miroir bloquant ou erreur SMTP réelle non expliquée |
| Email d’alerte enrichi avec contexte utile : service touché, sévérité, horodatage, derniers logs ciblés redigés, lien diagnostic admin | Email trop vague sans élément d’enquête ou avec secrets/payloads sensibles bruts |

#### C. Réponse

- OK : `OK Alertes email critiques`
- KO : `KO Alertes email critiques` + capture ou erreur UI

### P1A — Tests offensifs contrôlés par conteneur

**But** : valider le **cadrage** (matrice + bornes), pas lancer une campagne agressive.

#### A. Documents à lire (5–10 min)

- `docs/security/SECURITY_TESTING_MATRIX.md`
- `docs/security/COMPOSE_RUNTIME_HARDENING.md`

#### B. Interface (consultation)

| # | Où aller | URL |
|---|----------|-----|
| 1 | **Développement** → **Tests** | [http://localhost:5003/b4ck0ff1ce/tests](http://localhost:5003/b4ck0ff1ce/tests) |
| 2 | Carte **Tests offensifs contrôlés** | même page — vérifier le bouton **Périmètre offensif lab** ; il génère un rapport plan-only, sans payload |
| 3 | **Développement** → **Tests** → **Tests Sécurité** | [http://localhost:5003/b4ck0ff1ce/tests-security](http://localhost:5003/b4ck0ff1ce/tests-security) |
| 4 | **Développement** → **Rapports de tests** | [http://localhost:5003/b4ck0ff1ce/test-reports](http://localhost:5003/b4ck0ff1ce/test-reports) — vérifier `controlled-offensive-20260612-013308` |

**Interdit** : ZAP actif, nmap, SYN flood, spoofing sur prod. Cibles lab : `localhost:5002` uniquement.

**Preuve agent fraîche (12/06 01h33)** : `bash scripts/security/run-controlled-offensive-lab-scope-with-report.sh` → `tests/results/controlled-offensive/20260612-013308`, `dryRun=true`, `willRunPayload=false`, Jest préflight/lab-scope **9/9 OK**.

#### C. Réponse

- OK : `OK Tests offensifs contrôlés`
- KO : `KO Tests offensifs` + menace ou cible problématique

### P1A — Leurres / désinformation contrôlée VPS-Portainer

**But** : valider le **design** de réduction d’exposition — **pas** déployer de honeypot.

#### A. Documents à lire

- `docs/deployment/VPS_PORTAINER_NPM_OVH.md`
- `docs/security/COMPOSE_RUNTIME_HARDENING.md`
- `A_VALIDER_AVANT_PRODUCTION.md` (gate « Masquage infos infra / leurres »)

#### B. Vérif rapide

- Admin : [http://localhost:5003/b4ck0ff1ce/security](http://localhost:5003/b4ck0ff1ce/security) — les vraies alertes restent visibles.
- Public : Portainer / Postgres / metrics ne doivent pas être accessibles hors ports prévus.

**Preuve agent fraîche (12/06 01h40)** : documents relus (`docs/security/VPS_EXPOSURE_REDUCTION.md`, `docs/security/COMPOSE_RUNTIME_HARDENING.md`, `docs/deployment/VPS_PORTAINER_NPM_OVH.md`) ; conclusion conservatrice : réduction d’exposition d’abord, Portainer/NPM admin via IP allowlist/VPN/tunnel, NPM réseau partagé seulement avec `frontend`/`api-gateway`, pas de leurre/honeypot sur domaine utilisateur réel. Aucune action offensive ou déploiement de leurre lancé.

#### C. Réponse

- OK : `OK Leurres/désinformation design`
- KO : `KO Leurres/désinformation` + risque identifié

### P1B — Corrélation performances

| # | Menu | URL | Action |
|---|------|-----|--------|
| 1 | **Performances** → **Corrélation** | [http://localhost:5003/b4ck0ff1ce/performances/correlation](http://localhost:5003/b4ck0ff1ce/performances/correlation) | Choisir un service (ex. `api-gateway`). |
| 2 | Même page | — | KPI logs/erreurs non tous à 0 si stack active ; sinon message « pas de données » explicite. |

**Preuve agent fraîche (12/06 01h51)** : `scripts/ops/run-performance-correlation-validation-with-report.sh` → `tests/results/performance-correlation/20260612-015102` (**5/5 étapes OK**) ; central logging runtime **15/15** ; `aggregated_logs` contient **27604** lignes / **18** services ; endpoints metrics et page `/b4ck0ff1ce/performances/correlation` répondent **200** ; rapport ouvrable via `performance-correlation-20260612-015102`.

**Réponse** : `OK Corrélation performances` ou `KO Corrélation performances` + service + détail.

### P1B — Statistics (4 validations séparées)

Menu **Statistics** → sous-onglets en haut de page.

| Validation | URL | Vérifications |
|------------|-----|---------------|
| Sécurité | [http://localhost:5003/b4ck0ff1ce/statistics/security](http://localhost:5003/b4ck0ff1ce/statistics/security) | Cohérent avec [http://localhost:5003/b4ck0ff1ce/security](http://localhost:5003/b4ck0ff1ce/security). |
| Logs | [http://localhost:5003/b4ck0ff1ce/statistics/log-stats](http://localhost:5003/b4ck0ff1ce/statistics/log-stats) | Filtres service/niveau ; compteurs cohérents. |
| Données applicatives | [http://localhost:5003/b4ck0ff1ce/statistics/app-data](http://localhost:5003/b4ck0ff1ce/statistics/app-data) | Pas de `undefined`. |
| Vue d’ensemble | [http://localhost:5003/b4ck0ff1ce/statistics](http://localhost:5003/b4ck0ff1ce/statistics) | Graphes dispo/erreur ; bascule 24 h ↔ 7 j. |
| Temps de réponse endpoints | Statistics / Performances selon route exposée | Services critiques visibles ou état explicite : `auth-service`, `deployment-service`, `call-service`, `notification-service`, `followup-service`, `application-service`, `postgres` ; source claire `monitoring-agent-rs` / `metrics-aggregator`, moyenne instantanée/agrégée non trompeuse. |

**Preuve agent fraîche Statistics Sécurité (12/06 01h56)** : endpoints `persistence/security/metrics`, `persistence/security/summary`, `persistence/stats` répondent **200** ; `security/metrics` = **2000** points, `summary.dataPoints=2000`, `security_logs=42296` et `security_metrics=97779` confirmés en BDD ; `/b4ck0ff1ce/statistics/security` et `/b4ck0ff1ce/security` répondent **200**.

**Preuve agent fraîche Statistics log-stats (12/06 02h08)** : `scripts/ops/run-statistics-log-stats-validation-with-report.sh` → `tests/results/statistics-log-stats/20260612-020820` (**4/4 étapes OK**) ; `smoke-persistence-stats.cjs` OK ; `/persistence/stats` → `aggregatedLogs=27606` confirmé BDD ; `/persistence/logs` 14j → **799** lignes, filtre WARN → **50**, filtre `jobbingtrack-api-gateway` → **3** ; `/b4ck0ff1ce/statistics/log-stats` HTTP **200** ; rapport `statistics-log-stats-20260612-020820` listé dans test-reports.

**Preuve agent fraîche Statistics app-data (12/06 13h22)** : correctif ports `event/followup` dashboard-service ; `scripts/ops/run-statistics-app-data-validation-with-report.sh` → `tests/results/statistics-app-data/20260612-132256` (**4/4 OK**) ; `/api/v1/statistics` sans `undefined` ; `followups=152`, `events=1011` cohérents BDD ; timeline fallback 1 point + message explicite ; `/b4ck0ff1ce/statistics/app-data` HTTP **200** ; rapport `statistics-app-data-20260612-132256`.

**Preuve agent fraîche Statistics vue d’ensemble (12/06 13h27)** : `scripts/ops/run-statistics-overview-validation-with-report.sh` → `tests/results/statistics-overview/20260612-132737` (**4/4 OK**) ; `system/metrics` 24h et 7j → **51** points / disponibilité présente ; Jest séries **3/3 OK** ; `/b4ck0ff1ce/statistics` HTTP **200** ; rapport `statistics-overview-20260612-132737`.

**Preuve agent fraîche temps de réponse endpoints (12/06 13h49)** : `responseTime.per_service` exposé (23 services) ; script `scripts/ops/run-statistics-endpoint-latency-validation-with-report.sh` → `tests/results/statistics-endpoint-latency/20260612-134940` (**3/3 OK**) ; 7 services prioritaires mesurés ou état explicite (postgres = Santé Docker) ; pages Performances/latency/statistics HTTP **200** ; rapport `statistics-endpoint-latency-20260612-134940`.

**Réponses** : `OK Statistics Sécurité` · `OK Statistics log-stats` · `OK Statistics app-data` · `OK Statistics vue d’ensemble` · `OK Statistics temps de réponse endpoints` · etc. (ou `KO` + route).

### P1C — UX backoffice (une validation = une réponse)

| Validation | Navigation | Étapes |
|------------|------------|--------|
| Mode sombre | Barre haute → icône 🌙/☀️ | Passer sombre → F5 sur `/b4ck0ff1ce` → reste sombre. |
| Popup paramètres | Bouton **Paramètres** barre haute | Clic hors popup / `Escape` ferme ; clic dedans OK. |
| Graphes conteneurs | **Performances** → **Conteneurs** [lien](http://localhost:5003/b4ck0ff1ce/performances/containers) | « Tous les conteneurs » : couleurs CPU/RAM distinctes. |
| Plages temporelles | Sous-pages Performances | 24 h → 7 j → personnalisé : pas de vide durable. |
| 1re navigation perf. | Hub → **Performances** | Délai + graphes présents. |
| Sécurité FR | Sous-onglets Sécurité | [Politiques](http://localhost:5003/b4ck0ff1ce/security/policies) [Menaces](http://localhost:5003/b4ck0ff1ce/security/threats) [Firewall](http://localhost:5003/b4ck0ff1ce/security/firewall) [Logs](http://localhost:5003/b4ck0ff1ce/security/logs) [Analyse](http://localhost:5003/b4ck0ff1ce/security/analysis) [Réseau](http://localhost:5003/b4ck0ff1ce/security/network) |
| Comparaison rapports | [test-reports](http://localhost:5003/b4ck0ff1ce/test-reports) | 2 rapports non sécurité → **Comparer** → tableau. |
| Menu Tests | **Développement** → **Tests** | Clic = vue d’ensemble ; **Rapports de tests** dans sous-menu. |
| Responsive backoffice complet | DevTools navigateur ou écran réel | Vérifier petit écran, écran moyen et largeur intermédiaire sur `/b4ck0ff1ce`, Email Monitor, Utilisateurs, Sécurité, Performances, Statistics et Rapports : menu utilisable, pas de débordement horizontal, tableaux/listes lisibles, filtres empilés, boutons accessibles. |

**Réponses** : `OK <nom exact ligne tableau>` ou `KO <nom exact>` + ce que tu vois.

## À valider maintenant (ordre strict — une ligne à la fois)

| Priorité | Validation porteur | Environnement | Preuve attendue | Notes porteur | Preuves porteur | Décision porteur | Statut | Notes agent |
|----------|--------------------|---------------|-----------------|---------------|------------------|------------------|--------|-------------|
| P1B | Statistics — onglet Sécurité cohérent avec `/security` | local | Suivre § “P1B — Statistics sécurité/logs/données applicatives/vue d’ensemble” : chiffres sécurité cohérents avec `/security`, pas d’écran vide trompeur. | | | | [ ] | **Preuve agent 13/06** : `/statistics/security` distingue persistance 7 j et console `/security` live 30 j ; résumé persisté vide n’affiche plus un faux score 100 ; onglet interne `/statistics` renommé **Santé technique** pour éviter la confusion avec sécurité applicative. Routes `/statistics`, `/statistics/security`, `/security` HTTP 200 ; summary sécurité persisté 168 h = 2000 points. |
| P1B | Statistics — onglet Logs (`log-stats`) | local | Suivre § “P1B — Statistics sécurité/logs/données applicatives/vue d’ensemble” : filtres service/niveau, sources actives/historiques, compteurs cohérents. | | | | [ ] | **Preuve agent 13/06** : filtres niveau/service maintenant passés à `persistence/logs` côté API puis gardés côté UI ; message explicite si compteurs persistence indisponibles ; route `/statistics/log-stats` HTTP 200 ; API logs filtrée niveau `WARN` et service `jobbingtrack-deployment-service` OK ; `type-check`/lint OK. Reconfirmer visuellement après recreate/chauffe collecteurs. |
| P1B | Statistics — onglet Données applicatives (`app-data`) | local | Suivre § “P1B — Statistics sécurité/logs/données applicatives/vue d’ensemble” : totaux, timeline, états vides lisibles, pas de `undefined`. | | | | [ ] | **Preuve agent 13/06** : timeline avec un seul point affichée comme **snapshot applicatif courant** plutôt qu’état vide trompeur ; route `/statistics/app-data` HTTP 200 ; `/api/v1/statistics` HTTP 200 (`users/applications/companies/contacts/interviews/calls/followups/events`) ; `/api/v1/statistics/timeline` HTTP 200, 1 point + note fallback ; `type-check`/lint OK. |
| P1B | Statistics — graphes disponibilité / erreur (vue d’ensemble) | local | Suivre § “P1B — Statistics sécurité/logs/données applicatives/vue d’ensemble” : courbes chargées, légende source visible, plage 24h↔7j OK. | | | | [ ] | **Preuve agent 13/06** : route `/statistics` HTTP 200 ; historique système 100/100 points avec disponibilité exploitable ; `errorRate` explicite absent côté API sur l’échantillon testé, donc graphe erreur présenté comme valeur dérivée depuis disponibilité ; axe erreur borné dynamiquement pour rester lisible quand le taux est bas ; source persistée/dérivée affichée sous le titre. Jest `statisticsTimeSeries` **3/3 OK**, `type-check` OK, lint OK (warnings historiques). Validation navigateur porteur encore requise. |
| P1B | Statistics — moteur UI partagé shell | local | Ouvrir `/b4ck0ff1ce/statistics`, `/statistics/security`, `/statistics/log-stats` et `/statistics/app-data` : vérifier que le layout admin, la sous-navigation Statistics, l’en-tête, les actions de rafraîchissement, les filtres et les graphes restent cohérents sans double marge ni rupture visuelle. | | | | [ ] | **Preuve agent 13/06** : `StatisticsPageShell` porte désormais `AdminLayout`; la vue d’ensemble et les pages Sécurité / Logs / App data retirent leur wrapper local, sans changement de requêtes, filtres, graphes ni calculs. Validations : `tsc --noEmit` direct OK ; ESLint ciblé 0 erreur (66 warnings historiques sur la grande vue Statistics) ; lints IDE OK ; Jest Statistics/metrics **3 suites / 15 tests OK** ; routes `/statistics`, `/statistics/security`, `/statistics/log-stats`, `/statistics/app-data` HTTP 200 ; APIs summary sécurité, logs persistence, statistics et timeline HTTP 200 ; temps HTTP locaux : vue d’ensemble ~185 ms, sécurité ~80 ms, logs ~78 ms, app-data ~70 ms. `npm run type-check` et `npm run lint` sortent encore code 1 sans sortie exploitable, dette wrappers/globale déjà notée. |
| P1B | Analytics — moteur UI partagé shell | local | Ouvrir `/b4ck0ff1ce/analytics`, `/analytics/application/performance`, `/analytics/application/activity` et `/analytics/application/feedback` : vérifier que le layout admin, le retour hub, la sous-navigation Application, les titres, le sélecteur de période live et les cartes restent cohérents sans double marge ni rupture visuelle. | | | | [ ] | **Preuve agent 13/06** : nouveau `AnalyticsPageShell` partagé pour le hub et les pages Application ; les pages Performance live / Activité & traces / Retours & signalements retirent leurs wrappers locaux, sans changer les appels `centralMetricsService`, `statisticsService`, le sélecteur de période ni les cartes métriques. Validations : `tsc --noEmit` direct OK ; ESLint ciblé 0 erreur ; lints IDE OK ; Jest Analytics **3 suites / 13 tests OK** ; routes `/analytics`, `/analytics/application/performance`, `/analytics/application/activity`, `/analytics/application/feedback` HTTP 200 ; APIs `/api/v1/statistics` et `/api/metrics-aggregator/metrics` HTTP 200 ; temps HTTP locaux : hub ~63 ms, performance ~73 ms, activity ~57 ms, feedback ~58 ms. `npm run type-check` et `npm run lint` sortent encore code 1 sans sortie exploitable, dette wrappers/globale déjà notée. |
| P1C | Sécurité — moteur UI partagé shell | local | Ouvrir `/b4ck0ff1ce/security`, `/security/analysis`, `/security/logs`, `/security/incidents`, `/security/threats`, `/security/firewall`, `/security/network`, `/security/alerts` et `/security/policies` : vérifier que le layout admin, la sous-navigation Sécurité, l’en-tête, les actions (rafraîchir, exports, lab) et les onglets Incidents/Menaces restent cohérents sans double marge ni rupture visuelle. Sur une fiche menace ou alerte incident, vérifier le retour sans sous-nav principale. | | | | [ ] | **Preuve agent 13/06** : nouveau `SecurityPageShell` + `SecuritySubNav` partagés ; migration de la vue d’ensemble, Analyse, Logs, Incidents, Menaces, Firewall, Réseau, Alertes email et Politiques ; fiches détail menace/alerte avec `showSubNav=false` et retour ; sans changement des appels API, filtres, tableaux ni calculs. Validations : `tsc --noEmit` direct OK ; ESLint ciblé **0 erreur**, 56 warnings historiques ; Jest sécurité lib **3 suites / 14 tests OK** ; routes `/security/*` HTTP **307** sans session (redirect login attendu, stack up) ; `npm run type-check` et `npm run lint` sortent encore code 1 sans sortie exploitable, dette wrappers/globale déjà notée. |
| P1C | Administration — moteur UI partagé Services | local | Ouvrir `/b4ck0ff1ce/services`, `/services/logs` et une fiche `/services/<service>` : vérifier que le layout admin, la sous-navigation Services, l’en-tête, les actions **Services & Logs**, **Actualiser**, auto-refresh et les filtres logs restent cohérents sans double marge ni rupture visuelle. | | | | [ ] | **Preuve agent 13/06** : nouveau `ServicesPageShell` + `ServicesSubNav` partagés ; migration de la liste Services, des logs services et de la fiche détail service sans modifier les appels metrics-aggregator, filtres, tableaux, actions stop/restart ni auto-refresh. Validations : `tsc --noEmit` direct OK ; ESLint ciblé **0 erreur**, 24 warnings historiques ; lints IDE OK ; Jest fiche service **1 suite / 33 tests OK** ; routes `/services`, `/services/logs`, `/services/api-gateway` HTTP **307** sans session (redirect login attendu, stack up). `npm run type-check` et `npm run lint` sortent encore code 1 sans sortie exploitable, dette wrappers/globale déjà notée. |
| P1B | Statistics / Performances — temps de réponse endpoints services | local | Suivre § “P1B — Statistics” : vérifier temps de réponse instantanés/moyens par service, source `monitoring-agent-rs` / `metrics-aggregator`, services manquants visibles ou justifiés (`auth`, `deployment`, `call`, `notification`, `followup`, `application`, `postgres`). | | | | [ ] | **Preuve agent fraîche (12/06 15h30)** : page Latence alignée UX Performances (sous-nav + retour) ; `TimeRangeSelector` partagé (24h→7j, plage personnalisée) ; Playwright latence **OK** avec historique + instantané par service. |
| P1C | Graphes conteneurs multi-séries lisibles | local | Suivre § “P1C — UX backoffice” : Performances → Conteneurs → Tous les conteneurs, couleurs distinctes/stables CPU/mémoire. | | | | [ ] | **Preuve agent fraîche (13/06)** : API historique conteneur OK (`cpuUsagePercent`, `memoryUsagePercent`, `blockReadBytes`, `blockWriteBytes`) ; page renforcée avec fallback graphique live depuis `docker/services/all` si la plage historique ne renvoie rien ; routes HTTP 200 ; `type-check`/lint OK. **À revalider sur `:5443`.** |
| P1C | Performances — CPU & Mémoire dédié | local | Ouvrir `/b4ck0ff1ce/performances/cpu-memory` : entrée **CPU & Mémoire** visible sous Synthèse et avant Temps de réponse ; cartes CPU/mémoire live ; graph CPU global et mémoire globale ; sous-vues **CPU détaillé** / **Mémoire détaillée** ; cases services activables/masquables ; période 24h↔7j↔personnalisé conserve les graphes sans écran vide durable. Vérifier aussi Disque/Conteneurs : les graphes doivent afficher soit l’historique persisté, soit un fallback live court, sans écran vide durable. Vérifier enfin que les textes “Vue machine…” et “Journée civile locale…” ne s’affichent plus. | | | | [ ] | Implémentation agent 13/06 sur `feat/performance-cpu-memory-charts` ; optimisation suite retour porteur : vue globale en une requête système, détails limités aux services cochés (6 par défaut), fallback graphique live si historique vide, champs CPU/mémoire live aplatis depuis `service.metrics`. Vérification agrégateur : données non perdues (`systemMetrics` ~244k, `containerMetrics` ~5,4M), champs disque/réseau/Block I/O présents. Validations techniques `npm run type-check` OK, `npm run lint` OK (0 erreur, warnings historiques), Jest chart system **4/4**, routes Performances principales HTTP 200, API metrics live **23/23** services. |
| P1C | Performances — moteur UI partagé pages réseau/latence | local | Ouvrir `/b4ck0ff1ce/performances/network` et `/b4ck0ff1ce/performances/latency` : retour Performances, sous-navigation, titre, sélecteur de période, cartes graphes et états vides/chargement restent identiques visuellement ; vérifier qu’aucun graphe n’a disparu et que les pages restent rapides. | | | | [ ] | **Preuve agent 13/06** : premier lot moteur UI créé (`PerformancePageShell`, `PerformanceChartCard`, états loading/empty/info) et appliqué à Réseau + Latence sans changer les requêtes ni calculs. Tests : `type-check` OK, lint OK, Jest UI partagé **3/3**, régressions metrics/charts **15/15**, routes `/performances/network`, `/performances/latency`, `/performances` HTTP 200. Playwright Performances retenté : bloqué par le 401 admin connu avant tests de page. |
| P1C | Performances — moteur UI partagé pages disque/conteneurs | local | Ouvrir `/b4ck0ff1ce/performances/disk` et `/b4ck0ff1ce/performances/containers` : retour Performances, sous-navigation, titre, sélecteur de période, état chargement/vide et cartes graphes doivent rester cohérents avec Réseau/Latence ; vérifier que les graphes disque, volume, Block I/O et conteneurs CPU/mémoire restent visibles et rapides. | | | | [ ] | **Preuve agent 13/06** : lot 2 moteur UI appliqué à Disque + Conteneurs via `PerformancePageShell`, `PerformanceChartCard`, `PerformanceLoadingState` et `PerformanceEmptyState`, sans changement de requêtes ni calculs. Validations : `tsc --noEmit` direct OK ; Jest UI/charts/metrics **4 suites / 19 tests OK** ; routes `/performances`, `/performances/disk`, `/performances/containers` HTTP 200 ; API système `limit=20` HTTP 200, 20 points ; API `docker/services/all` HTTP 200, 23 services ; temps HTTP local moyen Disque ~70 ms, Conteneurs ~70 ms. `npm run type-check` et `npm run lint` restent perturbés par wrappers/dette globale ; lint ciblé pages modifiées 0 erreur, 1 warning hook préexistant. |
| P1C | Performances — moteur UI partagé vue d’ensemble | local | Ouvrir `/b4ck0ff1ce/performances` : vérifier que le retour Tableau de bord, le lien Analytics, la sous-navigation Performances, la période sticky, les cartes CPU/mémoire, latence, réseau/corrélation et endpoints instantanés restent présents et cohérents avec les pages détaillées. | | | | [ ] | **Preuve agent 13/06** : lot 3 moteur UI appliqué à la vue d’ensemble avec `PerformancePageShell`, options `backHref/backLabel/topLinks`, `PerformanceChartCard` avec `id` d’ancre et états partagés, sans changer les fetchs ni les calculs. Validations : `tsc --noEmit` direct OK ; ESLint ciblé vue d’ensemble + composants UI 0 erreur ; Jest UI/charts/metrics **4 suites / 19 tests OK** ; route `/performances` HTTP 200 ; API système `limit=20` HTTP 200, 20 points ; API `docker/services/all` HTTP 200, 23 services ; temps HTTP local moyen vue d’ensemble ~142 ms. `npm run type-check` et `npm run lint` sortent encore code 1 sans sortie exploitable, dette wrappers/globale déjà notée. |
| P1C | Performances — moteur UI partagé CPU & Mémoire | local | Ouvrir `/b4ck0ff1ce/performances/cpu-memory` : vérifier que le retour Performances, la sous-navigation, le titre, le sélecteur de période, les cartes live, les vues Vue globale/CPU détaillé/Mémoire détaillée, la sélection de services et les graphes restent présents et cohérents avec les autres pages Performances. | | | | [ ] | **Preuve agent 13/06** : lot 4 moteur UI appliqué à CPU & Mémoire via `PerformancePageShell`, `PerformanceChartCard`, `PerformanceLoadingState` et `PerformanceEmptyState`, sans changer les hooks de période, fetchs système/conteneurs, sélection de services ni fallbacks live. Validations : `tsc --noEmit` direct OK ; ESLint ciblé 0 erreur ; lints IDE OK ; Jest UI/charts/metrics **4 suites / 19 tests OK** ; route `/performances/cpu-memory` HTTP 200 ; API système `limit=20` HTTP 200, 20 points ; API `docker/services/all` HTTP 200, 23 services ; temps HTTP local moyen CPU & Mémoire ~187 ms, système metrics ~129 ms, Docker services ~868 ms. `npm run type-check` et `npm run lint` sortent encore code 1 sans sortie exploitable, dette wrappers/globale déjà notée. |
| P1C | Mémoire JobbingTrack — budget 8 Go et limites conteneurs | local + futur VPS | Après recreate des conteneurs, vérifier `/b4ck0ff1ce` et `/b4ck0ff1ce/services/<service>` : la mémoire projet affiche un budget JobbingTrack (~8192 MB en profil `full`), pas les ~48046 MB de la RAM hôte ; chaque service affiche une limite cohérente (`Budget JobbingTrack` ou `Limite Docker`) et aucun service ne présente 48 Go comme limite conteneur. | | | | [ ] | Correctif agent 12/06 : `mem_limit` Compose local/prod, budget stack `JOBBINGTRACK_STACK_MEMORY_LIMIT_MB=8192`, normalisation metrics-aggregator si Docker expose la RAM hôte. Recreate requis pour appliquer les limites Docker réelles. |
| P1C | Tooltips graphiques alignés couleurs séries | local | Sur Performances / Statistics : survoler plusieurs graphes multi-séries ; chaque ligne du tooltip doit reprendre la couleur de la courbe/barre correspondante, avec valeur lisible en clair/sombre. | | | | [ ] | **Preuve agent à finaliser (12/06)** : thème Recharts partagé ajusté pour ne plus forcer une couleur unique sur les items tooltip. |
| P1C | Logo JobbingTrack projet | local + mobile | Vérifier le nouveau logo sur login/register web, sidebar backoffice, favicon/PWA navigateur et splash/login Flutter ; pas de logo emoji résiduel sur ces entrées principales. | | | | [ ] | Nouveau logo enregistré dans `frontend/public/brand/jobbingtrack-logo.png` et `mobile/assets/branding/jobbingtrack-logo.png`. |
| P1C | Performances — plages temporelles sans flash vide | local | Suivre § “P1C — UX backoffice” : Synthèse/Réseau/Disque/Conteneurs/Latence, changement 24h→7j→personnalisé sans écran vide durable. | | | | [ ] | **Preuve agent fraîche (12/06 15h30)** : Playwright `performances-range-smoke.spec.ts` **7/7 OK** sur Synthèse, Réseau, Disque, Conteneurs, Latence, Corrélation (courbes réelles + bascule 24h↔7j/168h). |
| P1C | Performances — première navigation depuis hub | local | Suivre § “P1C — UX backoffice” : clic `/b4ck0ff1ce` → Performances, noter délai et présence des graphes. | | | | [ ] | |
| P1C | Sécurité — logs triés et fiche menace score/corrélation | local | Sur `/b4ck0ff1ce/security/logs`, vérifier que le tri est explicite et que `Plus récent d’abord` affiche bien les événements récents avant les anciens ; tester recherche IP/message/type sans résultat trompeur lié à la page courante. Vérifier aussi que saisir une catégorie/type/recherche ne recharge pas le tableau avant clic sur **Appliquer les filtres**, et que les logs lab (`Lab autocomplete...`) alimentent les suggestions. Sur une fiche menace high/critical sans log corrélé, vérifier que le risque est affiché comme score retenu/estimé depuis la sévérité plutôt qu’un `Risque max 0` trompeur. **Suite 13/06** : clic sur un log lab avec lien menace ne doit plus mener à un 404 (`lab-autocomplete-threat` rejeté) ; menu **Incidents & menaces** avec onglets Synthèse / Menaces réseau ; pas de `SecuritySubNav` ni paragraphes d’aide retirés qui réapparaissent. Redémarrer `security-service` si besoin. | | | | [ ] | Preuve agent 12–13/06 : CUID validé, auto-menace logs critical/error/warning, Jest backend **6/6** + frontend liens **3/3**, commit `022003f0` poussé ; Playwright setup admin **401** (credentials E2E à réaligner). |
| P1C | Comparaison rapports tests agrégés (non sécurité) | local | Suivre § “P1C — UX backoffice” : comparer 2 rapports non sécurité de même catégorie ; tableau de comparaison visible. | | | | [ ] | |
| P1C | Backoffice Développement → Tests — navigation et regroupement rapports | local | Suivre § “P1C — UX backoffice” : clic Tests = vue d’ensemble ; sous-menu Rapports ; toutes les entrées Tests restent accessibles. | | | | [ ] | **09/06 porteur** : menu Tests trop long et pas assez sous-catégorisé ; à traiter après P1A/P1B selon ordre. |
| P2 | Backoffice Tests — suite Agent email / triage | local | Depuis `/b4ck0ff1ce/tests`, vérifier la carte **Agent email / triage**, le bouton rapide **Lancer suite agent email**, l’exécution sans erreur et l’ouverture du rapport dans `/b4ck0ff1ce/test-reports` catégorie **Agent email / triage**. | | | | [ ] | Suite ajoutée après demande porteur 12/06 pour rendre les tests email-triage lançables directement dans l’interface JobbingTrack. |
| P1C | Responsive backoffice complet petit/moyen écran | local | Suivre § “P1C — UX backoffice” : tester petit écran, écran moyen et largeurs intermédiaires sur les pages backoffice principales ; lister les routes avec débordement horizontal, filtres/tableaux cassés, menu inutilisable, boutons hors écran, ou contenu qui réserve encore une marge/colonne pour la sidebar/panneau rétractable alors qu’il devrait reprendre toute la largeur disponible. | | | | [ ] | **10/06 porteur** : interface pas encore assez optimisée sur petit et moyen écran. **12/06 porteur** : ne pas garder d’espace vide réservé au panneau JobbingTrack rétractable sur petit écran. **Preuve agent 12/06 14h45** : smoke élargi desktop backoffice **151/151 OK** après correction d’un faux échec Playwright Statistics ; responsive petit/moyen reste à valider visuellement par le porteur. |
| P2 | Rapports tests — taille et compression | local | `/b4ck0ff1ce/test-reports` affiche la taille de chaque rapport (Ko/Mo) et le volume total filtré ; cadrer ensuite une compression/archivage des anciens rapports sans casser l’ouverture, le téléchargement ni les détails sensibles. | | | | [ ] | Taille affichée ajoutée côté agent ; compression à traiter après P0 CVE. |
| P2 | Mode clair backoffice — lisibilité page par page | local | Si une page est illisible en clair, noter la route exacte (ne bloque plus le lot global). | | | | [ ] | Acceptation provisoire 21/05. |
| P2 | Performances — Disque stockage BDD | local | Page Disque : cartes + Block I/O ; validation données réelles. | | | | [ ] | |
| P2 | Préférences refresh par graphique | local | Vérifier héritage zone globale vs override local (si UI exposée). | | | | [ ] | |
| P2 | Mobile — source officielle | décision | Choisir `mobile/` vs `flutter-mobile-app/` avant archivage doublon. | | | | [ ] | |
| P2 | Agent email / tâches recherche emploi — cadrage produit | local | Après clôture/reclassement des P0/P1 bloquants : relire `docs/features/EMAIL_TRIAGE_AGENT.md`, confirmer le périmètre MVP (worker planifié, tâches internes, compte personnel non-admin explicitement autorisé, OAuth Gmail lecture seule multi-comptes, boîtes configurées hors Git, stockage interne emails utiles, règles déterministes, digest 18h + récap hebdomadaire via le socle SMTP JobbingTrack, interface utilisateur `/` dédiée et backoffice `/b4ck0ff1ce` séparé, Google Tasks/Calendar obligatoires sans création d’événement à `00:00` si l’heure est inconnue, sans création automatique avant `05:00` ni après `23:00`, IA locale en renfort) et le périmètre élargi (feature flag/droit `JOB_SEARCH_AGENT_ENABLED`, activation/révocation admin auditée, séparation admin vs lecture emails personnels, base de composants partagée, option future `user-frontend` / `backoffice-frontend`, recherche v2 utilisateur puis backoffice/admin, dashboard mobile, revalidation PIN, autocomplete accessible, boîte de réception agent, préparation/envoi relance-email contrôlé, calendrier agrégé, programmation manuelle d’appels/tâches/rappels/événements même sans email déclencheur, fiches candidature/entreprise enrichies, suivi intérim, import contacts, PDF offre depuis URL, enrichissement entreprise, salons/job dating par ville/région, suites de tests agent email avec rapports), puis décider si on ouvre une branche `feat/` d’implémentation. | | | | [ ] | **09/06 porteur** : besoin prioritaire noté ; Make.com ne doit pas être le socle ; ne pas démarrer l’implémentation tant que la comparaison CVE P0 reste ouverte. |

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

| Priorité | Validation porteur | Environnement | Preuve attendue | Notes porteur | Preuves porteur | Décision porteur | Statut | Notes agent |
|----------|--------------------|---------------|-----------------|---------------|------------------|------------------|--------|-------------|
| P1D | Gate suite complète tests fin de journée / avant push majeur | local | Dernière campagne `run-all-tests-with-reports.sh` **verte** (exit 0) + rapport lu dans `tests/results/<horodatage>/` ; noter date/heure dans décision/preuves porteur. | | | | [ ] | Dernière campagne complète : **à relancer en fin de journée**, pas pendant le P0/P1 courant. |
| P1D | Audit final A-Z avant déploiement / tests globaux finaux | local puis préprod dédiée | Reprendre chaque bouton, formulaire, écriture BDD, endpoint API, service backend, job/worker, email, configuration, Docker/HTTPS, sécurité, logs, métriques, performances, responsive, mobile et rapports. Produire un bilan détaillé : régressions, lenteurs, opportunités d’optimisation sans perte fonctionnelle, risques prod et décision GO/NO-GO. | | | | [ ] | À lancer seulement en fin de programme, après clôture/reclassement des P1 ouverts et avant préprod/prod. |

## File technique liée (pas de validation ici)

Les chantiers non encore prêts pour validation porteur restent dans `docs/TODOS.md` (env strictes, pentest, PQC, purge menaces après OK P0, etc.).

## À ne pas valider ici

- Préprod/prod réelle : utiliser `A_VALIDER_AVANT_PRODUCTION.md`.
- Déploiement serveur : utiliser `DEPLOIEMENT_PRODUCTION.md`.
- Validation production réelle : utiliser `VALIDATION_PRODUCTION.md`.
- Tâche technique non livrée : rester dans `docs/TODOS.md`.
