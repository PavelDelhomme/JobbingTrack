# Compatibilité multi-versions et mises à jour (npm, Node, déploiement)

Dernière mise à jour : **7 juillet 2026**

Documents liés : [`CONVENTION_VERSION_OFFICIELLE.md`](CONVENTION_VERSION_OFFICIELLE.md), [`VERSIONNEMENT_PLATEFORME.md`](VERSIONNEMENT_PLATEFORME.md)

---

## 1. Problème à éviter (« le bordel »)

Symptômes observés (ex. logs `jobbingtrack-api-gateway`) :

```text
added 6 packages, removed 492 packages…
npm notice New minor version of npm available! 11.6.4 -> 11.18.0
```

**Causes fréquentes :**

| Cause | Où | Risque |
|-------|-----|--------|
| `npm install` à **chaque démarrage** de conteneur | `docker-entrypoint.sh` (dev) | Versions différentes selon le jour ; lent ; notices npm |
| Mise à jour **manuelle** dans le conteneur (`docker exec npm update`) | prod | Perdue au redeploy ; non reproductible |
| Mobile / backoffice **plus récent** que l’API prod | déploiements désynchronisés | Erreurs 404 ou champs manquants |
| Bump **major** API sans période de grâce | release mal coordonnée | Utilisateurs sur ancienne app bloqués |

**Règle** : les mises à jour outillage (npm, Node, dépendances) passent par **build d’image + manifeste + deploy Portainer** — pas par commandes ad hoc en prod.

---

## 2. Politique : l’utilisateur sur une **ancienne version** doit continuer à fonctionner

### Principe

Tant qu’il n’y a pas de **rupture major** annoncée, un client (mobile, backoffice, intégration) **plus ancien** doit pouvoir utiliser l’API **sans perte des fonctions qu’il avait déjà**.

| Client | Mécanisme JobbingTrack |
|--------|------------------------|
| **Mobile Android** | OTA `minVersion` / `minBuild` + comparaison semver ; **pas** de force-update sauf `forceUpdate: true` explicite |
| **Backoffice web** | Déployé avec l’API de la **même release plateforme** `JT-x.y.z` en prod ; en local, dev peut être en avance |
| **API publique future** | `GET /api/v1/public/release-info` — semver minimal, pas de secrets |

### Fenêtre de compatibilité (à respecter)

| Type de changement API | Version composant | Clients anciens |
|------------------------|-------------------|-----------------|
| Ajout champ JSON **optionnel** | **Patch** ou **minor** | OK |
| Nouveau endpoint | **Minor** | OK (anciens clients ne l’appellent pas) |
| Suppression champ / changement sémantique | **Major** | **Non** — exiger MAJ mobile + bandeau OTA |
| Schéma Prisma breaking | **Major** plateforme | Migration coordonnée ; min mobile si besoin |

**Exemple** : mobile en `1.0.10` et API gateway `1.0.12` → **OK** si routes et payloads inchangés pour les écrans que `1.0.10` utilise.

**Contre-exemple** : suppression d’un champ requis → bump **major** `application-service` + `minBuild` OTA + notes release.

### Ce qu’on ne promet pas

- Indéfiniment **toutes** les builds mobile sur **toutes** les API (ex. mobile `1.0.3` vs prod API `1.2.0` après 6 mois).
- Support de **deux majors** API en parallèle sans versioning d’URL (`/api/v2/`) — **hors scope** sauf décision produit ; jusqu’alors : **minor/patch rétrocompatibles** + OTA incitative.

---

## 3. Mises à jour npm / Node — comment les faciliter (sans terminal obligatoire)

### Niveaux

| Niveau | Quoi | Comment (cible) | Aujourd’hui |
|--------|------|-----------------|-------------|
| **Runtime Node** | `node:20.x` dans Dockerfiles | Bump image de base → rebuild **toutes** images → manifeste `JT-x.y.z` | Manuel Dockerfile |
| **npm CLI** | `npm install -g npm@…` dans Dockerfile | Même pipeline rebuild | Pin `11.6.4` dans Dockerfiles |
| **Dépendances projet** | `package.json` / lockfiles | Script **`scripts/deps/bump-dependencies.sh`** (à créer) + CI | Terminal / `npm update` local |
| **Audit sécurité** | CVE | `npm audit` + workflow existant ; gate avant deploy prod | Partiel |

### Pipeline cible (backoffice / script / Portainer)

```text
1. Porteur ou agent lance « Vérifier mises à jour » (backoffice ou script)
2. Rapport : npm outdated, Node LTS, CVE (sans appliquer seul en prod)
3. Bump contrôlé → branche → tests (type-check, Jest, smokes)
4. Rebuild images tags immuables
5. Deploy préprod → validation → prod
6. Entrée deployment-service + manifeste JT
```

**Interdit en prod** : `docker exec … npm install -g npm@latest` ou `npm update` dans le conteneur running.

### Dev local vs prod

| Mode | `npm install` au start conteneur |
|------|----------------------------------|
| **Dev** (`docker compose`, volumes `src` + `package.json`) | **Autorisé** — sync deps quand `package.json` change (`docker-entrypoint.sh`) |
| **Prod / préprod** (image figée) | **Interdit** — deps dans l’image au **build** ; `JT_SKIP_ENTRYPOINT_NPM_INSTALL=1` ou `NODE_ENV=production` |

Cela évite les logs `npm notice` et les drift à chaque restart.

---

## 4. Où noter les versions outillage (source de vérité future)

À intégrer dans **`deploy/releases/platform-manifest.yaml`** (manifeste) :

```yaml
toolchain:
  node: "20.18.0"
  npm: "11.6.4"
  flutter: "3.x.x"   # mobile build
components:
  api-gateway:
    version: "1.0.1"
    image: "…"
```

Permet au backoffice d’afficher : « Prod tourne Node 20.18 ; npm 11.6.4 ; une mise à jour npm 11.18 est disponible » **sans** l’appliquer automatiquement.

---

## 5. Backlog implémentation (ordre)

| ID | Tâche | Priorité |
|----|-------|----------|
| **BL-DEP-01** | Manifeste `JT-1.0.0` + section `toolchain` | P0 | ✅ **07/07** |
| **BL-DEP-02** | Script `audit-toolchain.sh` (node, npm, outdated par service) | P1 | ✅ **07/07** |
| **BL-DEP-03** | Script bump deps + rebuild images (CI ou local) | P1 | ✅ partiel — `bump-component-version.sh` ; rebuild CI ⏳ |
| **BL-DEP-04** | Backoffice : carte « Mises à jour disponibles » (lecture seule puis action) | P2 | ⏳ |
| **BL-DEP-05** | `GET /api/v1/public/release-info` + politique min mobile | P1 | ✅ **07/07** |
| **BL-DEP-06** | Doc breaking change : checklist avant major | P1 | ✅ **07/07** — [`BREAKING_CHANGE_CHECKLIST.md`](BREAKING_CHANGE_CHECKLIST.md) |

Référencé dans [`docs/pilotage/TODOS.md`](../pilotage/TODOS.md) § Phase C déploiement.

---

## 6. Checklist avant de casser les anciens clients

- [ ] Changement **additive** seulement → patch/minor composant
- [ ] Tests smokes / mobile sur **build N-1** contre API candidate
- [ ] OTA : `minBuild` relevé seulement si **vraiment** nécessaire
- [ ] Notes release porteur + email si force-update
- [ ] Rollback manifeste N-1 prêt (tags immuables)

---

*Objectif solo porteur : mettre à jour sans terminal expert, sans bloquer ceux qui n’ont pas encore mis à jour l’app.*
