# ✅ Résolutions appliquées

**Dernière mise à jour** : Février 2026

---

## Février 2026 – Tests API depuis Docker (bash: not found)

- **Problème** : Lancement des tests API depuis le backoffice en Docker échouait avec `Command failed: ... /bin/sh: bash: not found`. Le conteneur frontend (Node) n’inclut pas `bash`.
- **Solution** : Remplacer **`bash`** par **`sh`** dans toutes les routes d’exécution de tests :
  - `frontend/src/app/api/test/run-api/route.ts` : `sh scripts/test-api-specific.sh`, `sh scripts/generate-test-report.sh`
  - `run-backend`, `run-frontend`, `run-backoffice`, `run-performance-backend`, **`run-performance-frontend`** : idem, `sh scripts/generate-test-report.sh ...`
- **Note** : Si `generate-test-report.sh` ou `test-api-specific.sh` échouent sous `sh` (p. ex. `echo -e` non POSIX), rendre les scripts POSIX ou installer `bash` dans le Dockerfile frontend.

---

## Février 2026 – Temps de réponse et Performance & Analytics

1. **monitoring-c – Health check et temps de réponse**  
   - Problème : la carte « Temps de réponse » affichait 0 ms ; les health checks depuis le conteneur monitoring-c utilisaient le port hôte (docker port) ou le nom du conteneur sans port, ce qui échouait sur le réseau Docker.  
   - Solution : dans `monitoring-c/src/collector.c`, récupération du **port interne** du conteneur via `docker inspect --format '{{range $p,$c := .NetworkSettings.Ports}}{{$p}}{{end}}'` (ex. `3001/tcp` → `3001`), puis construction de l’URL de health check avec `container_ip:port_interne`. Fallback sur `docker port` si besoin. Les temps de réponse sont ainsi renseignés et exposés dans `avg_response_time_ms` / `response_time_ms` par conteneur.

2. **Analytics – Temps de réponse et onglet CPU Système**  
   - Temps de réponse : dans la page Performances & Analytics, `loadPerformanceMetrics` utilise désormais `centralMetricsService.fetchMetrics()` pour lire `monitoringC.avg_response_time_ms` ou `responseTime.average_ms` et afficher la valeur (ou « N/A »).  
   - Nouvel onglet **CPU Système** en premier : graphique d’historique CPU à partir de `metricsHistory`, avec message de vérification (nombre de points, dernier enregistrement). Placeholders pour les onglets Mémoire et Réseau (à remplir plus tard).

---

## Février 2026 – Prisma, .env, make db-push-metrics

1. **Prisma 6.x pour metrics-aggregator**  
   - Problème : P1012 « datasource url no longer supported » avec Prisma 7 ; `@prisma/client@^6.22.0` n’existe pas sur npm.  
   - Solution : Fixer `prisma` et `@prisma/client` en **6.7.0** dans `backend/metrics-aggregator-service/package.json`. Le schéma reste avec `url = env("DATABASE_URL")` (compatible Prisma 6).

2. **DATABASE_URL pour Prisma**  
   - Problème : P1012 « Environment variable not found: DATABASE_URL » lors de `npx prisma db push` ou `make db-push-metrics`.  
   - Solution :  
     - Ajout de `DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@localhost:5000/jobbingtrack?schema=public` dans le `.env` à la racine (port = `POSTGRES_PORT`).  
     - Dans `makefiles/database/Makefile`, la cible `db-push-metrics` charge le `.env` depuis **$(ROOT_DIR)/.env** avant d’exécuter Prisma, et exporte `DATABASE_URL` avec une valeur par défaut si besoin.  
     - Création de `backend/metrics-aggregator-service/.env.example` pour les lancements manuels de Prisma depuis ce dossier.

3. **Erreur de syntaxe au source du .env**  
   - Problème : `../../.env: ligne 44: erreur de syntaxe près du symbole inattendu « newline »` (ligne `SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>`).  
   - Solution : Mettre la valeur entre guillemets dans `.env` : `SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"`. Ajout d’une note dans `.env.example` pour les valeurs contenant `<` ou `>`.

4. **make db-push-metrics depuis la racine**  
   - La cible `db-push-metrics` est définie dans le Makefile base de données, inclus depuis la racine. Elle doit être appelée par `make db-push-metrics` **depuis la racine du repo**, pas depuis `backend/metrics-aggregator-service`.

---

## Février 2026 – Services et frontend

5. **security-service** : `app.set('trust proxy', 1)` au lieu de `true` pour éviter `ERR_ERL_PERMISSIVE_TRUST_PROXY`.  
6. **Auth (token expiré)** : Nettoyage silencieux sans `console.error` / `console.warn`.  
7. **backoffice/statistics** : Ajout de `import { preferencesService } from '@/lib/services/preferencesService'`.  
8. **Vue d’ensemble – Temps Réponse** : Affichage « N/A » ou « X ms » (y compris 0 ms).  
9. **Vue d’ensemble – État du système** : Grille en 2 colonnes (CPU Système / CPU Projet | Mémoire Système / Mémoire Projet).  
10. **Performances & Analytics** : Périodes 7j, 14d, 21d, 30d + plage personnalisée (date picker) avec compression.  
11. **make logs** : Utilisation de `docker compose config --services` puis `docker compose logs -f`.  
12. **metrics-aggregator persistence** : Champ `log` en string pour `ContainerLog.create()` ; `saveServiceAvailability` gère l’absence de table (warning en dev).  
13. **Backoffice services** : `is_healthy` aligné sur `health_status === 'healthy'`.  
14. **Temps de réponse** : centralMetricsService et backoffice gèrent 0 ms correctement.

---

## État actuel (résumé)

- **Prisma / DB** : metrics-aggregator en Prisma 6.7.0 ; `make db-push-metrics` fonctionne avec `.env` à la racine (DATABASE_URL + SMTP_FROM quoté).  
- **Services** : security-service, auth, frontend (token, Statistiques, Temps Réponse, unhealthy) corrigés.  
- **Monitoring** : monitoring-c + metrics-aggregator opérationnels ; persistance et historique en place.

Voir **STATUS.md** pour la vue d’ensemble (section « À FAIRE » en premier, puis « Résolu / Fait ») et **ERRORS.md** pour le détail des erreurs et leur statut.
