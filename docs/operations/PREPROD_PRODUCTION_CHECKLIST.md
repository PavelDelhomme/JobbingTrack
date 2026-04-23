# Checklist préproduction / production — JobbingTrack

**Rôle** : regrouper ce que **seul un humain sur l’infra** peut valider (hôte, NTP, TLS, secrets, observabilité). Les tâches **automatisables dans le dépôt** restent dans **`PLAN.md`** / **`TODOS.md`** / **`make tests`**.

**Documents liés** : **`PLAN.md`** (lots B, G), **`TODOS.md`**, **`STATS.md`** (CVE), **`docs/deployment/production/README.md`**, **`docs/tests/TESTS_END.md`**.

---

## A. Temps & confiance des horodatages

- [ ] **NTP** (ou équivalent cloud) **synchronisé** sur chaque hôte exécutant API, BDD, workers et conteneurs sensibles — **avant** de s’appuyer sur les logs pour enquête post-incident (**lot B6**).
- [ ] Vérifier le **fuseau** documenté pour Postgres / agrégateur métriques (voir **`PLAN.md`** lot A5, variables `TZ` / `PGTZ`).

## B. Secrets & réseau

- [ ] **`SECURITY_INTERNAL_SECRET`** (et secrets JWT) : **valeurs fortes** uniques ; **aucun** défaut type `jobbingtrack-internal-security-dev` en production (voir **`ERRORS.md`**).
- [ ] Endpoints backup / admin : **non exposés** sur Internet sans tunnel ou IP allowlist (**lot G**).

## C. Traçabilité (B6–B8)

- [ ] Confirmer que les **microservices** loguent bien **`X-Request-Id`** une fois le middleware déployé sur chaque service (suivi technique dans **`TODOS.md`** § B6).
- [ ] Vérifier **manuellement** dans l’UI ou la BDD du **security-service** qu’une recherche par **`requestId` / métadonnées** est possible pour vos scénarios d’enquête (index, requête SQL, ou outil SIEM externe — à trancher selon implémentation).
- [ ] **Mobile** : même type d’identifiant sur les appels API (à valider sur build réel, pas seulement en simulateur).

## D. Détection d’intrusion (gateway)

- [ ] Avec **`INTRUSION_DETECTION_ENABLED=true`** (défaut si absent) : **Redis** joignable depuis l’API Gateway ; surveiller les **faux positifs** (règles critiques qui bloquent en 403).
- [ ] En cas de problème : **`INTRUSION_DETECTION_ENABLED=false`** dans l’environnement du conteneur gateway (temporaire), puis corriger règles / allowlist.

## E. Tests & release

- [ ] **`make tests`** (ou **`make test-all`**) vert avec la stack **Docker** (**`make up-full`**) : l’étape **Jest API Gateway** s’exécute dans le conteneur **`jobbingtrack-api-gateway`** quand il est up (voir **`scripts/run-all-tests-with-reports.sh`** § 6a).
- [ ] **Scripts de perf** (`tests/performance/`) : vérifier que les scénarios **métier** utilisent **`API_GATEWAY_URL`** (chemins **`/api/v1/...`**) et ne contournent pas la gateway par des **`localhost:300x`** obsolètes — **`test-performance.js`** déjà aligné ; **`test-load-advanced.js`** : auth via gateway, **reste** companies/applications (voir **`PLAN.md`** F1 / F3, **`STATUS.md`** § Tests de performance, **`TODOS.md`** F3b). Exception documentée : **metrics-aggregator** pour l’infra.
- [ ] Parcourir **`docs/tests/TESTS_END.md`** pour les points encore manuels avant bascule.
- [ ] Garder **`.env`** aligné avec **`.env.example`** (mêmes clés, valeurs réelles hors dépôt) — revue à chaque ajout de variable.

## F. Courriel (SMTP) et rapports de crash

- [ ] **`SMTP_USER`** et **`SMTP_PASS`** : renseigner les **identifiants réels** du fournisseur (OVH, SendGrid, etc.) — **jamais** de placeholders en prod ; le **`.env`** reste hors Git.
- [ ] **TLS / SSL** : aligner **`SMTP_PORT`**, **`SMTP_SECURE`**, **`SMTP_USE_SSL`** (et évent. `TLS_REJECT_UNAUTHORIZED` si besoin) sur la **doc officielle** du fournisseur (ex. **465** implicit TLS vs **587** STARTTLS).
- [ ] **`CRASH_REPORT_EMAIL`** : utiliser une **adresse dédiée** (boîte fonctionnelle, filtrage, quota) digne d’un **flux crash report** (sujet lisible, pas une boîte personnelle unique sans tri) ; vérifier que les services qui envoient les rapports (auth / gateway / mobile selon config) **pointent** bien vers cette adresse en prod.
- [ ] **(Roadmap — lot B11 / `TODOS.md`)** Alertes **email** sur **incidents critiques** (sécurité très grave, firewall, **down** service ou partie du projet) : quand implémenté, prévoir **boîtes / listes dédiées**, **seuils** et **rate-limit** côté produit pour ne pas saturer la même file que les crash reports ; réutiliser la même **base SMTP** et les mêmes exigences TLS que ci-dessus.
- [ ] En dev **MailHog** : conserver une valeur de test cohérente ; voir **`docs/emails/`** et **`.env.example`**.

---

*Dernière mise à jour : avril 2026 — F SMTP / crash report + note B11 alertes critiques ; E Jest gateway conteneur + perf scripts gateway.*
