# Matrice tests sécurité offensifs et protections

Objectif : cadrer les tests de sécurité à réaliser sur JobbingTrack, côté commandes, rapports et interface backoffice. Ces tests doivent être exécutés uniquement sur un environnement autorisé (local, test, préprod contrôlée), jamais contre une cible tierce ou une production sans fenêtre validée.

**Roadmap produit (phases, backoffice CVE, IA/PQC)** : voir **[ROADMAP_SECURITE_API_ET_BACKOFFICE.md](ROADMAP_SECURITE_API_ET_BACKOFFICE.md)**.

## État actuel

- **Partiellement couvert** : WAF, détection intrusion, rate limiting gateway, corrélation `requestId` / `correlationId`, logs sécurité, CVE continu, alertes email critiques, durcissement Docker en cours.
- **À renforcer** : énumération d’URL, fuzzing de paramètres, mass assignment, JWT manipulation, IDOR/privilege escalation, scans massifs, protections DB, secrets, TLS, spoofing/réseau, tests mobiles.
- **Cible produit** : pouvoir lancer/consulter une partie des contrôles depuis le backoffice sécurité (mode non destructif), garder les commandes projet reproductibles, et produire des rapports lisibles dans `tests/results/` ou `reports/security/`.

## Règles de test

- Utiliser des comptes, IPs et jeux de données dédiés au lab.
- Passer par l’API Gateway pour tester WAF, rate limit, CORS, auth et corrélation.
- **Ne pas inspecter tout le trafic inter-conteneurs** : les appels internes Docker, healthchecks et flux service-to-service doivent rester hors analyse runtime lourde. Le chemin critique à protéger/analyser en temps réel est l’entrée **gateway/public** ; l’interne doit être couvert par auth interne, secrets, mTLS futur, logs ciblés et métriques agrégées.
- Toute détection runtime doit être **bornée en coût** : regex simples précompilées, limites de taille sur payloads, sampling si besoin, timeout court, émission d’événement asynchrone vers `security-service`.
- Ne jamais logguer de secrets complets, tokens bruts, mots de passe ou payloads sensibles sans masquage.
- Séparer les tests passifs (audit/configuration) des tests actifs (fuzzing, bruteforce, DoS contrôlé).
- Activer un mode dry-run pour les tests destructifs ou risqués quand c’est possible.

## Contrôles prioritaires à ne pas oublier

- **`gitleaks` sur l’historique complet Git** : utiliser `fetch-depth: 0` en CI et en local pour détecter les secrets oubliés dans les anciens commits, pas seulement dans l’état courant.
- **`trivy` sur les images Docker de prod** : scanner les images réellement construites/déployées, pas uniquement le filesystem du repo.
- **`nmap` sur l’exposition effective de `docker-compose.prod.yml`** : vérifier les ports réellement accessibles depuis l’extérieur, en distinguant ports publiés, reverse proxy et ports internes Docker.
- **`jwt_tool` sur l’auth JWT** : tester `alg:none`, confusion d’algorithme, expiration, issuer/audience, rotation secrets et rejet des tokens modifiés.
- **OWASP ZAP en active scan sur l’API locale** : cible privilégiée pour API REST, à lancer sur environnement autorisé, borné et via la gateway pour couvrir WAF/rate limit/auth/corrélation.

### Commandes P0 restantes

Ces commandes ne doivent viser que `localhost`, un environnement de test ou une préprod explicitement autorisée.

```bash
# Ports exposés : nécessite une cible autorisée, idéalement l'IP/FQDN préprod vu depuis l'extérieur.
SECURITY_NMAP_TARGET=preprod-api.example.test make security-scan-ports

# JWT : utiliser uniquement un token de lab court-vivant, jamais un token réel utilisateur/prod.
JWT_AUDIT_TOKEN="eyJ..." make security-scan-jwt

# ZAP actif : scan potentiellement agressif, uniquement gateway locale/préprod contrôlée.
SECURITY_ACTIVE_SCAN=1 ZAP_TARGET=http://localhost:5002 ZAP_MAX_MINUTES=10 make security-zap-active
```

Pré-requis locaux : `nmap` installé pour le scan réseau, `jwt_tool` installé pour l’audit JWT, Docker/ZAP disponible pour `security-zap-active`. Si l’outil manque, noter `skipped` dans le rapport plutôt que simuler un succès.

## Matrice attaque, outils et protections

| Menace | Outils de test | Protection attendue | Preuve attendue |
|---|---|---|---|
| Énumération URL / endpoints cachés | `ffuf`, `gobuster`, `nikto`, OWASP ZAP | Authz sur toutes les routes, debug désactivé en prod, réponses 404/403 non verbeuses, rate limit | Rapport endpoints trouvés, statut, route protégée ou corrigée |
| Paramètres cachés / injection paramètres | `arjun`, `wfuzz`, Burp Suite | Whitelist DTO, validation Zod/Joi/express-validator, rejet champs inconnus sensibles | Liste paramètres acceptés/rejetés, tests mass assignment |
| SQL / NoSQL injection | `sqlmap`, tests unitaires payloads | ORM paramétré, validation d’entrée, absence de concat SQL, logs sans fuite SQL | Rapport sqlmap + tests API ciblés |
| XSS stockée/réfléchie/DOM | `dalfox`, `nikto`, ZAP | Encodage sortie, CSP, sanitisation HTML si contenu riche, cookies `HttpOnly/SameSite` | Payloads bloqués ou rendus inertes |
| Command injection | `commix`, tests payloads | Aucun shell avec entrée utilisateur ; `spawn` sans shell si nécessaire ; allowlist stricte | Rapport chemins exécutant commandes et résultat |
| SSTI | ZAP, payloads templates | Pas de templates serveur avec entrée brute ; échappement strict si usage futur | Test négatif ou justification absence moteur |
| Brute force login | `hydra`, `medusa`, ZAP | Rate limit, lockout progressif, alertes, logs audit, pas d’énumération email | Rapport seuils, comptes bloqués, logs corrélés |
| JWT manipulation | `jwt_tool`, Burp Suite | Algorithme imposé, expiration, issuer/audience, rotation secrets/RS256 cible, rejet `alg:none` | Cas acceptés/rejetés documentés |
| IDOR / privilege escalation | Burp Suite, tests E2E rôles | RBAC serveur, vérification propriétaire/tenant, routes admin protégées | Matrice rôle → route → statut attendu |
| Session fixation / hijacking | Burp Suite, tests navigateur | Rotation tokens, cookies sûrs, refresh révoqué, logout global | Scénarios session documentés |
| CORS mal configuré | ZAP, curl, tests OPTIONS | Origines allowlistées, credentials maîtrisés, headers minimaux | Rapport origines autorisées/refusées |
| Rate limiting absent / scraping | ZAP, scripts charge contrôlée | Limites par IP/compte/route, backoff, logs et alertes | Courbes 429, logs sécurité |
| DoS HTTP lent / volumétrie | `slowloris`, load testing contrôlé | Timeouts proxy/gateway, limites body, circuit breaker, quotas | Test court borné + métriques ressources |
| File upload / path traversal | ZAP, payloads traversal | Types/tailles allowlistés, stockage hors webroot, antivirus futur, noms normalisés | Cas rejetés et logs |
| Secrets dans Git / images | `gitleaks`, `truffleHog`, `trivy` | `.gitignore`, hooks, secrets manager, images sans `.env` | Rapport secrets vide ou tickets ouverts |
| Images Docker vulnérables | `trivy`, Docker Scout | Images minimales, rebuild régulier, seuil CI high/critical | Rapport par image et décision |
| Ports/services exposés | `nmap`, `masscan` en préprod autorisée | Bind local en dev, firewall, compose prod restrictif, Redis/Postgres non publics | Liste ports ouverts attendus |
| Docker socket / container escape | docker-bench-security, audit compose | Proxy Docker limité, non-root, `read_only`, `no-new-privileges`, capacités minimales | Checklist B14/BX validée |
| TLS faible | `sslscan`, `testssl.sh` | TLS 1.2+, HSTS, certificats valides, redirection HTTPS | Rapport TLS préprod/prod |
| Logs sensibles | tests payloads + audit logs | Redaction tokens/passwords, rétention maîtrisée, accès logs ultra-protégé | Exemples logs masqués |
| Spoofing IP / headers | curl/Burp, tests proxy | `TRUST_PROXY_HOPS` strict, extraction IP fiable, rejet headers non fiables hors proxy | Cas `X-Forwarded-For` documentés |
| Paquets IP modifiés / scans réseau | `nmap`, règles firewall, IDS futur | WAF en bordure, firewall hôte, détection scans, logs séparés interne/externe | Événements réseau visibles en backoffice |
| Reverse engineering mobile | MobSF, jadx/apktool plus tard | Pas de secrets dans l’app, certificate pinning à évaluer, obfuscation, détection root non bloquante seule | Rapport mobile dédié avant release |

## Interface et commandes à prévoir

- **Commandes projet** : socle initial ajouté avec `make security-audit`, `make security-scan-secrets`, `make security-scan-images`, `make security-scan-ports`, `make security-scan-jwt`, `make security-zap-active`, `make security-report`. Reste à ajouter un vrai `make security-scan-api` pour `ffuf`/`gobuster`/ZAP passive selon environnement.
- **Backoffice sécurité** : page de tests non destructifs avec sélection environnement, statut WAF, rate limit, CORS, endpoints protégés, rapport lisible et historique.
- **Rapports** : stocker les sorties normalisées sous `reports/security/` ou `tests/results/security/`, avec date, environnement, commit, outil, statut et résumé actionnable.
- **CI/CD** : workflow initial `security-audit.yml` ajouté pour `gitleaks`, audit dépendances, Trivy filesystem/config et scan images prod manuel. Ne bloquer le dev que sur critical/high confirmés, avec exceptions datées.

## Architecture par couches à viser

### Couche 1 — Runtime gateway uniquement

- Implémenter/renforcer dans `backend/api-gateway` : `helmet`, rate limiting par IP et par utilisateur, limites body, timeouts, détection de patterns simples (SQLi/XSS/path traversal/NoSQL), user-agents scanners, corrélation `requestId`.
- Émettre des événements sécurité asynchrones vers `security-service` (`RATE_LIMIT_EXCEEDED`, `INJECTION_ATTEMPT`, `SCANNER_DETECTED`, `JWT_INVALID`, `AUTHZ_DENIED`) sans bloquer la requête normale hors décision de rejet immédiate.
- Ne pas appliquer ce filtrage à tous les flux internes Docker : le coût et les faux positifs seraient mauvais pour les performances.

### Couche 2 — CI/CD et audits hors chemin critique

- Ajouter un workflow sécurité pour `gitleaks` historique complet, audits npm, Trivy filesystem/images, et upload SARIF quand pertinent.
- Programmer les scans lourds hors runtime utilisateur : CI, nightly, hebdomadaire ou commande manuelle.

### Couche 3 — Forensics et alerting

- Structurer `security-service` autour de collecteurs (gateway/auth/system), analyzers (pattern engine, IP reputation, CVE), alerters (email/webhook/threshold).
- Corréler en arrière-plan : brute force, scan d’endpoints via 404 répétés, tentative d’exfiltration via réponses volumineuses, anomalies par IP/user.

### Couche 4 — Métriques sécurité

- Exposer des compteurs agrégés (`auth_failures_total`, `suspicious_requests_total`, latence HTTP) sans labels à cardinalité explosive.
- Garder Grafana/backoffice comme lecture agrégée ; ne pas transformer chaque requête interne en événement sécurité détaillé.

## Priorité proposée

1. **P0** : secrets, endpoints exposés, auth/admin, JWT, WAF/rate limit, Docker socket, Redis/Postgres non publics.
2. **P1** : injections, XSS, mass assignment, IDOR, CORS, scans URL/paramètres, logs sensibles.
3. **P2** : DoS contrôlé, TLS prod, spoofing avancé, mobile reverse engineering, rapports UI avancés.
