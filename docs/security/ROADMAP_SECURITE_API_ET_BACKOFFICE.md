# Roadmap sécurité API, tests offensifs et backoffice

**Rôle** : feuille de route produit (OWASP API 2023, auth, injections, DoS, secrets, IA offensive/défensive, PQC) alignée sur l’existant JobbingTrack. Les détails opérationnels des commandes restent dans **[SECURITY_TESTING_MATRIX.md](SECURITY_TESTING_MATRIX.md)** ; le pilotage des cases dans **[../TODOS.md](../TODOS.md)**.

**Environnement** : tests destructifs ou de charge uniquement sur lab local / préprod autorisée. En **dev**, `INTRUSION_RELAX_HEURISTICS=true` (défaut Compose) évite les faux positifs DoS sur le trafic Nginx → gateway (`172.19.0.1`, Bearer). Pour un pentest réaliste : `INTRUSION_RELAX_HEURISTICS=false` + `NODE_ENV=production` sur une stack dédiée.

---

## Déjà en place (à valider porteur)

| Capacité | Où |
|----------|-----|
| WAF + détection intrusion gateway | `backend/api-gateway`, logs `INTRUSION …` |
| CVE / Dependabot → BDD | `security-service`, cron `DEPENDABOT_ALERTS_*`, UI `/backoffice/security` |
| Rapports sécurité dans le backoffice | `/backoffice/test-reports` (type `security`), `reports/security/**` |
| Matrice tests offensifs + scripts | `SECURITY_TESTING_MATRIX.md`, `makefiles/security/Makefile`, `scripts/security/*` |
| Corrélation requêtes | `requestId` / `correlationId` gateway + forensics partiels menaces |

---

## Phase 1 — P0 lab (sans UI dédiée)

- [ ] **Auth** : brute force, credential stuffing, password spraying (`hydra` / scripts bornés) ; JWT (`jwt_tool` : `alg=none`, clé faible, expiry) — voir matrice.
- [ ] **DoS applicatif contrôlé** : rate limit gateway, endpoints lourds (`/metrics`, `/security/logs?limit=2000`) ; pas confondre avec le polling backoffice légitime.
- [ ] **Dictionnaire / mots de passe faibles** : politique hash + liste interdite ; rapport hors prod.
- [ ] **Vol de session** : cookies `Secure`/`HttpOnly`/`SameSite`, rotation post-login, refresh révoqué — scénarios Burp / Playwright lab.
- [ ] **Scans P0** : `gitleaks` historique, Trivy images prod, `nmap` préprod, ZAP actif via gateway (`SECURITY_ACTIVE_SCAN=1`).

**Énumération utilisateurs (messages login)** : messages génériques **uniquement en préprod/prod** ; en dev, messages détaillés autorisés pour faciliter les tests (documenter dans `auth-service`).

---

## Phase 2 — Autorisation et données (API REST)

- [ ] **BOLA / IDOR** : matrice rôle × ressource × méthode ; tests avec deux comptes lab.
- [ ] **Contrôle fonction** : endpoints admin sans rôle `SUPER_ADMIN` / RBAC serveur.
- [ ] **Champs sensibles** : pas d’over-sharing JSON ; erreurs sans stack/SQL en prod (`JT_DEPLOYMENT_ENV` / mode debug token).
- [ ] **Actions bulk** : garde-fous delete/export massif + audit log.
- [ ] **GraphQL** : N/A si non utilisé — ignorer sauf introduction future.

---

## Phase 3 — Injections et validation

- [ ] SQL / NoSQL / command / template / LDAP — payloads matrice + tests API ciblés.
- [ ] Validation schéma stricte (types, enum, tailles) côté **backend** sur chaque service exposé.
- [ ] XSS / Content-Type : CSP, encodage sortie si contenu riche.

---

## Phase 4 — Infrastructure et configuration

- [ ] TLS/HSTS prod ; headers sécurité ; pas de `.env` / `.git` exposés.
- [ ] **Misconfiguration** : debug off, staging non exposé, ports `0.0.0.0` réduits (`COMPOSE_RUNTIME_HARDENING`).
- [ ] Secrets : pas en localStorage (préférer cookies httpOnly ou pattern documenté), rotation clés API.

---

## Phase 5 — Backoffice sécurité (produit)

Objectif : lancer / consulter les contrôles **non destructifs** depuis l’UI, corréler avec les rapports fichiers.

- [ ] **Tableau de bord** : score CVE, dernier scan, alertes ouvertes `critical/high`.
- [ ] **CVE** : liste Dependabot + Trivy importée, tri P0, lien vers correctif / PR.
- [ ] **Tests offensifs** : boutons ou liens vers rapports `security-*` + statut dernier run CI.
- [ ] **Forensics** : preuves par menace (`requestId`, endpoint, IP, décision WAF, payload redigé) — suite lot B forensics `TODOS.md`.
- [ ] **Lab pentest** (préprod) : mode « durcissement » (`INTRUSION_RELAX_HEURISTICS=false`) documenté, fenêtre horaire.

---

## Phase 6 — Menaces IA et crypto post-quantique (planification)

- **IA offensive** (adversaire) : bruteforce intelligent, évitement détection, abus logique métier — réponse : UEBA, corrélation logs, rate limit adaptatif, tests DAST réguliers.
- **IA défensive** : corrélation multi-sources, alertes comportementales API — s’appuyer sur `security-service` + metrics-aggregator / Rust monitoring.
- **Endpoints IA** (si ajoutés) : prompt injection, quotas, pas de secrets dans le contexte.
- **PQC** : inventaire usages TLS/signatures ; viser crypto-agilité ; TLS hybride côté edge (Cloudflare/NPM) en prod — pas de refonte applicative immédiate.

---

## Faux positif DoS en dev (référence)

**Symptôme** : `DOS_ATTACKS`, IP `172.19.0.1`, `origin: https://jobbingtrack.localhost:5443`, routes `/api/v1/security/*`, `/api/v1/metrics`, polling ~5 s.

**Cause** : trafic **légitime** du navigateur via le proxy Docker ; heuristiques DoS sensibles aux en-têtes `x-forwarded-*` et aux JWT longs dans les logs.

**Correctif (18/05)** : `INTRUSION_RELAX_HEURISTICS` (défaut `true` sur api-gateway Compose) + skip DoS en runtime dev ; masquage Bearer/JWT dans les logs d’intrusion.

**Validation** : recréer `jobbingtrack-api-gateway`, naviguer `/backoffice/security` — plus de rafale `⚠ INTRUSION ÉLEVÉE` en dev.

## Faux positif Brute Force (`172.19.0.x`)

**Symptôme** : menace `BRUTE_FORCE`, IP source `172.19.0.16` → `172.19.0.4`, statut bloqué / non bloqué dans l’historique.

**Cause** : trafic **inter-conteneurs** ou tests login (même réseau Docker) ; ce n’est pas un attaquant Internet. En dev, `shouldPersistentlyBlockIp` n’écrit pas de ban durable sur IP privée, mais des entrées peuvent rester en BDD.

**Correctif (18/05)** : skip compteur brute-force en runtime dev (`INTRUSION_RELAX_HEURISTICS` / IP privée hors prod). Nettoyer les anciennes menaces de test via l’UI firewall si besoin.

## Redémarrage stack — logs « effrayants » mais souvent normaux

| Message | Gravité |
|---------|---------|
| Postgres `shutting down` / `checkpoint` | Normal (arrêt propre) |
| `FATAL: the database system is starting up` | Transitoire (client trop tôt) |
| `Connection reset by peer` | Normal pendant restart |
| Redis `Memory overcommit` | Avertissement hôte (`sysctl vm.overcommit_memory=1`) |
| api-gateway `npm error signal SIGTERM` | Normal à l’arrêt Docker |
| **`relation "log_collector_logs" does not exist`** | **Réel** — `bash scripts/db/db-push-all.sh` ou `ensure-log-collector-tables.sql` |

---

## Liens

- [Matrice tests](SECURITY_TESTING_MATRIX.md)
- [CVE continu](CVE_CONTINUOUS_MONITORING.md)
- [Dependabot](DEPENDABOT_ALERTS_INTEGRATION.md)
- [Audit projet](AUDIT_SEC_PROJECT.md)
- [HTTPS dev](../operations/DEV_HTTPS.md)
- [Login / 401](../troubleshooting/TROUBLESHOOTING_LOGIN.md)
