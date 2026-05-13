# JobbingTrack — statistiques sécurité & dépendances (CVE / supply chain)

**Rôle** : centraliser **où** et **comment** analyser les vulnérabilités connues (**CVE**) et les dépendances pour **chaque service Node**, **le frontend**, **les outils**, **les images Docker** et **l’application mobile**. Ce fichier est une **feuille de suivi** : les chiffres et dates se remplissent après exécution des outils **sur votre machine** ou en **CI** — ce n’est pas un rapport CVE généré automatiquement par le dépôt.

**Documents liés** : **`PLAN.md`** (lot **B** sécurité + **B14/B15** infra compose et tests offensifs, lot **A** observabilité, lot **H** release/préprod/conformité), **`TODOS.md`** § fin (CVE + briques **A2**), **`docs/security/COMPOSE_RUNTIME_HARDENING.md`** (BX1–BX14), **`docs/operations/RELEASE_PREPROD_PRODUCTION_PLAN.md`**, **`ERRORS.md`**, **`STATUS.md`**.

**Dernière mise à jour** : 11 mai 2026 — exécution P0 partielle : `gitleaks` historique Git complet et Trivy/CVE images prod compose fusionné (`SECURITY_COMPOSE_PROFILES=full`). Résultats bruts à trier, voir § **11 mai 2026 — scans P0 bruts**.

---

## 1. Méthode recommandée (résumé)

| Couche | Outils typiques | Fréquence suggérée |
|--------|------------------|-------------------|
| **Node** (chaque `package.json` sous `backend/*`, `frontend/`, racine) | `npm audit` / `npm audit --omit=dev` ; évent. **`pnpm audit`** si migration ; **Dependabot / Renovate** en CI | À chaque release + hebdo en période active |
| **Images Docker** | **`docker scout cves <image>`** ou scanner registre ; aligner **tags** `postgres:15`, `redis:7-alpine` sur digest épinglés si politique stricte | À chaque rebuild d’image prod |
| **Mobile Flutter** | `dart pub outdated` ; **`flutter pub audit`** (selon version SDK) ; suivi plugins dans `pubspec.yaml` | Même rythme que releases mobile |
| **Binaires C** (monitoring-c, log-collector-c) | Rebuild avec chaîne à jour ; suivi **CVE** des libs statiques si SBOM disponible ; sinon revue manuelle + bons tags d’image | Trimestriel ou à défaut critique |

**Ne pas** confondre : **`npm audit`** signale des advisories npm (souvent avec correctif semver) ; une **CVE** réelle en prod dépend aussi de **code mort**, **bundles**, **images** et **configuration**.

### Commande projet

Le dépôt fournit maintenant un point d’entrée unique :

```bash
make test-cve-scan
```

Ce scan génère un rapport sous **`tests/results/security/cve-<timestamp>/summary.md`** et couvre :

- les dossiers avec **`package-lock.json`** via `npm audit --json --omit=dev` ;
- le workspace Rust **`monitoring/rust`** via `cargo audit --json` si `cargo-audit` est installé ;
- les images Docker des conteneurs en cours si lancé avec **`CVE_SCAN_DOCKER=1`** et **Trivy** installé ;
- les images de la stack compose prod fusionnée si lancé avec **`CVE_SCAN_DOCKER=1 CVE_SCAN_DOCKER_COMPOSE=1`** (défaut `make security-scan-images`) ; variables liées : `SECURITY_COMPOSE_FILES` et `SECURITY_COMPOSE_PROFILES`.

Mode bloquant CI possible :

```bash
CVE_SCAN_STRICT=1 CVE_SCAN_FAIL_ON=high make test-cve-scan
```

Variables utiles : `CVE_SCAN_INCLUDE_DEV=1` pour inclure les dépendances dev, `CVE_SCAN_DOCKER=1` pour scanner les images Docker, `CVE_SCAN_DOCKER_COMPOSE=1` pour cibler les images de la stack compose prod fusionnée, `CVE_SCAN_DOCKER_ALL_IMAGES=1` pour scanner toutes les images locales filtrées JobbingTrack/Postgres/Redis/MailHog, `--docker-image <image>` pour cibler une image précise, `CVE_SCAN_TIMEOUT_SEC=180` pour augmenter les timeouts.

### 11 mai 2026 — scans P0 bruts

Rapports locaux générés et **non versionnés** :

- `reports/security/secrets-20260511-142026/summary.md` : `gitleaks` historique complet, **859 commits**, **717 findings** ; `truffleHog` absent. Répartition brute : `jwt` 441, `generic-api-key` 221, `curl-auth-header` 55. Les principaux fichiers sont des artefacts de tests Playwright / résultats de tests ; à confirmer et nettoyer/ignorer proprement sans masquer de vrais secrets.
- `tests/results/security/cve-20260511-162025/summary.md` : scan Node/Rust/Flutter + Trivy images compose prod fusionné. Résultats bruts critiques/hauts à trier : racine Node (3 critical / 2 high), `backend` (1 critical / 11 high), `frontend` (2 critical / 6 high), API/services Node surtout `axios`, `express`/`path-to-regexp`, `jws`, `lodash`; images Docker avec vulnérabilités de base image, notamment `jobbingtrack-deployment-service` très élevé (190 critical / 1526 high), `mailhog/mailhog:latest` élevé (109 critical / 1145 high), `postgres:15`, `redis:7-alpine`, `frontend` et `api-gateway`.

Statut : **tri final bloqué tant que les rapports bruts ne sont pas présents localement ou récupérés depuis les artefacts CI**. Au 13/05, le workspace ne contient plus les dossiers datés `reports/security/secrets-20260511-142026/` ni `tests/results/security/cve-20260511-162025/` ; seul `reports/security/README.md` est versionné, ce qui est normal pour éviter de publier des extraits sensibles. Les chiffres ci-dessus restent une trace synthétique, pas une preuve suffisante finding par finding.

### 13 mai 2026 — tri P0 initial sans rapports bruts

Ce tri ne remplace pas la revue finding par finding. Il sert à ordonner le travail dès maintenant, sans relancer de scan lourd ni inventer des conclusions.

| Lot P0 | Décision initiale | Justification | Suite obligatoire |
|--------|-------------------|---------------|-------------------|
| `gitleaks` historique — JWT / API keys / headers dans artefacts | **Priorité 1 : confirmer secrets réels vs artefacts** | Les 717 findings bruts semblent majoritairement venir de rapports/tests, mais un seul secret réel historique suffit à imposer rotation/suppression. | Récupérer ou régénérer le rapport, classer par fichier, supprimer/rédiger les artefacts sensibles, ouvrir une tâche de rotation si un secret réel est confirmé. |
| Dépendances Node racine/backend/frontend | **Priorité 2 : revalider après corrections Dependabot** | Une partie des CVE listées le 11/05 peut être déjà corrigée par les mises à jour npm du 12/05 ; il faut éviter de traiter un état obsolète. | Relancer le scan CVE sur base à jour, reporter les `critical/high` restants par package et surface exposée. |
| `api-gateway`, `auth-service`, `security-service`, `frontend` | **Priorité 3 : surfaces exposées** | Ce sont les surfaces les plus sensibles côté auth, entrée publique, sécurité et backoffice. | Traiter avant services internes/dev-only si des CVE `critical/high` restent confirmées. |
| Images Docker prod (`frontend`, `api-gateway`, `postgres`, `redis`) | **Priorité 4 : image et exposition réelle** | Une CVE image n'a pas le même risque selon port publié, privilèges, user, filesystem et disponibilité d'un tag corrigé. | Croiser Trivy avec `docker-compose.prod.yml`, durcissement ports et tags d'images. |
| `jobbingtrack-deployment-service` | **Priorité 5 : très gros volume CVE à qualifier** | Le volume annoncé est très élevé ; il faut savoir si l'image est buildée/exposée en prod ou seulement dev/interne. | Vérifier Dockerfile/base image, usage prod, ports publiés, puis reconstruire sur base plus récente si actif. |
| `mailhog/mailhog:latest` | **Priorité dev-only à isoler** | MailHog ne doit pas être exposé en prod ; ses CVE sont critiques surtout si l'image est présente hors dev. | Confirmer absence préprod/prod ou remplacer par image maintenue si utilisée en environnement partagé. |
| `nmap`, `jwt_tool`, ZAP actif, `truffleHog` | **Non terminé** | Ces contrôles n'ont pas encore produit de rapport exploitable. | Exécuter uniquement en environnement autorisé, puis ajouter leurs rapports dans `reports/security/` ou `tests/results/security/`. |

Critère de sortie du P0 : chaque finding `critical/high` confirmé doit avoir une ligne avec outil, date, commit, environnement, surface, décision (`vrai risque`, `faux positif`, `dev-only`, `déjà corrigé`, `non exploitable`), justification et tâche corrective.

---

## 2. Inventaire par service / application (gabarit)

Colonne **Dernière analyse** : date du dernier `npm audit` (ou équivalent) exécuté **avec stack à jour**. Colonnes **Critique / Haut** : extrait du JSON `npm audit` (champs `severity`) ou du rapport Docker Scout — **à remplir**.

### 2.1 Microservices Node (`backend/<nom>/package.json`)

| Surface | Répertoire / image Docker | Commande (depuis le dossier du service) | Dernière analyse | Critique | Haut |
|---------|---------------------------|----------------------------------------|------------------|----------|------|
| API Gateway | `backend/api-gateway` / `jobbingtrack-api-gateway` | `npm audit --json` | — | — | — |
| Auth | `backend/auth-service` | idem | — | — | — |
| Application | `backend/application-service` | idem | — | — | — |
| Company | `backend/company-service` | idem | — | — | — |
| Contact | `backend/contact-service` | idem | — | — | — |
| Interview | `backend/interview-service` | idem | — | — | — |
| Call | `backend/call-service` | idem | — | — | — |
| Follow-up | `backend/followup-service` | idem | — | — | — |
| Event | `backend/event-service` | idem | — | — | — |
| Notification | `backend/notification-service` | idem | — | — | — |
| Profile | `backend/profile-service` | idem | — | — | — |
| Dashboard | `backend/dashboard-service` | idem | — | — | — |
| Workflow | `backend/workflow-service` | idem | — | — | — |
| Deployment | `backend/deployment-service` | idem | — | — | — |
| Security | `backend/security-service` | idem | — | — | — |
| Metrics aggregator | `backend/metrics-aggregator-service` | idem | — | — | — |

### 2.2 Racine monorepo & outils

| Surface | Répertoire | Notes |
|---------|------------|--------|
| Racine Node | `package.json` (racine) | Scripts transverses / tests — lancer `npm audit` à la racine aussi. |
| Prisma partagé | `backend/prisma/package.json` | Vérifier alignement versions avec services consommateurs. |
| Tests | `tests/package.json`, `tests/monitoring/package.json`, `tests/services/package.json` | Moins critique prod mais utile pour la chaîne CI. |
| Émulateur | `tools/emulator-controller/package.json` | Exposé en dev uniquement — garder trace des advisories. |

### 2.3 Frontend Next.js

| Surface | Répertoire | Commande |
|---------|------------|----------|
| Backoffice / front | `frontend/` | `npm audit` ; pour analyse build : `npm run build` après correctifs ; option **OWASP ZAP** / **lighthouse** hors scope CVE npm. |

### 2.4 Application mobile

| Surface | Fichier principal | Commandes |
|---------|-------------------|-----------|
| Flutter | **`mobile/pubspec.yaml`** et **`flutter-mobile-app/pubspec.yaml`** | `flutter pub outdated` ; suivre les **plugins** à code natif — voir **`ERRORS.md`** (ex. `flutter_local_notifications`). |

### 2.5 Infrastructure Docker (images de base)

| Composant | Image (exemple compose) | Analyse typique |
|-----------|-------------------------|-----------------|
| PostgreSQL | `postgres:15` | `docker scout cves jobbingtrack-postgres` (après build local) ou scanner registre. |
| Redis | `redis:7-alpine` | idem |
| MailHog | `mailhog/mailhog` | idem |
| Services **jobbingtrack-*** | Images buildées Dockerfile | Scout sur image taguée `jobbingtrack-<service>:latest`. |
| **monitoring-c** / **log-collector-c** | Images C | Pas de `npm audit` — revue toolchain + CVE des binaires / libc liés à l’image de base. |

---

## 3. Exemple de collecte rapide (copier-coller)

Depuis la racine du dépôt :

```bash
make test-cve-scan
```

Transcrire les totaux **critical** / **high** (ou « 0 vulnerabilities ») depuis le fichier `summary.md` généré dans le tableau § 2.1 si un suivi manuel est nécessaire.

---

## 4. Intégration continue (piste)

- **Objectif** : une étape **`npm audit --audit-level=high`** (ou seuil équivalent) dans la pipeline sur les dossiers **critiques** (gateway, auth, security, frontend), **sans** bloquer indéfiniment sur les baselines dev si politique assouplie.
- **Docker** : étape optionnelle **Scout** ou **Trivy** sur les images publiées — à cadrer avec le lot **G** / déploiement (**`PLAN.md`**).

---

## 5. Prochaines briques **A2** (logs — doc d’enchaînement)

Voir **`TODOS.md`** (fin de fichier) pour les cases à cocher détaillées. En résumé :

1. Homogénéiser les routes **`admin/logs/*`** (gateway) avec les paramètres **`since` / `until`** (whitelist) alignés sur **metrics-aggregator** `docker.routes.js`.
2. Tests automatisés (smoke) sur **`/backoffice/services/logs`** et sur les pages **`(development)/services/**`** après changement d’URL agrégateur.
3. (Optionnel) **Loki** ou agrégation centralisée si la charge logs dépasse le `docker logs` tail.

---

*Ce fichier peut être versionné avec des **commits** du type : « STATS: audit npm services 22/04 — 0 critical » en mettant à jour uniquement les lignes du tableau concerné.*

---

## 6 mai 2026 — Suivi charge monitoring (CPU/RAM/IO)

Objectif: suivre l'impact réel de la collecte métriques pour rendre le monitoring quasi imperceptible en ressources.

| Composant | Symptôme actuel observé | Risque principal | Mesure à produire |
|-----------|--------------------------|------------------|-------------------|
| `jobbingtrack-metrics-aggregator` | pics CPU fréquents (~100%+) | saturation boucle collecte | profil CPU + répartition temps par étape |
| `jobbingtrack-frontend` | pics CPU élevés (~300%+) | UI monitoring trop coûteuse | profil rendu React + fréquence re-fetch |
| `jobbingtrack-monitoring-c` | coûts fork/exec potentiels | overhead système stable | CPU moyen/p95 + nb appels externes/cycle |
| `jobbingtrack-log-collector-c` | risque blocage lecture logs | latence + backlog | débit logs, latence traitement, dropped lines |
| `jobbingtrack-redis` | mémoire jugée trop haute | swap/OOM/perf dégradée | used_memory, peak, fragmentation, eviction |

### Critères de validation

- CPU moyen par composant monitoring sous seuil défini (baseline -> cible).
- Pas de montée RAM non bornée (growth contrôlée, fragmentation suivie).
- IO disque monitoring stable et proportionné au volume réel.
- Tableau corrélation front lisible en chargement et sans placeholders trompeurs.

### Baseline runtime (6 mai 2026, 6 samples / 5s)

| Composant | CPU observé | RAM observée |
|-----------|-------------|--------------|
| `jobbingtrack-frontend` | 0% -> 303.38% (pics) | 3.70 -> 3.92 GiB |
| `jobbingtrack-metrics-aggregator` | 0.04% -> 87.65% (ponctuel) | 198 -> 278 MiB |
| `jobbingtrack-monitoring-c` | 0% -> 40.90% (ponctuel) | 2.97 -> 5.60 MiB |
| `jobbingtrack-log-collector-c` | ~0% stable | ~1.28 MiB stable |
| `jobbingtrack-redis` | 0.29% -> 2.41% | 7.69 -> 7.94 MiB |

### Mesure après optimisations immédiates (6 mai 2026, 6 samples / 5s)

| Composant | CPU observé | RAM observée |
|-----------|-------------|--------------|
| `jobbingtrack-frontend` | 1.17% -> 1.74% (hors point à 2.6% série précédente) | 231 -> 232.5 MiB |
| `jobbingtrack-metrics-aggregator` | ~0% entre cycles, pics 53-88% | 200 -> 250 MiB |
| `jobbingtrack-monitoring-c` | ~0% entre cycles, pics 3-4% | 1.7 -> 18 MiB |
| `jobbingtrack-log-collector-c` | ~0% stable | ~1.28 MiB stable |
| `jobbingtrack-redis` | 0.28% -> 2.78% | 7.4 -> 17.9 MiB (pic ponctuel) |
