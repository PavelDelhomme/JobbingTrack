# Configuration stricte des variables d’environnement

## Objectif

Éviter les **valeurs par défaut silencieuses** dans le code et dans Docker Compose pour les paramètres critiques : si une variable attendue est absente, vide ou porte la sentinelle réservée, le démarrage **échoue** avec un message exploitable en développement.

## Sentinelle globale

| Valeur | Signification |
|--------|----------------|
| `__JT_ENV_INCOMPLETE__` | « Non configuré » explicite dans un template ; **interdite** en runtime. |

- Référence code : `config/jt-env-policy.cjs` (`JT_ENV_INCOMPLETE`, `requireEnv`, `isIncomplete`).
- Validation `.env` : `scripts/env/env-validate-runtime.cjs` rejette les clés obligatoires vides ou égales à la sentinelle.
- **API Gateway** : au chargement de `src/server.js`, `src/bootstrap/strictGatewayEnv.js` vérifie les variables critiques (sauf si `NODE_ENV=test` ou `JT_SKIP_STRICT_ENV=1`).
- **Auth-service** : au chargement de `src/server.js`, `src/bootstrap/strictAuthEnv.js` applique la même politique pour les secrets / URLs d’auth (mêmes exceptions test / `JT_SKIP_STRICT_ENV`).

## Outillage env / bypass tests (non-prod)

Tout ce qui touche à **`DEV_TEST_BYPASS_TOKEN`** et à l’en-tête **`X-JobbingTrack-Dev-Test-Token`** vit sous **`scripts/env/`** (même famille que `env-set-key.cjs`, `env-generate-secrets.cjs`, etc.) :

| Fichier | Rôle |
|---------|------|
| `config/dev-test-bypass-format.cjs` | Règle de format du jeton (`jtbypass1-…`). |
| `scripts/env/dev-test-bypass-fetch.cjs` | Résolution du jeton pour scripts **Node** (`devTestBypassFetchHeaders`). |
| `scripts/env/dev-test-bypass-curl.inc.sh` | Fragment **bash** à sourcer (`jt_refresh_dev_bypass_curl_args`). |

Index : **`scripts/env/README.md`**.

## Docker Compose

Pour le service **`api-gateway`**, les substitutions du type `${VAR:?message}` font échouer `docker compose config` / `up` si la clé n’est pas définie dans l’environnement ou dans le fichier `.env` chargé par Compose.

Pour le service **`auth-service`** (profils `auth` / `full`), le bloc `environment` utilise la même convention **`${VAR:?…}`** pour les variables critiques (admin, JWT, CORS, URLs, SMTP de base, etc.) ; **`REDIS_URL`** utilise **`REDIS_HOST`** + **`REDIS_INTERNAL_PORT`** (port conteneur Redis, pas le port publié hôte).

En **développement Docker**, seuls `src/` (et parfois `package.json`) sont bind-mountés sous `/app/src` : le fichier racine **`config/jt-env-policy.cjs`** n’y est pas visible avec un chemin relatif « monorepo ». Compose monte donc **`./config` → `/app/config`** pour **`api-gateway`** et **`auth-service`** ; le code charge la politique via **`src/utils/requireJtEnvPolicy.js`** (`/app/config` si présent, sinon chemin monorepo).

## Désactivation ciblée (tests / CI minimal)

| Variable | Effet |
|----------|--------|
| `NODE_ENV=test` | Saut des assertions strictes au boot gateway (Jest). |
| `JT_SKIP_STRICT_ENV=1` | Même effet pour diagnostics ponctuels (à retirer ensuite). |

## Déploiement progressif

Le reste du monorepo (autres microservices, frontend, overrides `:-` dans les autres blocs Compose) est listé dans **`docs/TODOS.md`** (chantier « env stricte ») : même sentinelle et mêmes règles à appliquer par service pour supprimer les derniers fallbacks.
