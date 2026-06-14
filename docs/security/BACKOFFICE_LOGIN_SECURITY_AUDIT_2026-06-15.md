# Audit sécurité login backoffice — 15 juin 2026

## Périmètre

Campagne locale contrôlée sur :

- page `/login` du backoffice ;
- endpoint gateway `/api/v1/auth/login` ;
- comportement frontend du service `authService.login` ;
- rate-limit auth côté `api-gateway`.

Hors périmètre volontaire : DDoS, fuzzing massif, scan externe, brute force longue, credential stuffing réel, ZAP actif, nmap. Les tests restent bornés et locaux.

## Correctifs appliqués

### Login frontend non cacheable

Avant, `authService.login` passait par `cachedRequest("auth-login-${email}", ...)`.

Risque : une tentative sensible ne doit jamais dépendre d’un cache, même court. Un échec récent pouvait masquer une tentative suivante avec le même email, et la sémantique d’un login doit toujours atteindre le serveur.

Correctif : `authService.login` appelle directement `criticalApiClient.post("/auth/login", ...)`.

### Rate-limit strict réellement appliqué au login

Avant, `authRateLimiter` était importé par `api-gateway`, mais non monté explicitement sur `/api/v1/auth/login`. La gateway utilisait surtout la limite générale.

Correctif : si `RATE_LIMIT_ENABLED !== "false"`, la gateway applique maintenant aussi :

```js
app.use('/api/v1/auth/login', authRateLimiter);
```

La limite dédiée existante est `5` tentatives/minute/IP.

## Tests ajoutés

Nouveau spec :

`frontend/tests/e2e/backoffice-login-security.spec.ts`

Contrôles couverts :

- aucun secret, mot de passe, compte de test ou aide de debug visible sur `/login` ;
- attributs `autocomplete` attendus (`email`, `current-password`) ;
- réponse générique identique pour email inconnu et mot de passe incorrect sur un compte connu ;
- payloads SQL/XSS/NoSQL contrôlés rejetés sans token, stack trace, fuite Prisma ou indice SQL ;
- rate-limit strict observé sur le login (`429` après tentatives bornées avec IP de test).

## Validations exécutées

Commandes directes, sans `make`.

| Validation | Résultat |
|---|---:|
| Restart `api-gateway` + `/health` | `200` |
| Frontend `tsc --noEmit` direct | OK |
| ESLint ciblé `api.ts`, spec login sécurité, spec login existant | 0 erreur, warnings historiques `any` dans `api.ts` |
| `/usr/bin/node --check backend/api-gateway/src/server.js` | OK |
| Playwright `backoffice-login-security.spec.ts` | **5/5 passed** |
| Playwright `login.spec.ts` projet `no-auth` | **4 passed / 3 skipped** |

Les 3 skips du spec login existant sont les tests UI sensibles au timing auth déjà conditionnés par la configuration (`E2E_SKIP_LOGIN_UI` / environnement).

## Résultats importants

- Le login backoffice n’expose pas les credentials admin ni les anciens comptes de test.
- Les erreurs de login ne différencient pas “email inconnu” et “mot de passe incorrect” : `Invalid email or password`.
- Les payloads injectés ne donnent ni token, ni stack trace, ni fuite SQL/Prisma.
- La limite dédiée auth répond bien avec `429` dans l’environnement local testé.
- La non-régression visuelle de base du login reste OK.

## Limites et suite recommandée

À traiter dans une prochaine passe sécurité contrôlée :

- reset password / forgot password : énumération de comptes, rate-limit, contenu email, expiration token ;
- refresh token / logout / cookies : flags, rotation, invalidation, durée ;
- backoffice après login : accès direct aux routes sensibles sans rôle admin, session expirée, token falsifié ;
- option produit : durcissement MFA/2FA ou revalidation PIN pour actions sensibles ;
- rapport automatisé dans `/b4ck0ff1ce/test-reports` si l’on veut exposer cette campagne dans l’UI Tests.
