# 🔍 Rapport d’analyse des erreurs

**Dernière mise à jour** : Février 2026

---

## ✅ Erreurs corrigées (Février 2026)

### Prisma et base de données (metrics-aggregator)
- **P1012 « The datasource property `url` is no longer supported »** — Le projet utilise **Prisma 6.x** (6.7.0) dans `backend/metrics-aggregator-service`. Ne pas utiliser Prisma 7 en global ; les versions `prisma` et `@prisma/client` sont fixées en 6.7.0 dans le `package.json`.
- **P1012 « Environment variable not found: DATABASE_URL »** — `make db-push-metrics` charge désormais le `.env` à la racine (`$(ROOT_DIR)/.env`). Le fichier `.env` doit contenir `DATABASE_URL=postgresql://...@localhost:PORT/jobbingtrack?schema=public` (PORT = `POSTGRES_PORT`, ex. 5000).
- **Erreur de syntaxe au source du .env (ligne 44)** — `SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>` provoquait une erreur shell à cause de `<` et `>`. **Correction** : mettre la valeur entre guillemets : `SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"`.
- **P1001 « Can't reach database server »** — Vérifier que Postgres est démarré (`docker compose up -d postgres`) et que `DATABASE_URL` utilise le bon port (celui exposé sur l’hôte, ex. 5000).

### Table User manquante (auth-service)
- **« The table `public.User` does not exist in the current database »** — L'auth-service utilise la même base PostgreSQL ; si les tables du schéma auth n'ont jamais été créées, cette erreur apparaît. **Correction** : exécuter **`make db-push-auth`** (crée les tables User, etc.) ou **`make db-push-all`** (tous les schémas). Postgres doit être démarré avant.

### Services et frontend
- **security-service** : `ValidationError: ERR_ERL_PERMISSIVE_TRUST_PROXY` — `trust proxy` passé de `true` à `1`.
- **Frontend – Token expiré** : Nettoyage silencieux (plus de messages console).
- **Page Statistiques** : `ReferenceError: preferencesService is not defined` — import `preferencesService` ajouté.
- **Vue d’ensemble – Temps Réponse** : Affichage « N/A » ou « X ms » (y compris 0 ms).
- **make logs** : « No such container » — utilisation de `docker compose config --services` puis `docker compose logs -f`.
- **metrics-aggregator** : Champ `log` (Object au lieu de String) — sérialisation en string avant `ContainerLog.create()`. Table `service_availability_history` absente — gérée par un warning en dev.
- **Backoffice – 6 services unhealthy** : `is_healthy` aligné sur `health_status === 'healthy'`.

---

## 📊 Résumé (état actuel)

### ✅ Résolu
- Erreurs Prisma P1012 (datasource url / DATABASE_URL) et chargement `.env` pour `db-push-metrics`.
- Syntaxe `.env` (SMTP_FROM entre guillemets).
- security-service, token expiré, Statistiques, Temps Réponse, make logs, metrics-aggregator persistence, compteur unhealthy.

### ⚠️ À surveiller
- **monitoring-c** : parfois en mode `starting` ; **ERR_EMPTY_RESPONSE** occasionnel.
- **Tables Prisma** : certains services peuvent encore avoir des tables manquantes (company, contact, etc.) ; créer les schémas / migrations si besoin.

### ⏳ En attente / non bloquant
- Tests (`make test-all`) peuvent échouer tant que toutes les tables et services ne sont pas en place.
- deployment-service : « Table Deployment non trouvée » en dev — à traiter si le service est utilisé.

### 🔧 Correctifs récents (temps de réponse et Analytics)
- **Carte temps de réponse à 0 ms** : monitoring-c utilisait le port hôte pour les health checks depuis le conteneur ; correction en utilisant le **port interne** du conteneur (docker inspect) pour construire l’URL de health check sur le réseau Docker. La carte Vue d’ensemble et Performances utilise `monitoringC.avg_response_time_ms` / `responseTime.average_ms` depuis `fetchMetrics()`.
- **Performance & Analytics** : premier onglet **CPU Système** avec graphique historique et vérification de l’enregistrement (nombre de points, dernier timestamp). Onglets **Mémoire** et **Réseau** prévus (placeholders). Temps de réponse dans l’onglet Performances alimenté par `fetchMetrics()` (monitoring-c / metrics-aggregator).

### 📋 À faire plus tard (dashboard admin)
- Panneau complet : **logs de sécurité**, **politiques de sécurité**, **firewall**, **réseau**, **menaces** dans l’interface dashboard admin (à brancher sur security-service et API existantes).

---

## 🎯 Prochaines vérifications

1. Exécuter `make db-push-metrics` depuis la racine avec Postgres démarré et `.env` correct.
2. Vérifier que le frontend affiche bien les métriques et que les graphiques Analytics chargent les données.
3. Surveiller les logs monitoring-c (ERR_EMPTY_RESPONSE, starting).

Pour le détail des correctifs appliqués, voir **RESOLUTIONS.md**.
