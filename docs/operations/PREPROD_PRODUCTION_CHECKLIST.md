# Checklist préproduction / production — JobbingTrack

**Rôle** : regrouper ce que **seul un humain sur l’infra** peut valider (hôte, NTP, TLS, secrets, observabilité). Les tâches **automatisables dans le dépôt** restent dans **`PLAN.md`** / **`TODOS.md`** / **`make tests`**.

**Documents liés** : **`../PLAN.md`** (lots B, G, H), **`../TODOS.md`**, **`RELEASE_PREPROD_PRODUCTION_PLAN.md`** (séquence tests complets → préprod → bêta mobile → prod, licences, RGPD, déploiements), **`../security/STATS.md`** (CVE), **`../deployment/production/README.md`**, **`../deployment/VPS_PORTAINER_NPM_OVH.md`** (VPS / Portainer / NPM / OVH), **`PRE_VPS_ENV_AUDIT_AND_UPDATES.md`** (inventaire `.env` / secrets **hors Git** avant VPS), **`../tests/TESTS_END.md`**.

---

## A. Temps & confiance des horodatages

- [ ] **NTP** (ou équivalent cloud) **synchronisé** sur chaque hôte exécutant API, BDD, workers et conteneurs sensibles — **avant** de s’appuyer sur les logs pour enquête post-incident (**lot B6**).
- [ ] Vérifier le **fuseau** documenté pour Postgres / agrégateur métriques (voir **`PLAN.md`** lot A5, variables `TZ` / `PGTZ`).

## B. Secrets & réseau

- [ ] **Compose / conteneurs** : suivre **`docs/security/COMPOSE_RUNTIME_HARDENING.md`** (**lot B14**, **BX1–BX14**) — pas de réutilisation des **fallbacks de dev** en prod ; **`METRICS_API_KEY`**, **`JWT_SECRET`**, **`POSTGRES_PASSWORD`**, **`REDIS_PASSWORD`** (quand Redis sera sécurisé) : **forts** et **hors Git**.
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
- [x] **Scripts de perf** (`tests/performance/`) : vérifier que les scénarios **métier** utilisent **`API_GATEWAY_URL`** (chemins **`/api/v1/...`**) et ne contournent pas la gateway par des **`localhost:300x`** obsolètes — **`test-performance.js`** et **`test-load-advanced.js`** sont alignés gateway (`normalizeGatewayUrlForHost`). Exception documentée : **metrics-aggregator** pour l’infra.
- [ ] **GitHub Actions — Security Audit** : lancer manuellement le workflow **Security Audit** avec `scan_prod_images=true` avant préprod/prod pour construire `docker-compose.prod.yml` et scanner les images via Trivy. Télécharger l’artefact **`trivy-prod-image-reports`**, trier les `HIGH`/`CRITICAL` dans `docs/security/STATS.md` et bloquer la release si un risque exploitable non justifié reste ouvert. Procédure : `docs/ci-cd/README.md` § Security Audit et scan Trivy images prod.
- [ ] Parcourir **`docs/tests/TESTS_END.md`** pour les points encore manuels avant bascule.
- [ ] Garder **`.env`** aligné avec **`.env.example`** (mêmes clés, valeurs réelles hors dépôt) — revue à chaque ajout de variable.
- [ ] Avant merge vers prod : appliquer le gate **lot H** (`RELEASE_PREPROD_PRODUCTION_PLAN.md`) : branche tests complets, préprod validée, scans sécurité P0, licences, RGPD, sauvegarde/restauration, monitoring/alerting, rollback.

## F. Backoffice — KPI hub avant ouverture

- [ ] **Vue d’ensemble `/backoffice`** : vérifier que chaque carte KPI (sessions, sécurité, santé, latence, CPU/RAM) affiche une valeur cohérente avec la page de destination — en particulier **Sessions actives** (retour porteur 22/06 : écart 2 vs ~100, comptes E2E). Gate détaillé : **`../production/A_VALIDER_AVANT_PRODUCTION.md`** ; correctif : **`../pilotage/TODOS.md`** § Sessions actives.
- [ ] Purge ou exclusion documentée des **comptes/données de test** en préprod (ne pas porter la pollution E2E locale en prod) — voir aussi **`../pilotage/TODOS.md`** § nettoyage données test.

## G. Courriel (SMTP) et rapports de crash

- [ ] **MailHog absent du chemin préprod/prod** : `SMTP_HOST` ne vaut pas `mailhog`, `localhost`, `127.0.0.1` ou un service Docker de test ; `NOTIFICATION_SMTP_HOST` ne force pas MailHog ; MailHog n’est pas exposé publiquement.
- [ ] **`SMTP_USER`** et **`SMTP_PASS`** : renseigner les **identifiants réels** du fournisseur (OVH, SendGrid, etc.) — **jamais** de placeholders en prod ; le **`.env`** reste hors Git.
- [ ] **TLS / SSL** : aligner **`SMTP_PORT`**, **`SMTP_SECURE`**, **`SMTP_USE_SSL`** (et évent. `TLS_REJECT_UNAUTHORIZED` si besoin) sur la **doc officielle** du fournisseur (ex. **465** implicit TLS vs **587** STARTTLS).
- [ ] **`CRASH_REPORT_EMAIL`** : utiliser une **adresse dédiée** (boîte fonctionnelle, filtrage, quota) digne d’un **flux crash report** (sujet lisible, pas une boîte personnelle unique sans tri) ; vérifier que les services qui envoient les rapports (auth / gateway / mobile selon config) **pointent** bien vers cette adresse en prod.
- [ ] **Smoke emails réels** : reset/vérification compte, crash report ou test notification, alerte sécurité critique, puis futur digest agent email ; chaque smoke doit produire réception réelle + ligne `EmailLog` `SENT` + sujet lisible + absence de secret dans le contenu.
- [ ] **(Roadmap — lot B11 / `TODOS.md`)** Alertes **email** sur **incidents critiques** (sécurité très grave, firewall, **down** service ou partie du projet) : prévoir **boîtes / listes dédiées**, **seuils** et **rate-limit** côté produit pour ne pas saturer la même file que les crash reports ; réutiliser la même **base SMTP** et les mêmes exigences TLS que ci-dessus.
- [ ] En dev **MailHog** : conserver une valeur de test cohérente ; voir **`docs/emails/`** et **`.env.example`**.

---

*Dernière mise à jour : 22 juin 2026 — section F backoffice KPI (Sessions actives) ; historique : gate Security Audit Trivy ; F/G SMTP / crash report ; E Jest gateway + perf scripts.*
