# Versionnement plateforme JobbingTrack — stratégie déploiement Portainer

Dernière mise à jour : **7 juillet 2026**  
Public : porteur, agents, **toute IA externe** sans accès au dépôt.

Documents liés :

- Mobile (OTA, APK) : [`../mobile/VERSIONNEMENT.md`](../mobile/VERSIONNEMENT.md), [`../mobile/VERSIONNEMENT_EXPLICATION_PORTEUR.md`](../mobile/VERSIONNEMENT_EXPLICATION_PORTEUR.md)
- Vision modulaire : [`../project/MODULAR_SERVICES_VISION.md`](../project/MODULAR_SERVICES_VISION.md)
- Déploiement cible : [`DEPLOIEMENT_FINAL.md`](DEPLOIEMENT_FINAL.md), [`../production/DEPLOIEMENT_PRODUCTION.md`](../production/DEPLOIEMENT_PRODUCTION.md)

---

## 1. Contexte projet (pour une IA sans accès au repo)

**JobbingTrack** est un **monorepo** avec :

| Couche | Contenu | Déploiement aujourd’hui |
|--------|---------|-------------------------|
| **Mobile** | App Flutter (`mobile/`) | OTA + APK via backoffice (`/backoffice/mobile/releases`), **canal dev/prod** |
| **Frontend / backoffice** | Next.js (`frontend/`) | 1 conteneur Docker `jobbingtrack-frontend` |
| **API Gateway** | Point d’entrée HTTP (`backend/api-gateway/`) | 1 conteneur, route vers microservices |
| **Microservices métier** | ~14 services Node (`application-service`, `auth-service`, …) | 1 conteneur par service |
| **Observabilité** | `metrics-aggregator-service`, agents Rust (`monitoring-agent-rs`, `log-collector-rs`) | Conteneurs séparés |
| **Orchestration release** | `deployment-service` + UI `/deployments` | **Journal** aujourd’hui ; **orchestration Portainer incomplète** |

**Objectif porteur** : déployer sur **VPS via Portainer**, déclenché depuis **notre stack** (backoffice / scripts / CI maison), **sans dépendre de GitHub Releases** pour la vérité des versions déployées.

**État actuel des numéros** : les `package.json` des services sont hétérogènes (`1.0.0`, `1.0.1`) — **ce n’est pas encore une politique de release**. Il faut un **manifeste de plateforme** comme source de vérité au moment du déploiement.

---

## 2. Le piège à éviter : un seul numéro partout

Ne pas imposer **`1.0.12` identique** sur mobile, frontend et chaque microservice.

| Approche | Problème |
|----------|----------|
| Une version globale unique | Un fix `contact-service` force un bump mobile → incohérent |
| Ignorer les versions composants | Impossible rollback ciblé Portainer (« remettre auth-service à la version d’hier ») |
| Copier la version mobile sur l’API | Cycles de vie différents (OTA Samsung vs compose VPS) |

**Règle** : distinguer **3 niveaux** de version (voir §3).

---

## 3. Modèle recommandé — trois niveaux

### Niveau A — Release plateforme (JobbingTrack)

**Nom** : `platformRelease` — ex. **`JT-1.0.0`**, **`JT-1.1.0`**

- C’est la version **métier / porteur** : « ensemble fonctionnel validé ».
- **Ne change pas** à chaque commit.
- Sert au **communication**, aux **notes de release globales**, au **tag Git optionnel** (`platform-v1.0.0`).
- **Ne remplace pas** les versions composants.

**Quand bump ?**

- Première baseline prod validée → **`JT-1.0.0`** (où vous en êtes aujourd’hui « fonctionnel partout »).
- Lot de features validé porteur → **`JT-1.1.0`**.
- Rupture majeure → **`JT-2.0.0`**.

### Niveau B — Version par composant (artefact)

Chaque **brique déployable** a son **semver indépendant** :

| Composant (id) | Exemple version | Image Docker (exemple tag) |
|----------------|-----------------|---------------------------|
| `frontend` | `1.0.3` | `jobbingtrack-frontend:1.0.3` |
| `api-gateway` | `1.0.5` | `jobbingtrack-api-gateway:1.0.5` |
| `auth-service` | `1.0.2` | `jobbingtrack-auth-service:1.0.2` |
| `application-service` | `1.0.4` | `jobbingtrack-application-service:1.0.4` |
| … | … | … |
| `metrics-aggregator` | `1.0.1` | `jobbingtrack-metrics-aggregator:1.0.1` |
| `mobile-android` | `1.0.12+12` | APK / OTA (pas la même logique Docker) |

**Quand bump le composant ?**

- **PATCH** (`1.0.4` → `1.0.5`) : fix bug **dans ce service uniquement**, API compatible.
- **MINOR** (`1.0.x` → `1.1.0`) : nouvelle capability **du service**, rétrocompatible.
- **MAJOR** (`1.x` → `2.0.0`) : rupture contrat API ou schéma DB.

**Règle gateway** : si une route proxy, un contrat OpenAPI partagé ou un middleware change → bump **`api-gateway`** en plus du service métier touché.

### Niveau C — Build / immuable (technique)

Pour **chaque build Docker** (ou APK) :

```
<semver-composant>-<build>+<gitShaCourt>
```

Exemples :

- `jobbingtrack-application-service:1.0.4+20260707.a1b2c3d`
- Mobile : déjà **`1.0.12+12`** (politique JobbingTrack mobile)

Portainer / compose prod pin **le tag immuable** (niveau C), pas seulement `1.0.4` flottant.

---

## 4. Manifeste de release (source de vérité déploiement)

Fichier versionné (proposition) : **`deploy/releases/platform-manifest.yaml`**

```yaml
# Release plateforme validée porteur
platformRelease: JT-1.0.0
releasedAt: "2026-07-07T12:00:00Z"
gitCommit: a1b2c3d4e5f6
environment: production

components:
  frontend:
    version: "1.0.1"
    image: ghcr.io/org/jobbingtrack-frontend:1.0.1+20260707.a1b2c3d
  api-gateway:
    version: "1.0.1"
    image: ghcr.io/org/jobbingtrack-api-gateway:1.0.1+20260707.a1b2c3d
  auth-service:
    version: "1.0.1"
    image: ghcr.io/org/jobbingtrack-auth-service:1.0.1+20260707.a1b2c3d
  application-service:
    version: "1.0.1"
    image: ghcr.io/org/jobbingtrack-application-service:1.0.1+20260707.a1b2c3d
  # … tous les services du stack prod …
  metrics-aggregator:
    version: "1.0.1"
    image: ghcr.io/org/jobbingtrack-metrics-aggregator:1.0.1+20260707.a1b2c3d

mobile:
  android:
    version: "1.0.12"
    buildNumber: 12
    channel: production   # OTA séparé — voir mobile releases

notes: |
  JT-1.0.0 — baseline fonctionnelle porteur (mobile étape 2 partielle, OTA dev).
```

**Workflow Portainer (cible)** :

1. CI ou script maison **build + push** les images taguées niveau C.
2. Génère / met à jour le **manifeste** (niveau A + B + tags).
3. **`deployment-service`** enregistre le manifeste en BDD (modèle `Deployment` existant).
4. Script **met à jour la stack Portainer** (compose avec tags pinnés) — pas `:latest`.
5. Backoffice affiche : « Plateforme **JT-1.0.0** — frontend **1.0.1**, application-service **1.0.1**, … ».

---

## 5. Matrice « que bump quand ? » (rayon d’impact)

| Changement | Composants à versionner / redéployer | Release plateforme `JT-x` ? |
|------------|--------------------------------------|----------------------------|
| Fix bug dans `application-service` seul | `application-service` (+ `api-gateway` si route/proxy modifié) | Non (patch composant) |
| Fix UI backoffice seul | `frontend` | Non |
| Changement schéma Prisma partagé | Tous les services qui consomment le schéma + migrations coordonnées | **Oui** (minor ou major plateforme) |
| Fix `metrics-aggregator` + pages Performances | `metrics-aggregator`, parfois `frontend` (si contrat API metrics change) | Non sauf validation porteur « release notes » |
| Nouvelle route gateway + service | Service métier + `api-gateway` | Non |
| Validation porteur « tout est OK prod » | Manifeste complet (snapshot de tous les tags) | **Oui** — ex. `JT-1.0.0` → `JT-1.0.1` |
| Release mobile Samsung | **`mobile-android` uniquement** (OTA) | Optionnel (note dans manifeste mobile) |

**Observabilité / monitoring** : impact **visuel backoffice** (Performances, Conteneurs, Services & Logs) mais **pas** les API métier candidatures → bump **`metrics-aggregator`** (+ **`frontend`** si changement d’API proxy), pas les 14 microservices métier.

---

## 6. Exemples concrets

### Exemple 1 — Fix candidature (`application-service`)

1. Dev corrige bug → bump `application-service` `1.0.1` → `1.0.2`.
2. Vérifie si `api-gateway` a changé → non → gateway reste `1.0.1`.
3. Build images → push tags immuables.
4. Portainer : **rolling update** uniquement `application-service`.
5. `platformRelease` reste **`JT-1.0.0`** ; manifeste enregistre « patch applicatif ».

### Exemple 2 — Baseline « fonctionnel partout » (aujourd’hui)

1. Porteur valide stack local + OTA partiel.
2. Équipe fige **un manifeste** avec toutes les versions actuelles (même si certaines restent `1.0.1`).
3. Tag **`JT-1.0.0`** + déploiement Portainer prod avec **tous** les tags pinnés.
4. Mobile prod OTA peut rester sur build **5** pendant que dev est sur **12** — **normal**.

### Exemple 3 — Mise à jour monitoring seule

1. Fix agrégateur métriques → `metrics-aggregator` `1.0.1` → `1.0.2`.
2. Si endpoint `/api/metrics-aggregator/*` change → bump `frontend` si le proxy Next consomme le nouveau contrat.
3. **Aucun** redeploy `auth-service`, `application-service`, etc.

---

## 7. Mobile vs stack VPS — versions volontairement différentes

| | Stack Docker (VPS) | Mobile Android |
|--|-------------------|----------------|
| Canaux | dev / staging / **production** (compose) | dev / **production** (OTA) |
| Numéro visible | Composants + `JT-x.y.z` | **`1.0.N`** (3e segment = build) |
| Déploiement | Portainer + images | Backoffice releases + OTA |
| Alignement | **Pas obligatoire** même jour | Promote dev → prod quand prêt |

Une **`JT-1.0.0`** plateforme peut coexister avec mobile **`1.0.12`** en dev et **`1.0.5`** en prod OTA.

---

## 8. Rôle de `deployment-service` (cible)

Aujourd’hui : journal + analytics. **Cible** :

| Fonction | Données |
|----------|---------|
| Catalogue briques | id, label, semver courant, image tag, env |
| Enregistrer release | Copie du manifeste + auteur + statut |
| Déclencher deploy | Script SSH / API Portainer / webhook maison |
| Rollback | Repointe vers manifeste **N-1** (tags immuables conservés au registry) |
| UI backoffice | « Plateforme JT-1.0.0 », détail par service, bouton deploy ciblé |

**Ne pas** confondre avec **mobile OTA** (`mobileReleaseStore`) — deux pipelines, une page Administration peut **lier** les deux visuellement.

---

## 9. Portainer — bonnes pratiques

1. **Jamais `:latest` en prod** — tag semver + build + git SHA.
2. **Stack = composition du manifeste** — une stack `jobbingtrack-prod` référence le fichier manifeste du commit déployé.
3. **Update partiel** : Portainer permet de recréer **un seul service** si compose utilise tags explicites.
4. **Registre** : GHCR, Docker Hub, ou registry VPS — le manifeste stocke l’URL complète.
5. **Secrets** : hors Git ; Portainer env / `.env` prod — le manifeste ne contient que des **références**.

---

## 10. Alternatives (pour comparaison par une autre IA)

| Stratégie | Idée | Pour JobbingTrack |
|-----------|------|-------------------|
| **A. Manifeste + semver composant** (recommandé ci-dessus) | Flexible, rollback ciblé | ✅ Aligné monorepo + Portainer + mobile séparé |
| **B. CalVer plateforme** (`JT-2026.07.07`) | Date = release | Lisible ops ; semver composants quand même nécessaire |
| **C. Version unique monorepo** (`1.0.12` partout) | Un bump global | ❌ Trop rigide (14+ services + mobile) |
| **D. Git SHA seul** | Tag = commit | ✅ En complément niveau C ; ❌ seul, illisible porteur |
| **E. Helm / K8s** | Charts avec subcharts versionnés | Overkill si stack reste Compose + Portainer |

**Recommandation** : **A + D** — semver par composant + tag immuable git ; **`JT-x.y.z`** pour milestones porteur.

---

## 11. Plan d’implémentation progressif (sans bloquer mobile)

| Phase | Action | Effort |
|-------|--------|--------|
| **C0** (now) | Documenter politique (ce fichier) ; figer **`JT-1.0.0`** baseline manuelle | Faible |
| **C1** | Ajouter `deploy/releases/platform-manifest.yaml` + script `generate-manifest-from-compose.sh` | Moyen |
| **C2** | CI : build → tag immuable → push registry | Moyen |
| **C3** | `deployment-service` : API POST manifeste + historique | Moyen |
| **C4** | Intégration Portainer (API stack update ou webhook maison) | Élevé |
| **C5** | UI backoffice « Déployer brique X » | Élevé |

Mobile OTA reste sur **`/backoffice/mobile/releases`** (déjà en place).

---

## 12. Questions ouvertes (à trancher avec le porteur)

1. **Registry** : GHCR, Docker Hub privé, ou registry sur le VPS ?
2. **Nommage `JT-1.0.0`** vs `JobbingTrack 1.0.0` vs semver simple `1.0.0` plateforme ?
3. **Bump automatique** composant au merge `dev` → `main`, ou **manuel** depuis backoffice ?
4. **Schéma Prisma partagé** : politique de migration — une version **`prisma-schema`** dans le manifeste ?
5. **Rust collectors** : même semver que Node ou préfixe (`metrics-aggregator-rs-1.0.0`) ?

---

## 13. Résumé une phrase

> **JobbingTrack** a une **release plateforme** (`JT-x.y.z`) pour les jalons porteur, des **versions semver indépendantes par conteneur**, des **tags Docker immuables** pour Portainer, et un **pipeline mobile OTA séparé** — le manifeste de release lie le tout au moment du déploiement.

---

*Document rédigé pour être copié tel quel comme contexte à une IA externe proposant des variantes d’architecture.*
