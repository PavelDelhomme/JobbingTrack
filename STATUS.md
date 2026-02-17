# 📊 État du Projet JobbingTrack

**Dernière mise à jour** : Février 2026

---

## 🎯 Vue d’ensemble de l’application

| Domaine | Description | Statut |
|--------|-------------|--------|
| **API REST** | API Gateway + microservices (auth, application, company, contact, interview, call, event, followup, profile, notification, workflow, deployment, dashboard) | ✅ Opérationnel |
| **Monitoring** | monitoring-c (C), log-collector-c, métriques temps réel | ✅ Opérationnel |
| **Collecteur de statistiques** | metrics-aggregator-service (Node), persistance Prisma/PostgreSQL, snapshots système et conteneurs | ✅ Opérationnel (après `make db-push-metrics`) |
| **Historique des métriques** | PostgreSQL (system_metrics, container_metrics, tables Prisma metrics-aggregator), Analytics backoffice, périodes 1h → 30j + plage personnalisée | ✅ En place |
| **Sécurité / Firewall** | security-service, WAF dans l’API Gateway, firewall engine (iptables, fallback en dev) | ✅ Opérationnel |
| **Système de comptes** | auth-service (JWT, refresh, inscriptions, rôles) | ✅ Opérationnel |
| **Application mobile** | À documenter / prévu selon projet | ⏳ Selon roadmap |

---

## ✅ Ce qui fonctionne (Février 2026)

### 🏥 Healthchecks et services
- Healthchecks configurés pour tous les services (frontend, api-gateway, auth, dashboard, application, company, contact, interview, call, event, followup, profile, notification, workflow, security, deployment, metrics-aggregator, monitoring-c, log-collector, postgres, redis).
- `make status` : affichage healthy/unhealthy/starting avec couleurs et uptime.
- `make logs` : utilise `docker compose logs -f` (plus d’erreur « No such container »).

### 🔒 Sécurité
- **security-service** : healthcheck OK, `trust proxy` corrigé (`1` au lieu de `true`).
- **WAF** : intégré à l’API Gateway.
- **Firewall** : moteur iptables avec fallback en développement.

### 📊 Monitoring et métriques
- **monitoring-c** : collecteur C, endpoint `/api/v1/metrics`, persistance PostgreSQL (system_metrics, container_metrics).
- **metrics-aggregator-service** : agrégation, persistance Prisma (snapshots, logs conteneurs, disponibilité services). Tables créées via `make db-push-metrics` (voir ci‑dessous).
- **Frontend backoffice** : Vue d’ensemble (CPU système/projet, mémoire, temps de réponse), Statistiques, Analytics avec graphiques et compression.

### 📈 Analytics et historique
- Périodes : 1h, 6h, 24h, 3j, 7j, 14j, 21j, 30j + **plage personnalisée** (date picker).
- Compression des points pour les graphiques (CPU système).
- Données de test : `scripts/db/generate-24h-test-data.sh` (48h de données fictives).

### 🗄️ Base de données et Prisma
- **PostgreSQL** : utilisé par auth, microservices, monitoring-c et metrics-aggregator.
- **Prisma metrics-aggregator** : schéma avec `url = env("DATABASE_URL")` ; **Prisma 6.x** (6.7.0) dans le service (pas Prisma 7).
- **make db-push-metrics** : charge `DATABASE_URL` depuis le `.env` à la racine (`$(ROOT_DIR)/.env`), puis exécute `npx prisma db push` dans le metrics-aggregator. **À lancer depuis la racine du repo** ; Postgres doit être démarré (ex. `docker compose up -d postgres`) et le port dans `.env` (ex. `POSTGRES_PORT=5000`) doit correspondre au mapping Docker.

### 🎨 Frontend
- Token expiré : nettoyage silencieux (plus d’erreurs console).
- Page Statistiques : `preferencesService` importé.
- Temps de réponse : affichage « N/A » ou « X ms » (y compris 0 ms).
- État du système : 2 colonnes (CPU Système / CPU Projet | Mémoire Système / Mémoire Projet).
- Compteur « services unhealthy » aligné avec la liste (is_healthy = health_status === 'healthy').

### 📁 Fichier .env à la racine
- **DATABASE_URL** : présent (ex. `postgresql://...@localhost:5000/jobbingtrack?schema=public`) pour Prisma / CLI.
- **SMTP_FROM** : valeur avec `<...>` **entre guillemets** (ex. `SMTP_FROM="JobbingTrack <noreply@jobbingtrack.test>"`) pour éviter une erreur de syntaxe lors du `source` dans le Makefile.

---

## 🔄 En cours / À faire

### Graphiques et Analytics
- Étendre la **compression** aux graphiques **mémoire** et **réseau**.
- Vérifier que l’API historique (metrics-aggregator / monitoring-c) accepte **startDate/endDate** pour la plage personnalisée.

### Monitoring-c
- Parfois en mode `starting` ; ERR_EMPTY_RESPONSE occasionnel — à surveiller.
- Healthcheck dédié et retry côté frontend possibles.

### Temps de réponse et benchmark
- **Carte temps de réponse** : les health checks monitoring-c utilisent le port **interne** du conteneur (réseau Docker) pour mesurer le temps de réponse ; la Vue d’ensemble et Performances & Analytics affichent la valeur depuis `fetchMetrics()` (avg_response_time_ms). Si la carte affiche encore 0 ms, vérifier que les conteneurs exposent `/health` et que monitoring-c peut les joindre.
- **Performance & Analytics** : premier onglet **CPU Système** (historique + vérification enregistrement) ; onglets Mémoire et Réseau en placeholder. Plus tard : panneau logs sécurité / firewall / menaces dans le dashboard admin.

### Autres
- **deployment-service** : message « Table Deployment non trouvée » en dev — à traiter si besoin (schéma Prisma / migrations).
- Tests de charge pour monitoring-c.
- Documentation / CI pour tests de performance.

---

## 🚀 Commandes utiles

```bash
# Depuis la racine du repo

# Statut de tous les services
make status

# Démarrer tous les services (Postgres doit tourner pour db-push-metrics)
make up-full
docker compose up -d postgres   # si besoin

# Créer / synchroniser les tables Prisma du metrics-aggregator (historique, logs, etc.)
make db-push-metrics

# Logs
make logs
make monitoring-c-logs

# Données de test (48h)
./scripts/db/generate-24h-test-data.sh

# Nettoyer les métriques
make db-push-metrics
make db-clean-metrics

# Arrêter
make down
```

**Note db-push-metrics** : utilise le `.env` à la racine pour `DATABASE_URL`. Si erreur « Environment variable not found: DATABASE_URL », vérifier que `.env` contient bien `DATABASE_URL=postgresql://...@localhost:PORT/jobbingtrack?schema=public` (PORT = `POSTGRES_PORT`, ex. 5000). La cible doit être lancée **depuis la racine** (`make db-push-metrics`), pas depuis `backend/metrics-aggregator-service`.

---

## 📊 Statistiques projet

- **Services** : 21+ avec healthchecks (API Gateway, auth, microservices métier, security, metrics-aggregator, monitoring-c, log-collector, postgres, redis, frontend).
- **Monitoring** : monitoring-c (C) + log-collector-c ; ancien stack Prometheus/Grafana/Loki supprimé.
- **Persistance métriques** : PostgreSQL (monitoring-c + metrics-aggregator Prisma).

---

## 📝 Références

- **ERRORS.md** : erreurs rencontrées et statut (corrigées / en cours).
- **RESOLUTIONS.md** : résolutions appliquées (sécurité, frontend, Prisma, .env, make).
