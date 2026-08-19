# Actions porteur — déploiement VPS & releases mobile

Dernière mise à jour : 2 juillet 2026

## Rôle

**Checklist unique** : ce que **vous** (porteur) devez faire, dans l’ordre, pour passer de la préparation Git à une préprod fonctionnelle avec push mobile depuis le backoffice.

> **Bloquant produit actuel** : validation mobile **étape 2** (`TODOS_A_VALIDER.md` ligne 320) reste prioritaire. Le déploiement VPS peut avancer **en parallèle** sur la branche `feat/deploy-portainer-production`.

---

## Étape 0 — Avant le VPS (local ou merge)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 0.1 | Merger ou déployer la branche | `feat/deploy-portainer-production` → `dev` (PR) **ou** Portainer sur `refs/heads/feat/deploy-portainer-production` pour test | [ ] |
| 0.2 | Générer secrets | `bash scripts/deploy/generate-portainer-env.sh --admin-email admin@delhomme.ovh` | [ ] |

**Fichiers livrés (agent)** : `deploy/production/`, `docs/production/PORTAINER_STACK.md`, backoffice `/backoffice/administration/mobile-releases`.

---

## Étape 1 — Stack Portainer (VPS)

| # | Action | Valeur exacte | Statut |
|---|--------|---------------|--------|
| 1.1 | Portainer → **Stacks → Add stack** | Name : `jobbingtrack` | [ ] |
| 1.2 | Git repository | `https://github.com/PavelDelhomme/JobbingTrack.git` | [ ] |
| 1.3 | Repository reference | `refs/heads/feat/deploy-portainer-production` *(puis `refs/heads/dev` après merge)* | [ ] |
| 1.4 | Compose path | `deploy/production/docker-compose.yml` | [ ] |
| 1.5 | Authentication | Token GitHub si dépôt privé | [ ] |
| 1.6 | Variables stack | Copier **`deploy/production/.env.example`** → mode Advanced ; remplacer secrets et domaines | [ ] |
| 1.7 | Premier deploy | `IMAGE_PULL_POLICY=build` (build sur VPS, long la 1ère fois) | [ ] |
| 1.8 | Vérifier conteneurs | `docker ps \| grep jobbingtrack` — tous healthy | [ ] |

**Domaines à adapter** (exemple) :

- `NEXT_PUBLIC_API_URL=https://api.jobbingtrack.delhomme.ovh`
- `NEXT_PUBLIC_FRONTEND_URL=https://jobbingtrack.delhomme.ovh`
- `ALLOWED_ORIGINS=https://jobbingtrack.delhomme.ovh,https://api.jobbingtrack.delhomme.ovh`

**Générer secrets** : `openssl rand -hex 32` (JWT, Redis, Postgres, etc.)

Guide détaillé : [`deploy/production/PREMIER_DEPLOIEMENT.md`](../../deploy/production/PREMIER_DEPLOIEMENT.md)

---

## Étape 2 — Nginx Proxy Manager (HTTPS)

| # | Action | Forward | Statut |
|---|--------|---------|--------|
| 2.1 | Proxy host API | `api.jobbingtrack.delhomme.ovh` → `http://127.0.0.1:3000` | [ ] |
| 2.2 | Proxy host Web | `jobbingtrack.delhomme.ovh` → `http://127.0.0.1:3001` | [ ] |
| 2.3 | SSL | Let's Encrypt + **Force SSL** sur les deux hosts | [ ] |
| 2.4 | Test navigateur | `https://jobbingtrack.delhomme.ovh` → login backoffice | [ ] |
| 2.5 | Test API | `curl https://api.jobbingtrack.delhomme.ovh/health` → OK | [ ] |

---

## Étape 3 — Backoffice : releases mobile OTA

Page : **`/backoffice/administration/mobile-releases`** (menu Administration → **Mobile — releases OTA**)

| # | Action | Résultat attendu | Statut |
|---|--------|------------------|--------|
| 3.1 | Builder APK pointé vers prod | `export API_BASE_URL=https://api.jobbingtrack.delhomme.ovh` puis `bash scripts/mobile/setup/build-apk-release.sh` | [ ] |
| 3.2 | **Publier en DEV** | Upload APK + version + build + notes dans le backoffice | [ ] |
| 3.3 | Installer APK debug Samsung | Canal **dev** auto (build debug) ; au lancement → proposition mise à jour si version dev > locale | [ ] |
| 3.4 | Tester parcours métier | Login, navigation, FAB — cohérent avec étape 2 mobile | [ ] |
| 3.5 | **Valider → passer en PRODUCTION** | Bouton backoffice ; canal prod mis à jour | [ ] |
| 3.6 | (Optionnel) Mise à jour obligatoire | Cocher **Mise à jour obligatoire** sur canal prod | [ ] |

**Canaux** :

| App | Canal API |
|-----|-----------|
| APK **debug** (Samsung tests) | `dev` |
| APK **release** (utilisateurs) | `production` |

Doc : [`MOBILE_RELEASE_PIPELINE.md`](MOBILE_RELEASE_PIPELINE.md)

---

## Étape 4 — CI/CD (après 1er succès manuel)

| # | Action | Statut |
|---|--------|--------|
| 4.1 | GitHub → Secrets → `DEV_DEPLOY_URL` | URL webhook Portainer (stack dev) | [ ] |
| 4.2 | Portainer : `IMAGE_PULL_POLICY=always`, ref `refs/heads/dev` | [ ] |
| 4.3 | Push `dev` → workflow `build-push-images.yml` pousse GHCR | [ ] |
| 4.4 | (Prod) Secret `PROD_DEPLOY_URL` + ref `refs/heads/main` | [ ] |

---

## Étape 5 — Gate préprod (avant ouverture publique)

| # | Action | Fichier |
|---|--------|---------|
| 5.1 | Clôturer mobile étapes 1→5 | `TODOS_A_VALIDER.md` |
| 5.2 | SMTP `@jobbingtrack.com` réel | `docs/emails/OVH_MX_PLAN_JOBBINGTRACK.md` |
| 5.3 | Gate 9 étapes préprod | `A_VALIDER_AVANT_PRODUCTION.md` |
| 5.4 | Cocher lignes dans | `DEPLOIEMENT_PRODUCTION.md` |

---

## Dépannage rapide

| Symptôme | Piste |
|----------|--------|
| CORS / Network Error | `ALLOWED_ORIGINS` = URLs HTTPS exactes NPM |
| Build Portainer trop long | Passer à GHCR + `IMAGE_PULL_POLICY=always` |
| APK 404 | `docker exec jobbingtrack-api-gateway ls /app/mobile-releases` |
| Page releases absente | Rebuild frontend + api-gateway sur la branche deploy |
| Install Android refusée | Autoriser installs sources inconnues |

---

## Liens

| Document | Contenu |
|----------|---------|
| [`PORTAINER_STACK.md`](PORTAINER_STACK.md) | Référence technique stack |
| [`DEPLOIEMENT_PRODUCTION.md`](DEPLOIEMENT_PRODUCTION.md) | Suivi statut déploiement |
| [`TODOS_A_VALIDER.md`](../pilotage/TODOS_A_VALIDER.md) § Phase C | Validation porteur officielle |
| [`TODOS_A_VERIFIER.md`](../pilotage/TODOS_A_VERIFIER.md) § Phase C | Preuves agent |
