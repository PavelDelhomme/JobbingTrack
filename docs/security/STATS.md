# JobbingTrack — statistiques sécurité & dépendances (CVE / supply chain)

**Rôle** : centraliser **où** et **comment** analyser les vulnérabilités connues (**CVE**) et les dépendances pour **chaque service Node**, **le frontend**, **les outils**, **les images Docker** et **l’application mobile**. Ce fichier est une **feuille de suivi** : les chiffres et dates se remplissent après exécution des outils **sur votre machine** ou en **CI** — ce n’est pas un rapport CVE généré automatiquement par le dépôt.

**Documents liés** : **`PLAN.md`** (lot **B** sécurité + **B14/B15** infra compose et tests offensifs, lot **A** observabilité, lot **H** release/préprod/conformité), **`TODOS.md`** § fin (CVE + briques **A2**), **`docs/security/COMPOSE_RUNTIME_HARDENING.md`** (BX1–BX14), **`docs/operations/RELEASE_PREPROD_PRODUCTION_PLAN.md`**, **`ERRORS.md`**, **`STATUS.md`**.

**Dernière mise à jour** : 7 mai 2026 — ajout du scan automatisé **`scripts/security/cve-scan.py`** et de la cible **`make test-cve-scan`**.

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
- les images Docker des conteneurs en cours si lancé avec **`CVE_SCAN_DOCKER=1`** et **Trivy** installé.

Mode bloquant CI possible :

```bash
CVE_SCAN_STRICT=1 CVE_SCAN_FAIL_ON=high make test-cve-scan
```

Variables utiles : `CVE_SCAN_INCLUDE_DEV=1` pour inclure les dépendances dev, `CVE_SCAN_DOCKER=1` pour scanner les images des conteneurs en cours, `CVE_SCAN_DOCKER_ALL_IMAGES=1` pour scanner toutes les images locales filtrées JobbingTrack/Postgres/Redis/MailHog, `--docker-image <image>` pour cibler une image précise, `CVE_SCAN_TIMEOUT_SEC=180` pour augmenter les timeouts.

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
