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
make dev-https-install-ca
make dev-https-up
make dev-https-status
make dev-https-down
```

`make dev-https-install-ca` génère les certificats dans `.local/dev-certs/` et installe la CA locale dans les magasins navigateur NSS disponibles (`~/.pki/nssdb`, profils Firefox). Si `mkcert` est installé, il est utilisé en priorité.

## Connexion Backoffice Locale

Le parcours navigateur attendu en développement local est :

1. Installer ou réinstaller la CA locale :

```bash
make dev-https-install-ca
```

2. Démarrer le proxy HTTPS local :

```bash
make dev-https-up
```

3. Ouvrir le backoffice avec l'URL HTTPS, pas avec `localhost` HTTP :

```text
https://jobbingtrack.localhost:5443/login
```

Attention au nom exact : `jobbingtrack.localhost` contient `track`. Une URL comme `https://jobbingtrck.localhost:5443/login` est une faute de frappe ; elle peut résoudre localement, mais elle n'est pas couverte par le certificat et le navigateur doit l'afficher comme non sécurisée.

4. Se connecter avec les valeurs locales `ADMIN_EMAIL` et `ADMIN_PASSWORD` du `.env`, sans les copier dans un ticket, un commit, un log ou une capture.

Après connexion, le frontend doit appeler l'API via :

```text
https://api.jobbingtrack.localhost:5443
```

Validation porteur du 13/05/2026 : le login via `https://jobbingtrack.localhost:5443/login` fonctionne après installation de la CA locale. Si le navigateur était déjà ouvert avant l'installation de la CA, le fermer puis le rouvrir avant de conclure à un bug applicatif.

Correctif du 14/05/2026 : la CA OpenSSL locale générée sans `mkcert` porte explicitement `basicConstraints=CA:true` et `keyUsage=keyCertSign,cRLSign`. Après ce correctif, régénérer avec `FORCE=1 DEV_HTTPS_INSTALL_CA=1 bash scripts/ops/dev-https-certs.sh`, puis redémarrer `dev-https-proxy` pour servir le nouveau certificat. Validation stricte : login API HTTPS `200` et profil HTTPS `200` avec le rôle `SUPER_ADMIN`.

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
.local/dev-certs/jobbingtrack-dev-key.pem
.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem
```

Le certificat contient les SAN `jobbingtrack.localhost`, `api.jobbingtrack.localhost`, `localhost`, `127.0.0.1` et `::1`.

## Diagnostic navigateur

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
