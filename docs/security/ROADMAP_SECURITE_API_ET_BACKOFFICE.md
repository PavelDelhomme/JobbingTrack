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

## Phase 6 — Menaces « boostées » par l’IA (offensive)

À couvrir par tests contrôlés, playbooks et veille (pas d’outil FraudGPT en prod).

| Vecteur | Description | Tests / défense JobbingTrack |
|---------|-------------|------------------------------|
| Spear phishing | Textes ultra-ciblés, multilingues (modèles type FraudGPT/WormGPT) | Sensibilisation, MFA, détection phishing mail (notification-service), pas de secrets par email |
| Malware / exploits | Génération de scripts, variantes ransomware, bypass signatures | Trivy images, durcissement conteneurs, moindre privilège, pas d’exécution shell depuis l’API |
| Playbooks industrialisés | Traduction et kits Cybercrime-as-a-Service | Matrice B15, CI `security-audit.yml`, rapports `reports/security/**` |

### Cycle d’attaque automatisé (à tester par phase)

1. **Reconnaissance** : scans de masse, corrélation OSINT, listes de cibles scorées → limiter surface (`nmap` préprod, inventaire endpoints, pas de debug exposé).
2. **Exploitation asservie** : bots qui adaptent payloads selon HTTP/erreurs → WAF gateway, validation schéma, tests ZAP actif bornés.
3. **Mouvement latéral** : exploration API/réseau pour comptes privilégiés → RBAC, auth interne services, pas de `docker.sock` exposé (BX2).
4. **Exfiltration furtive** : rythme/volume sous seuils SIEM → rate limit, alertes sur exports massifs, corrélation `requestId`.

### Risques spécifiques API / appli web

- **Bruteforce intelligent** : patterns de mots de passe, orchestration distribuée → rate limit login, lockout, `BRUTE_FORCE_THRESHOLD`, lab `jwt_tool`.
- **Abus logique métier** : exploration workflows (signup, parrainage, export) → tests rôles, garde-fous bulk, audit logs.
- **Évasion détection** : UA cohérent, rythme « humain » → UEBA (phase 7), ne pas se fier qu’à IP seule.
- **Endpoints IA** (si exposés) : prompt injection, vol de modèle, secrets en contexte → quotas, filtrage prompts, pas de secrets dans les logs.

---

## Phase 7 — Défense augmentée par l’IA

Hypothèse : l’adversaire utilise l’IA → renforcer la défense par corrélation et automatisation **bornée**.

- [ ] **UEBA / anomalies API** : séquences d’endpoints, écarts par user/IP/device (metrics + `security_logs`).
- [ ] **Corrélation multi-sources** : agrégation logs API + auth + infra (gateway, Rust monitoring) pour attaques multi-étapes.
- [ ] **Réponse automatisée** : blocage IP dynamique, durcissement WAF temporaire, rotation tokens incident (politique à cadrer).
- [ ] **DAST intelligent** : fuzzing / scanning régulier (ZAP, scripts matrice) en CI ou stack lab dédiée.

---

## Phase 8 — Menace quantique et crypto post-quantique (PQC)

- **Shor** : RSA/ECC classiques compromis à terme → TLS, signatures, échanges de clés.
- **Collect now, decrypt later** : capture TLS aujourd’hui, déchiffrement dans 5–15 ans → données sensibles longue durée = priorité PQC.
- **Calendrier** : abandon RSA/ECC seuls vers **2030–2035** ; NIST (Kyber / ML-KEM, Dilithium).

### PQC en pratique (roadmap infra)

- [ ] **Inventaire crypto** : TLS, JWT, secrets at-rest, backups (doc + checklist lot G).
- [ ] **Crypto-agilité** : pouvoir changer d’algo sans refonte totale.
- [ ] **TLS hybride** : edge NPM/Cloudflare avec suites classique + post-quantique (ML-KEM) quand disponible sur le VPS.
- [ ] **Appli** : pas de migration applicative immédiate ; surveiller libs/HSM/KMS PQC-ready.

---


## Faux positif DoS en dev (référence)

**Symptôme** : `DOS_ATTACKS`, IP `172.19.0.1`, `origin: https://jobbingtrack.localhost:5443`, routes `/api/v1/security/*`, `/api/v1/metrics`, polling ~5 s.

**Cause** : trafic **légitime** du navigateur via le proxy Docker ; heuristiques DoS sensibles aux en-têtes `x-forwarded-*` et aux JWT longs dans les logs.

**Correctif (18/05)** : `INTRUSION_RELAX_HEURISTICS` (défaut `true` sur api-gateway Compose) + skip DoS en runtime dev ; masquage Bearer/JWT dans les logs d’intrusion.

**Validation** : recréer `jobbingtrack-api-gateway`, naviguer `/backoffice/security` — plus de rafale `⚠ INTRUSION ÉLEVÉE` en dev.

## Faux positif Brute Force (`172.19.0.x`) — deux sources distinctes

| Source | Module | Comportement |
|--------|--------|--------------|
| **Gateway** | `api-gateway` / `intrusionDetector.js` | Compteur Redis sur `POST /auth/login` |
| **Réseau Docker** | `security-service` / `network-monitor.js` | Compte les connexions TCP `TIME_WAIT`/`CLOSE` entre conteneurs (>20) comme « brute force » |

**Symptôme UI** : menace `BRUTE_FORCE`, `172.19.0.16` → `172.19.0.4`, parfois **auto-bloquée** (sévérité HIGH).

**Ce n’est pas** un attaquant Internet : c’est le **trafic normal du bridge Docker** (postgres, redis, services qui se parlent).

**Correctifs (18/05)** :
- Gateway : `INTRUSION_RELAX_HEURISTICS` + skip brute-force IP privée en dev.
- Security-service : `SECURITY_NETWORK_RELAX_INTERNAL` (défaut = relax hors prod) — ne plus **créer** de menaces sur IP `172.16–31.x` en dev.

**Historique** : les lignes déjà en BDD restent visibles ; supprimer via UI firewall/menaces ou purge lab si besoin.

## Logs sécurité — pas de compression, mais des plafonds

| Couche | Comportement |
|--------|--------------|
| **Postgres `security_logs`** | Pas de compression applicative ; stockage ligne à ligne |
| **API** | `limit` + `startDate` (défaut API **24 h** si `startDate` absent) |
| **UI vue d’ensemble** | `startDate` = **30 j** + `limit=2000` → si >2000 événements/30 j, affichage **tronqué** |
| **UI page `/security/logs`** | `limit=100` par requête + pagination locale 25/ligne |

**À faire** : pagination API, bannière « tronqué », rétention/purge configurable (TODOS).

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
