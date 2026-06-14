# Audit gateway — remote host, shell et URL injection — 15 juin 2026

## Périmètre

Campagne locale contrôlée sur l’entrée publique `api-gateway`.

Vecteurs traités :

- tentatives remote host / SSRF-like vers hôtes internes (`localhost`, `127.0.0.1`, réseaux privés, metadata cloud `169.254.169.254`) ;
- shell / command injection en clair et encodée (`;cat`, `&&`, `|`, `$IFS`, `/etc/passwd`, shells système) ;
- URL injection (`redirect`, `next`, `callback`, `url`, CRLF encodé, schémas dangereux `file://`, `gopher://`, etc.) ;
- Host header spoofing (`Host`, `X-Forwarded-Host`, `Forwarded`) ;
- journalisation des blocages WAF dans `security_logs`.

Hors périmètre volontaire : DDoS, scan externe, fuzzing massif, nmap, ZAP actif, hping/scapy. Ces outils restent réservés à une stack dédiée et à une fenêtre explicitement validée.

## Correctifs appliqués

### Règles WAF renforcées

Ajouts dans `backend/api-gateway/src/middleware/waf.js` :

- `REMOTE_HOST_ACCESS` : hôtes internes, metadata cloud, réseaux privés et paramètres `url/target/callback/redirect/next/host` pointant vers ces cibles ;
- `URL_INJECTION` : redirections absolues, CRLF encodé, traversal encodé, schémas non HTTP dangereux ;
- `HOST_HEADER_SPOOFING` : `X-Forwarded-Host` multi-valeurs, `Host` malformé, hôtes internes dans `Forwarded`/`X-Forwarded-Host` ;
- `COMMAND_INJECTION` renforcé : variantes encodées `%3b`, `%7c`, `%26%26`, `$IFS`, `/bin/sh`, `/etc/passwd`, commandes courantes.

### Journalisation sécurité

Les détections WAF high/critical sont maintenant envoyées vers `security-service` :

- `eventType = waf_blocked_request` ;
- `category = intrusion` ;
- `isBlocked = true` pour les blocages ;
- métadonnées : règles déclenchées, sévérité, pattern, evidence tronquée et redigée ;
- propagation `requestId` / `correlationId`.

Les preuves redigent les champs évidents `password`, `token`, `secret`, `authorization` et les Bearer tokens.

## Tests automatisés

Fichier renforcé :

`backend/api-gateway/tests/waf.test.js`

Nouveaux contrôles :

- remote host / SSRF-like vers `http://169.254.169.254/latest/meta-data/` bloqué + journalisé ;
- shell injection encodée `summary.md%3Bcat%20%2Fetc%2Fpasswd` bloquée ;
- `X-Forwarded-Host` forgé multi-hôtes bloqué ;
- redaction des secrets évidents dans le payload de journalisation WAF.

Validation montée avec sources du workspace :

```bash
docker run --rm \
  -v "$PWD/backend/api-gateway/src:/app/src:ro" \
  -v "$PWD/backend/api-gateway/tests:/app/tests:ro" \
  -v "$PWD/config:/app/config:ro" \
  -w /app jobbingtrack-api-gateway \
  npm test -- --runInBand tests/waf.test.js
```

Résultat : **12/12 tests WAF passed**.

## Preuve runtime locale

Après restart `api-gateway`, trois payloads bornés ont été envoyés via `localhost:5002` avec IPs RFC 5737 de test :

| Vecteur | Résultat |
|---|---:|
| Remote host metadata `url=http://169.254.169.254/latest/meta-data/` | `403` |
| Shell injection encodée `summary.md%3Bcat%20%2Fetc%2Fpasswd` | `403` |
| `X-Forwarded-Host: jobbingtrack.localhost:5443, attacker.example` | `403` |

Vérification Postgres :

```sql
SELECT "eventType", "sourceIP", "isBlocked", endpoint, "createdAt"
FROM security_logs
WHERE "eventType" = 'waf_blocked_request'
  AND "sourceIP" IN ('203.0.113.52', '203.0.113.53', '203.0.113.54');
```

Résultat : **3/3 événements** `waf_blocked_request`, `isBlocked = true`.

## Validations et limites

- Syntaxe WAF : `/usr/bin/node --check src/middleware/waf.js` OK.
- Tests WAF montés depuis workspace : **12 passed**.
- Frontend impact API : `npm run type-check` / `npm run lint` restent muets code 1 (dette wrapper connue) ; commande directe `./node_modules/.bin/tsc --noEmit --pretty false` OK ; ESLint ciblé frontend **0 erreur**, 5 warnings historiques sur `security-e2e.spec.ts`.
- ESLint `api-gateway` non concluant dans ce service : aucune config ESLint n’est présente sous `/app` dans l’image courante, la commande échoue avant analyse (`ESLint couldn't find a configuration file`). À traiter comme dette outillage, pas comme résultat sécurité.

Suite recommandée :

- ajouter un runner de campagne contrôlée dans `tests/results/security/` pour exposer ces preuves dans `/b4ck0ff1ce/test-reports` ;
- étendre aux endpoints métier susceptibles d’accepter des URL (`website`, imports, webhooks futurs) ;
- traiter JWT falsifié/expiré, reset password, CORS et IDOR dans des lots séparés.
