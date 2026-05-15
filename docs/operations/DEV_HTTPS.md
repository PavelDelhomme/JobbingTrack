# HTTPS Local De Développement

Le développement local peut tourner en HTTPS avec une CA locale de confiance, pour éviter les erreurs navigateur et les problèmes de mixed content.

## URLs

| Surface | URL HTTPS |
| --- | --- |
| Frontend | `https://jobbingtrack.localhost:5443` |
| API Gateway | `https://api.jobbingtrack.localhost:5443` |

Les appels internes Docker restent en HTTP privé (`frontend:3000`, `api-gateway:3000`). Le TLS est terminé par le proxy dev `dev-https-proxy`.

## Commandes

```bash
# make up-full démarre aussi le proxy HTTPS (5443) par défaut — voir « Démarrage complet »
make dev-https-install-ca
make dev-https-up
make dev-https-status
make dev-https-down
```

`make dev-https-install-ca` génère les certificats dans `.local/dev-certs/`, installe d’abord la CA dans le **magasin système** (`trust` avec `sudo -n` si possible ; sinon le script affiche `sudo trust anchor --store …` à exécuter une fois pour Chrome/Chromium), puis dans **NSS** (`~/.pki/nssdb`, profils Firefox). Si `mkcert` est installé, il est utilisé en priorité pour la génération.

## Connexion Backoffice Locale

1. **`make up-full`** — démarre la stack **et** le proxy HTTPS dev (sauf `UP_FULL_HTTPS=0`).
2. **Une fois par machine** (navigateur / OS) : **`make dev-https-install-ca`** pour faire confiance à la CA locale (sinon avertissement TLS malgré le proxy actif).
3. Ouvrir **`https://jobbingtrack.localhost:5443/login`** (schéma TLS aligné avec les `NEXT_PUBLIC_*` du `.env` d’exemple).

Vous pouvez aussi utiliser **`http://localhost:5003`** sans TLS ; ce n’est pas la même origine que l’URL HTTPS ci‑dessus.

Attention au nom exact : `jobbingtrack.localhost` contient `track`. Une URL comme `https://jobbingtrck.localhost:5443/login` est une faute de frappe ; elle peut résoudre localement, mais elle n'est pas couverte par le certificat et le navigateur doit l'afficher comme non sécurisée.

4. Se connecter avec les valeurs locales `ADMIN_EMAIL` et `ADMIN_PASSWORD` du `.env`, sans les copier dans un ticket, un commit, un log ou une capture.

Après connexion, le frontend doit appeler l'API via :

```text
https://api.jobbingtrack.localhost:5443
```

Validation porteur du 13/05/2026 : le login via `https://jobbingtrack.localhost:5443/login` fonctionne après installation de la CA locale. Si le navigateur était déjà ouvert avant l'installation de la CA, le fermer puis le rouvrir avant de conclure à un bug applicatif.

Correctif du 14/05/2026 : la CA OpenSSL locale générée sans `mkcert` porte explicitement `basicConstraints=CA:true` et `keyUsage=keyCertSign,cRLSign`. Après ce correctif, régénérer avec `FORCE=1 DEV_HTTPS_INSTALL_CA=1 bash scripts/ops/dev-https-certs.sh`, puis redémarrer `dev-https-proxy` pour servir le nouveau certificat. Validation stricte : login API HTTPS `200` et profil HTTPS `200` avec le rôle `SUPER_ADMIN`.

## Démarrage complet : `make up-full`

Par défaut, **`make up-full`** (et **`make start`**) enchaîne :

1. toute la stack sur les ports **HTTP** (`http://localhost:5003`, `http://localhost:5002`, …) ;
2. génération des certificats si besoin + **`make dev-https-up`** → proxy **`dev-https-proxy`** sur **`5443`**.

Pour **ne pas** démarrer le proxy TLS (CI, machine sans OpenSSL, etc.) : **`UP_FULL_HTTPS=0 make up-full`**.

La **confiance navigateur** (CA locale) reste une étape séparée la première fois : **`make dev-https-install-ca`** (voir ci‑dessous). Sans cela, `https://jobbingtrack.localhost:5443` peut afficher `ERR_CERT_AUTHORITY_INVALID` même si le proxy tourne.

### Parcours manuel (équivalent à ce que fait `up-full` pour TLS)

Si vous n’utilisez pas `up-full` ou avez désactivé le proxy :

1. **`make dev-https-install-ca`** (équivalent : `DEV_HTTPS_INSTALL_CA=1 bash scripts/ops/dev-https-certs.sh`) — installe la CA (système + NSS quand c’est possible).
2. **`make dev-https-up`** — démarre uniquement le proxy sur le port **`5443`**.
3. Ouvrir **`https://jobbingtrack.localhost:5443/login`**.

Vérification rapide : **`make dev-https-status`**.

Après **`make dev-https-install-ca`**, si la commande suivante affiche **200** (sans `--cacert`), la chaîne TLS et la CA **système** sont correctes ; un navigateur qui affiche encore `ERR_CERT_AUTHORITY_INVALID` utilise souvent un **magasin séparé** (Flatpak/Snap) — voir « Diagnostic navigateur ».

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://jobbingtrack.localhost:5443/login
```

## Chrome / Chromium sous Linux (`ERR_CERT_AUTHORITY_INVALID`)

Sur beaucoup de distributions, **Chrome et Chromium** s’appuient sur le **magasin de certificats du système**. Le script tente d’abord `sudo -n trust anchor --store …` : si cela réussit, Chrome accepte le site sans étape manuelle. Si le script affiche la commande avec `sudo trust anchor` (sans `-n`), exécutez-la une fois dans un terminal, puis fermez tout Chrome et rouvrez l’URL.

Si vous ne pouvez pas utiliser `sudo`, importez le PEM dans Chrome (**Autorités**), comme ci-dessous.

**Option A — import manuel dans Chrome (sans sudo)**

1. Fichier CA : `.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem`
2. Chrome : **Paramètres** → **Confidentialité et sécurité** → **Sécurité** → **Gérer les certificats** → onglet **Autorités** → **Importer** → choisir le `.pem` → cocher **Confier à cette CA pour identifier les sites web** si proposé.
3. Fermer **toutes** les fenêtres Chrome, rouvrir, puis retester `https://jobbingtrack.localhost:5443`.

**Option B — magasin système (sudo, recommandé si vous préférez une fois pour toutes)**

- Arch / `trust` : `sudo trust anchor --store .local/dev-certs/ca/jobbingtrack-dev-root-ca.pem` puis redémarrer le navigateur.
- Debian/Ubuntu : copier la CA sous `/usr/local/share/ca-certificates/` avec l’extension **`.crt`**, puis `sudo update-ca-certificates`, puis redémarrer Chrome.

**Option C — `mkcert`**

Si `mkcert` est installé, le script l’utilise en priorité : `mkcert -install` installe généralement une CA reconnue par Chrome. Voir la section « Commandes » ci-dessus (`make dev-https-install-ca`).

**Option D — tout repasser par `mkcert` (si OpenSSL + navigateur restent bloqués)**

1. Installer `mkcert` (ex. Arch : `sudo pacman -S mkcert`).
2. `mkcert -install` (une fois par machine).
3. `FORCE=1 bash scripts/ops/dev-https-certs.sh` puis **`make dev-https-up`** (régénère les PEM avec la CA mkcert).
4. Fermer tout le navigateur et rouvrir `https://jobbingtrack.localhost:5443/login`.

## Variables

Les variables publiques du frontend doivent rester en HTTPS :

```env
DEV_HTTPS_PORT=5443
DEV_HTTPS_FRONTEND_URL=https://jobbingtrack.localhost:5443
DEV_HTTPS_API_URL=https://api.jobbingtrack.localhost:5443
NEXT_PUBLIC_FRONTEND_URL=https://jobbingtrack.localhost:5443
NEXT_PUBLIC_API_URL=https://api.jobbingtrack.localhost:5443
NEXT_PUBLIC_API_GATEWAY_URL=https://api.jobbingtrack.localhost:5443
NEXT_PUBLIC_AUTH_SERVICE_URL=https://api.jobbingtrack.localhost:5443
ALLOWED_ORIGINS=https://jobbingtrack.localhost:5443,https://api.jobbingtrack.localhost:5443
```

`localhost` HTTP peut rester en fin de liste pour certains scripts hôte, mais le navigateur/backoffice doit utiliser les URLs HTTPS ci-dessus.

## Certificats

Les fichiers générés ne sont pas versionnés :

```text
.local/dev-certs/jobbingtrack-dev.pem
.local/dev-certs/jobbingtrack-dev-fullchain.pem   ← feuille + CA (servi par Nginx)
.local/dev-certs/jobbingtrack-dev-key.pem
.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem
```

Après **`make dev-https-install-ca`**, si `sudo trust anchor` a réussi, le script tente aussi **`trust extract-compat`** (bundles `/etc/ssl/certs` pour les clients qui ne lisent que ce chemin). **Redémarrez** ensuite **`dev-https-proxy`** pour que Nginx charge le **`fullchain`**.

Le certificat feuille contient les SAN `jobbingtrack.localhost`, `api.jobbingtrack.localhost`, `localhost`, `127.0.0.1` et `::1`.

## Diagnostic navigateur

### « Connexion non privée » alors que le lecteur de certificat affiche CN, dates et empreintes

C’est **normal** : le navigateur montre toujours la **chaîne** (certificat feuille + CA) quand vous ouvrez les détails TLS, **même** si la session est refusée (`ERR_CERT_AUTHORITY_INVALID`, avertissement « non privé »). Tant que la racine **`JobbingTrack Local Dev Root CA`** n’est pas dans un **magasin de confiance** utilisé par *ce* navigateur (système `trust`, NSS, ou import manuel « Autorités »), la connexion reste considérée comme **non fiable** malgré des dates et un CN corrects. Corriger : **`make dev-https-install-ca`** (ou équivalent ci‑dessous), puis **fermer toutes les fenêtres** du navigateur et rouvrir **`https://jobbingtrack.localhost:5443`** (orthographe exacte : `localhost`, `jobbingtrack` avec **track**).

### `make dev-https-install-ca` a réussi mais le navigateur affiche encore `ERR_CERT_AUTHORITY_INVALID`

1. **Vérifier que ce n’est pas uniquement le navigateur** (curl utilise le magasin système, proche de Chrome « natif ») :
   ```bash
   curl -fsS -o /dev/null -w '%{http_code}\n' https://jobbingtrack.localhost:5443/login
   ```
   - Si vous obtenez **200** (ou 307/308), le TLS et la CA **système** sont corrects : le blocage vient du **magasin du navigateur** (Flatpak/Snap, profil isolé, ancienne session).
   - Si **curl échoue** avec erreur certificat, relancez une fois :
     `sudo trust anchor --store .local/dev-certs/ca/jobbingtrack-dev-root-ca.pem`
     puis retestez.

2. **Chaîne Nginx + caches SSL** : le proxy sert désormais un **fullchain** (feuille + CA). Après `dev-https-install-ca`, exécutez si besoin **`sudo trust extract-compat`**, redémarrez **`make dev-https-up`**, puis fermez **tout** le navigateur.

3. **Chrome / Chromium installé en Flatpak ou Snap** : ils n’utilisent pas toujours le même magasin que `trust` sur l’hôte. Importez le fichier **`.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem`** dans **Paramètres → Confidentialité → Gérer les certificats → Autorités**, ou utilisez un binaire **.deb / rpm** du navigateur.

4. **Brave / profil perso** : fermez **toutes** les fenêtres (pas seulement l’onglet), voire testez une **fenêtre privée** après installation de la CA.

5. **Contournement de secours** : import manuel du PEM dans les **Autorités** du navigateur (déjà décrit dans la section Chrome plus haut).

### Autres cas

Si le login fonctionne mais que le backoffice affiche ensuite `ERR_CERT_AUTHORITY_INVALID` sur `https://api.jobbingtrack.localhost:5443`, le problème n'est pas un échec d'authentification : le navigateur ne fait pas encore confiance à la CA locale.

Si le navigateur affiche "Non sécurisé" dès l'ouverture, vérifier d'abord :

- que l'URL est exactement `https://jobbingtrack.localhost:5443/login` ;
- que le navigateur a été fermé puis rouvert après installation de la CA ;
- que le proxy HTTPS a été redémarré après toute régénération de `.local/dev-certs/`.

La correction attendue est de réinstaller ou réimporter la CA locale dans le magasin utilisé par le navigateur, puis de relancer le proxy HTTPS dev. Il ne faut pas corriger ce cas par :

- un fallback HTTP silencieux côté frontend ;
- une désactivation de TLS ;
- un contournement des contrôles auth, WAF, CORS ou cookies ;
- une exception dangereuse en préprod/prod.

Pour la production et la préproduction, utiliser uniquement des certificats publics réels et conserver les URLs publiques HTTPS.

## HSTS

Ne pas activer HSTS strict sur `localhost` ou `*.localhost`. HSTS strict reste réservé aux domaines HTTPS réels de préprod/prod, après validation TLS complète.
