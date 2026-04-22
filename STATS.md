# JobbingTrack — statistiques sécurité & dépendances (CVE / supply chain)

**Rôle** : centraliser **où** et **comment** analyser les vulnérabilités connues (**CVE**) et les dépendances pour **chaque service Node**, **le frontend**, **les outils**, **les images Docker** et **l’application mobile**. Ce fichier est une **feuille de suivi** : les chiffres et dates se remplissent après exécution des outils **sur votre machine** ou en **CI** — ce n’est pas un rapport CVE généré automatiquement par le dépôt.

**Documents liés** : **`PLAN.md`** (lot **B** sécurité, lot **A** observabilité), **`TODOS.md`** § fin (CVE + briques **A2**), **`ERRORS.md`**, **`STATUS.md`**.

**Dernière mise à jour** : 22 avril 2026 — création du gabarit et inventaire des surfaces.

---

## 1. Méthode recommandée (résumé)

| Couche | Outils typiques | Fréquence suggérée |
|--------|------------------|-------------------|
| **Node** (chaque `package.json` sous `backend/*`, `frontend/`, racine) | `npm audit` / `npm audit --omit=dev` ; évent. **`pnpm audit`** si migration ; **Dependabot / Renovate** en CI | À chaque release + hebdo en période active |
| **Images Docker** | **`docker scout cves <image>`** ou scanner registre ; aligner **tags** `postgres:15`, `redis:7-alpine` sur digest épinglés si politique stricte | À chaque rebuild d’image prod |
| **Mobile Flutter** | `dart pub outdated` ; **`flutter pub audit`** (selon version SDK) ; suivi plugins dans `pubspec.yaml` | Même rythme que releases mobile |
| **Binaires C** (monitoring-c, log-collector-c) | Rebuild avec chaîne à jour ; suivi **CVE** des libs statiques si SBOM disponible ; sinon revue manuelle + bons tags d’image | Trimestriel ou à défaut critique |

**Ne pas** confondre : **`npm audit`** signale des advisories npm (souvent avec correctif semver) ; une **CVE** réelle en prod dépend aussi de **code mort**, **bundles**, **images** et **configuration**.

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

Depuis la racine du dépôt (adapter si vous utilisez `pnpm` / `yarn`) :

```bash
# Audit racine
npm audit --omit=dev 2>/dev/null | tail -5

# Boucle microservices (shell)
for d in backend/api-gateway backend/auth-service backend/application-service backend/company-service \
  backend/contact-service backend/interview-service backend/call-service backend/followup-service \
  backend/event-service backend/notification-service backend/profile-service backend/dashboard-service \
  backend/workflow-service backend/deployment-service backend/security-service backend/metrics-aggregator-service; do
  echo "=== $d ==="
  (cd "$d" && npm audit --omit=dev 2>/dev/null | tail -3) || echo "(pas de package-lock ou erreur)"
done

(cd frontend && npm audit --omit=dev 2>/dev/null | tail -5) || true
```

Transcrire les totaux **critical** / **high** (ou « 0 vulnerabilities ») dans le tableau § 2.1.

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
