# Dépannage — connexion admin / login

[← Retour dépannage](README.md) | [← Documentation](../README.md) | [🧭 Navigation](../navigation.md) | [HTTPS dev](../operations/DEV_HTTPS.md) | [Variables `.env`](../deployment/environment-variables/README.md)

Guide **opérationnel** pour les échecs de connexion au backoffice. Pour l’installation TLS locale (CA, Brave, ports), voir **`docs/operations/DEV_HTTPS.md`**.

---

## Parcours normal (dev HTTPS)

1. Stack démarrée (`full` + `monitoring` + `https` selon votre flux).
2. Navigateur : **`https://jobbingtrack.localhost:5443/login`** (orthographe exacte : `jobbingtrack` avec **track**).
3. Identifiants : **`ADMIN_EMAIL`** et **`ADMIN_PASSWORD`** du **`.env` racine** (copier-coller, sans espace parasite).
4. API attendue dans l’onglet Réseau : **`POST https://api.jobbingtrack.localhost:5443/api/v1/auth/login`** → **200** + token.

Ne jamais documenter ni coller le mot de passe dans un ticket, un commit, un log ou une capture.

---

## Symptômes → cause → action

| Symptôme console / réseau | Cause probable | Action |
|---------------------------|----------------|--------|
| `POST https://jobbingtrack.localhost:5002/...` + `ERR_SSL_PROTOCOL_ERROR` | Le port **5002** est l’API Gateway en **HTTP** ; le front a construit une URL HTTPS incorrecte | Vérifier `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_GATEWAY_URL` = `https://api.jobbingtrack.localhost:5443` (voir `.env.example`). Hard refresh. Code : `frontend/src/config/ports.config.ts`, `frontend/src/lib/api.ts`. |
| `POST https://api.jobbingtrack.localhost:5443/...` + **401** + `Invalid email or password` | Requête OK ; **hash BDD ≠ mot de passe saisi** (souvent mot de passe hors `.env` ou admin non resynchronisé) | Resynchroniser l’admin (section ci-dessous). Logs auth : `Mot de passe incorrect pour admin@…`. |
| `No token found` / tracking désactivé au chargement | **Normal** avant login | Ignorer tant qu’aucune tentative de connexion n’a réussi. |
| `ERR_CERT_AUTHORITY_INVALID` sur l’API après login | CA locale non importée dans **ce** navigateur | Suivre **`docs/operations/DEV_HTTPS.md`** (Brave : import PEM dans Autorités, quitter tout le navigateur). |
| Gateway : `INTRUSION … DOS_ATTACKS` (`172.19.0.1`, polling `/api/v1/security/*`) | Trafic légitime via proxy Docker en dev, pas une attaque externe | **18/05** : `INTRUSION_RELAX_HEURISTICS=true` (défaut Compose) + skip DoS en dev ; recréer **`jobbingtrack-api-gateway`**. Voir **`docs/security/ROADMAP_SECURITE_API_ET_BACKOFFICE.md`**. |
| Erreur **500** au login, table `User` absente | Schéma BDD non poussé | `make db-push-all` ou `make up-full` (voir aussi historique P2021 ci-dessous). |

---

## Resynchroniser le mot de passe admin (401)

Le compte **`admin@jobbingtrack.com`** (ou `ADMIN_EMAIL`) doit avoir un hash bcrypt aligné sur **`ADMIN_PASSWORD`** du `.env`.

**Méthode recommandée** (auth-service doit être **Up**) :

```bash
bash backend/scripts/database/create-admin-user.sh
```

Le script utilise désormais **Prisma + `process.env.ADMIN_PASSWORD`** dans le conteneur auth (plus d’interpolation shell fragile).

**Critère de succès** (sans afficher le secret) :

```bash
curl -kfsS -o /dev/null -w '%{http_code}\n' \
  -X POST https://api.jobbingtrack.localhost:5443/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"VOTRE_ADMIN_EMAIL","password":"VOTRE_ADMIN_PASSWORD"}'
```

→ **200** (tester avec les valeurs du `.env`, pas un mot de passe mémorisé ailleurs).

---

## Logs : navigateur vs backoffice sécurité

| Source | Visible dans le backoffice ? |
|--------|------------------------------|
| Console (`auth.tsx`, Fast Refresh, tracking) | **Non** — local navigateur uniquement |
| `login_failure` côté auth-service (mauvais MDP, user inconnu) | **Oui** — **Sécurité → logs** (`security_logs`) si security-service joignable |
| Erreur réseau / SSL (requête n’atteint pas l’auth) | Souvent **non** en base |

---

## HTTP local (sans proxy 5443)

Si vous utilisez **`http://localhost:5003/login`** :

- API côté navigateur : typiquement **`http://localhost:5002/api/v1/...`**
- Les variables `NEXT_PUBLIC_*` du `.env` peuvent différer ; voir **`docs/configuration/CONFIGURATION_PORTS.md`**.

Le parcours **documenté et validé** pour le backoffice reste le **HTTPS dev sur 5443**.

---

## Historique — table `User` manquante (P2021)

Contexte d’anciennes sessions : login impossible quand la table `User` n’existait pas encore.

**Comportement actuel** :

- `make up-full` peut déclencher `db-push-all` si peu de tables ;
- fallbacks dev mock dans `auth.controller.js` — **ne pas** s’appuyer sur un mot de passe en dur ;
- privilégier **`create-admin-user.sh`** + `.env` une fois le schéma en place.

Fichiers de référence : `backend/auth-service/src/controllers/auth.controller.js`, `makefiles/services/Makefile`.

---

**Dernière mise à jour** : 18 mai 2026
