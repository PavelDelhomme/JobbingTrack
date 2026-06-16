# HTTPS Local De Développement

Le développement local peut tourner en HTTPS avec une CA locale de confiance, pour éviter les erreurs navigateur et les problèmes de mixed content.

## Si tu es bloqué tout de suite (`ERR_CERT_AUTHORITY_INVALID`)

1. Depuis la **racine du dépôt** : `DEV_HTTPS_INSTALL_CA=1 bash scripts/ops/dev-https-certs.sh`  
   (équivalent : `make dev-https-install-ca` si tu utilises Make.)
2. Si le script l’indique ou si **Brave / Chrome / Chromium** refuse encore :  
   `sudo trust anchor --store .local/dev-certs/ca/jobbingtrack-dev-root-ca.pem`  
   puis éventuellement `sudo trust extract-compat` (Arch / Fedora).
3. **Quitter complètement** le navigateur (toutes les fenêtres), le relancer, puis **`https://jobbingtrack.localhost:5443/login`**.
4. Test rapide : `curl -fsS -o /dev/null -w '%{http_code}\n' https://jobbingtrack.localhost:5443/login` → si **200** sans `--cacert`, le souci est presque toujours le **magasin du navigateur** (Flatpak/Snap → import manuel du fichier `.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem` dans **Autorités**, voir **Brave** et **Chrome / Chromium** ci‑dessous).

### Ordre simple si tu utilises **Brave** (et `curl` donne déjà 200)

Tu n’as **pas** besoin de refaire le script tant que `curl` reste à **200**. Enchaîne **uniquement** ceci :

1. Dans Brave, barre d’adresse : ouvre **`brave://settings/security`** (raccourci vers la page Sécurité).
2. Section **Certificats** : clique sur **Gérer les certificats** (ou **Manage certificates** si l’interface est en anglais).
3. Onglet **Autorités** → **Importer** → choisis le fichier  
   **`<racine-du-dépôt>/.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem`**.  
   Si le fichier n’apparaît pas : dans la boîte de dialogue, passe le filtre en **« Tous les fichiers »** / **All files**, pas seulement « Certificats ».
4. Si une fenêtre te demande les usages : coche **« Confier à cette autorité de certification pour identifier les sites web »** (équivalent anglais *Trust this CA to identify websites*).
5. **Ferme toutes les fenêtres Brave** (y compris en arrière-plan / icône barre des tâches), rouvre Brave, reteste **`https://jobbingtrack.localhost:5443/login`**.

Même chemin par le menu : **☰** → **Paramètres** → **Confidentialité et sécurité** → **Sécurité** → **Gérer les certificats** → **Autorités** → **Importer**.

Si **« Gérer les certificats » n’existe pas** : Brave **Flatpak** peut ouvrir le gestionnaire système au lieu du panneau intégré — dans ce cas installe la CA côté hôte (`trust` déjà fait) **et** vérifie `flatpak list | grep -i brave` ; en dernier recours, teste un paquet **Brave natif** Arch (`brave-bin` AUR / paquet équivalent) ou **`mkcert`** (Option D plus bas).

### `curl` affiche déjà 200 mais Brave / Chrome affichent encore `ERR_CERT_AUTHORITY_INVALID`

Ne pas reboucler indéfiniment sur `dev-https-certs.sh` : **le TLS côté proxy et la CA hôte sont déjà bons.**

1. **Identifier le binaire réellement lancé** (Flatpak / Snap ont un magasin **séparé** de `trust` sur l’hôte) :
   ```bash
   command -v brave brave-browser google-chrome-stable google-chrome chromium 2>/dev/null
   flatpak list 2>/dev/null | grep -Ei 'chrome|chromium|brave' || true
   snap list 2>/dev/null | grep -Ei 'chrome|chromium|brave' || true
   ```
   - Si le navigateur vient d’un **Flatpak** ou d’un **Snap**, `sudo trust anchor` **ne suffit souvent pas** : importer le PEM à la main (parcours Brave ci‑dessus) ou utiliser un paquet **natif** (`.pkg.tar.zst` / `.deb` / rpm) pour ce navigateur.

2. **Import manuel dans Brave / Chrome / Chromium** (même interface Chromium ; voir aussi le bloc **Ordre simple si tu utilises Brave** ci‑dessus) :
   - Fichier : **`<racine-du-dépôt>/.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem`**
   - **Paramètres** → **Confidentialité et sécurité** → **Sécurité** → **Gérer les certificats** → onglet **Autorités** → **Importer** → cocher **Confier à cette CA pour identifier les sites web** si proposé.
   - **Quitter complètement** le navigateur (toutes les fenêtres), relancer, retester `/login`.

3. **Vérification croisée** : ouvrir la même URL dans **Firefox** (le script a déjà injecté la CA dans les profils Mozilla listés). Si Firefox est OK et Brave/Chrome non, le diagnostic est **100 % magasin du navigateur Chromium** (Flatpak/Snap ou import manquant).

4. **Dernier recours** : section **Option D — `mkcert`** plus bas (`mkcert -install` puis `FORCE=1 bash scripts/ops/dev-https-certs.sh` + redémarrage du proxy).

## URLs

| Surface | URL HTTPS (recommandée) | URL legacy |
| --- | --- | --- |
| Frontend | `https://jobbingtrack.localhost` (port **443**) | `https://jobbingtrack.localhost:5443` |
| API Gateway | `https://api.jobbingtrack.localhost` | `https://api.jobbingtrack.localhost:5443` |
| Redirect HTTP | `http://jobbingtrack.localhost` → **308** HTTPS (port **80**) | — |

Le proxy `dev-https-proxy` doit être démarré (profile Docker `https` ou `make dev-https-up` / `make up-full`). Sans lui, seul `http://localhost:5003` répond — **`jobbingtrack.localhost` reste injoignable**.

Les appels internes Docker restent en HTTP privé (`frontend:3000`, `api-gateway:3000`). Le TLS est terminé par le proxy dev `dev-https-proxy`.

**Performances / metrics-aggregator** : les pages backoffice appellent `/api/metrics-aggregator/*` via le proxy Next (route App Router). Le bloc Nginx `location ^~ /api/metrics-aggregator/` doit être **avant** `location ^~ /api/` (gateway), sinon les graphes Performances renvoient **404** en HTTPS. Après modification de `production/nginx/dev-https/default.conf`, redémarrer `jobbingtrack-dev-https-proxy`. Smoke : `curl -sk -o /dev/null -w '%{http_code}\n' https://jobbingtrack.localhost:5443/api/metrics-aggregator/docker/services/all` → **200**.

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

## Chrome / Chromium / Brave sous Linux (`ERR_CERT_AUTHORITY_INVALID`)

Sur beaucoup de distributions, **Chrome, Chromium et Brave** (moteur Chromium) s’appuient sur le **magasin de certificats du système** ou sur un NSS interne selon l’empaquetage. Le script tente d’abord `sudo -n trust anchor --store …` : si cela réussit, le navigateur **natif** accepte souvent le site sans étape manuelle. Si le script affiche la commande avec `sudo trust anchor` (sans `-n`), exécutez-la une fois dans un terminal, puis fermez tout le navigateur et rouvrez l’URL.

Si vous ne pouvez pas utiliser `sudo`, ou si **`curl` = 200** mais Brave refuse encore, importez le PEM dans **Autorités** (voir le bloc **Ordre simple si tu utilises Brave** en haut de ce fichier).

**Option A — import manuel Brave / Chrome / Chromium (sans sudo)**

1. Fichier CA : `.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem`
2. **Brave** : barre d’adresse **`brave://settings/security`**, puis **Gérer les certificats** → onglet **Autorités** → **Importer** → choisir le `.pem` → cocher **Confier à cette CA pour identifier les sites web** si proposé.  
   **Chrome / Chromium** : **Paramètres** → **Confidentialité et sécurité** → **Sécurité** → **Gérer les certificats** → **Autorités** → **Importer** (ou `chrome://settings/security`).
3. Fermer **toutes** les fenêtres du navigateur, rouvrir, puis retester `https://jobbingtrack.localhost:5443`.

**Option B — magasin système (sudo, recommandé si vous préférez une fois pour toutes)**

- Arch / `trust` : `sudo trust anchor --store .local/dev-certs/ca/jobbingtrack-dev-root-ca.pem` puis redémarrer le navigateur.
- Debian/Ubuntu : copier la CA sous `/usr/local/share/ca-certificates/` avec l’extension **`.crt`**, puis `sudo update-ca-certificates`, puis redémarrer Brave / Chrome.

**Option C — `mkcert`**

Si `mkcert` est installé, le script l’utilise en priorité : `mkcert -install` installe généralement une CA reconnue par les navigateurs Chromium. Voir la section « Commandes » ci-dessus (`make dev-https-install-ca`).

**Option D — tout repasser par `mkcert` (si OpenSSL + navigateur restent bloqués)**

1. Installer `mkcert` (ex. Arch : `sudo pacman -S mkcert`).
2. `mkcert -install` (une fois par machine).
3. `FORCE=1 bash scripts/ops/dev-https-certs.sh` puis **`make dev-https-up`** (régénère les PEM avec la CA mkcert).
4. Fermer tout le navigateur et rouvrir `https://jobbingtrack.localhost:5443/login`.

## Variables

Les variables publiques du frontend doivent rester en HTTPS :

```env
DEV_HTTPS_PORT=5443
DEV_HTTPS_LAN_IP=192.168.1.134 # optionnel ; vide = auto-détection
DEV_HTTPS_FRONTEND_URL=https://jobbingtrack.localhost:5443
DEV_HTTPS_API_URL=https://api.jobbingtrack.localhost:5443
NEXT_PUBLIC_FRONTEND_URL=https://jobbingtrack.localhost:5443
NEXT_PUBLIC_API_URL=https://api.jobbingtrack.localhost:5443
NEXT_PUBLIC_API_GATEWAY_URL=https://api.jobbingtrack.localhost:5443
NEXT_PUBLIC_AUTH_SERVICE_URL=https://api.jobbingtrack.localhost:5443
ALLOWED_ORIGINS=https://jobbingtrack.localhost:5443,https://api.jobbingtrack.localhost:5443
```

`localhost` HTTP peut rester en fin de liste pour certains scripts hôte, mais le navigateur/backoffice doit utiliser les URLs HTTPS ci-dessus.

### Accès depuis un téléphone sur le LAN

En développement uniquement, le proxy HTTPS accepte aussi l’accès par IP du PC, par exemple :

```text
https://192.168.1.134:5443/login
```

Dans ce mode, le frontend n’utilise pas `api.jobbingtrack.localhost` (non résolu par le téléphone) : les appels API restent sur la même origine via `https://<IP_PC>:5443/api/*`, puis Nginx relaie vers l’API gateway. Le CORS gateway accepte les origines LAN privées HTTP/HTTPS seulement hors production.

Pour régénérer le certificat avec l’IP LAN actuelle :

```bash
DEV_HTTPS_LAN_IP=192.168.1.134 bash scripts/ops/dev-https-certs.sh
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --force-recreate api-gateway dev-https-proxy
```

Si le téléphone affiche une alerte certificat, importer/faire confiance à la CA locale `JobbingTrack Local Dev Root CA` sur l’appareil, ou accepter l’exception uniquement en développement.

## Certificats

Les fichiers générés ne sont pas versionnés :

```text
.local/dev-certs/jobbingtrack-dev.pem
.local/dev-certs/jobbingtrack-dev-fullchain.pem   ← feuille + CA (servi par Nginx)
.local/dev-certs/jobbingtrack-dev-key.pem
.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem
```

Après **`make dev-https-install-ca`**, si `sudo trust anchor` a réussi, le script tente aussi **`trust extract-compat`** (bundles `/etc/ssl/certs` pour les clients qui ne lisent que ce chemin). **Redémarrez** ensuite **`dev-https-proxy`** pour que Nginx charge le **`fullchain`**.

Le certificat feuille contient les SAN `jobbingtrack.localhost`, `api.jobbingtrack.localhost`, `localhost`, `127.0.0.1`, `::1` et, si détectée ou fournie via `DEV_HTTPS_LAN_IP` / `HOST_IP`, l’IP LAN du PC.

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

3. **Brave / Chrome / Chromium en Flatpak ou Snap** : ils n’utilisent pas toujours le même magasin que `trust` sur l’hôte. Importez le fichier **`.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem`** dans **Paramètres → Confidentialité → Gérer les certificats → Autorités** (Brave : **`brave://settings/security`**), ou utilisez un binaire **natif** (pacman / `.deb` / rpm) du navigateur.

4. **Profil perso** : fermez **toutes** les fenêtres (pas seulement l’onglet), voire testez une **fenêtre privée** après import de la CA (utile pour écarter un profil corrompu ; l’import reste souvent nécessaire une fois pour toutes).

5. **Contournement de secours** : import manuel du PEM dans les **Autorités** (déjà décrit dans la section **Chrome / Chromium / Brave** plus haut et dans **Ordre simple si tu utilises Brave**).

### Autres cas

**Échecs de login (401, SSL sur `:5002`, admin non reconnu)** : ne pas mélanger avec un problème de certificat. Suivre le guide dédié **[`docs/troubleshooting/TROUBLESHOOTING_LOGIN.md`](../troubleshooting/TROUBLESHOOTING_LOGIN.md)** (symptômes, resync `ADMIN_PASSWORD` via `backend/scripts/database/create-admin-user.sh`).

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
