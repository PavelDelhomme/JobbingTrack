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

## HSTS

Ne pas activer HSTS strict sur `localhost` ou `*.localhost`. HSTS strict reste réservé aux domaines HTTPS réels de préprod/prod, après validation TLS complète.
