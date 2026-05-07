# 📋 TODO - Optimisations Performance

**Contexte** : Pour la liste globale des tâches du projet (tests, sécurité, emails, etc.) et l’ordre de priorité, voir **`STATUS.md`** à la racine (section « À FAIRE »). Les tests de performance depuis le backoffice (Docker) s’exécutent avec **`sh`** (plus `bash`).

## 🎯 Objectifs
- **Frontend**: Réduire la mémoire de 1073MB à ~500MB (50%)
- **Backend (metrics-aggregator)**: Réduire CPU de 11.42% à ~5-7% et mémoire de 89MB à ~50-60MB

## ✅ Fait
- [x] Création des scripts de test de performance frontend
- [x] Création des scripts de test de performance backend
- [x] Documentation d'optimisation créée
- [x] Commandes Makefile ajoutées
- [x] Correction erreur permission analyze-bundle-frontend
- [x] **Backend - Pool de connexions Docker** : Instance Docker unique réutilisable
- [x] **Backend - Cache métriques système** : Cache avec TTL de 5 secondes
- [x] **Backend - Collecte parallèle** : Collecte de 5 conteneurs en parallèle
- [x] **Backend - Batch Prisma inserts** : Utilisation de createMany au lieu de create individuels
- [x] **Backend - Collecte différentielle** : Intervalles différents selon le type de métrique (critique: 5s, normal: 15s, low: 60s)
- [x] **Frontend - Baril icônes lucide-react** : Création de `/lib/icons/index.ts` pour tree-shaking
- [x] **Frontend - Optimisation imports** : Migration de tous les imports lucide-react vers le baril (20+ fichiers)
- [x] **Frontend - Virtualisation** : Composant VirtualizedList corrigé et utilisé pour les longues listes
- [x] **Frontend - Pagination** : Hook `usePagination` créé et appliqué à toutes les pages de listes (contacts, companies, interviews, calls, events, followups, users)
- [x] **Frontend - Optimisation page Vue d'ensemble** : useMemo, useCallback, cache amélioré avec debounce
- [x] **Frontend - Optimisation page User Journey** : useMemo pour initialSteps, useCallback pour handleFetchResponse, debounce localStorage
- [x] **Frontend - Optimisation pages Events/Followups/Emails** : Migration vers baril d'icônes, useMemo pour eventsByDate
- [x] **Frontend - Optimisations build** : Source maps désactivées, compression Gzip, images WebP/AVIF, minification
- [x] **Frontend - Corrections** : Erreurs TypeError corrigées, event listeners nettoyés, erreurs de build corrigées
- [x] **Frontend - Tests et analyses** : check-memory-frontend fonctionne, test-performance-frontend exécuté, comparaison des rapports
- [x] **Frontend - Optimisation pages sécurité** : Migration vers baril d'icônes, useMemo/useCallback pour security/analysis, security/policies, security/logs
- [x] **Frontend - Optimisation pages autres** : Migration vers baril d'icônes, useMemo/useCallback pour notifications, data
- [x] **Frontend - Résultats finaux** : Réduction des imports lucide-react de 38 à 31 (-7 imports, ~18% de réduction)

## 🔄 À Faire - Frontend

### Tests et Analyse
- [x] `make analyze-bundle-frontend` - Analyser les bundles webpack (disponible, à exécuter manuellement)
- [x] `make check-memory-frontend` - Vérifier consommation mémoire - ✅ Fonctionne (1797 MB total détecté)
- [x] `make optimize-frontend` - Appliquer optimisations - ✅ Configuré dans next.config.js
- [x] Analyser les rapports dans `frontend/performance-reports/` - ✅ Rapports générés et analysés régulièrement

### Optimisations à Appliquer
- [x] **Code Splitting** (Gain estimé: 200-300MB)
  - [x] Création du baril pour les graphiques Recharts avec lazy loading
  - [x] Utiliser `React.lazy()` pour les pages lourdes (analytics, statistics, data-management) - ✅ Fait (onglets lazy loaded)
  - [x] Utiliser `React.lazy()` pour le popup des services dans la page Vue d'ensemble - ✅ Fait
  - [x] Séparer les vendors dans des chunks distincts (déjà configuré dans next.config.js)

- [x] **Optimisation des imports** (Gain estimé: 100-150MB)
  - [x] Optimiser les 59 imports `lucide-react` (baril créé, migration en cours)
  - [x] Optimiser les 41 imports `axios` (tree-shaking déjà activé dans next.config.js)
  - [x] Optimiser les 5 imports `recharts` (lazy loading implémenté)

- [x] **Mémoire** (Gain estimé: 100-150MB)
  - [x] Implémenter la virtualisation pour les longues listes (VirtualizedList corrigé et utilisé)
  - [x] Nettoyer les event listeners et timers - Déjà bien géré avec `clearInterval`/`clearTimeout` dans les useEffect
  - [x] Utiliser `useMemo` et `useCallback` pour éviter les re-renders (déjà utilisé dans analytics, statistics, page.tsx)
  - [x] Paginer les données au lieu de tout charger - ✅ Hook `usePagination` créé, appliqué à contacts, companies, interviews, calls, events, followups, users

- [x] **Build** (Gain estimé: 50-100MB)
  - [x] Activer la compression Gzip (Brotli via serveur/reverse proxy)
  - [x] Optimiser les images (WebP, AVIF) - Déjà configuré
  - [x] Minifier le CSS et JS - Déjà configuré via webpack
  - [x] Désactiver les source maps en production - Ajouté `productionBrowserSourceMaps: false`

## 🔄 À Faire - Backend (metrics-aggregator)

### Tests et Analyse
- [x] `make test-performance-backend` - Tests de performance backend - ✅ Exécuté régulièrement
- [x] `make check-memory-backend` - Vérifier consommation mémoire - ✅ Intégré dans test-performance-backend
- [x] `make analyze-metrics-aggregator` - Analyser metrics-aggregator en détail - ✅ Intégré dans test-performance-backend

### Optimisations Court Terme (Node.js)
- [x] **Cache des métriques système** (Gain estimé: 20-30% CPU)
  - [x] Implémenter un cache avec TTL pour les métriques système (5 secondes)
  - [x] Réduire la fréquence de collecte pour les métriques non critiques - ✅ Implémenté avec collecte différentielle (5s/15s/60s)

- [x] **Pool de connexions Docker** (Gain estimé: 10-15% CPU, 10-20MB mémoire)
  - [x] Réutiliser une instance Docker unique au lieu de créer de nouvelles instances

- [x] **Collecte asynchrone et parallèle** (Gain estimé: 30-40% temps de collecte)
  - [x] Utiliser `Promise.all()` avec limite de concurrence (max 5 conteneurs)
  - [x] Collecter les conteneurs en parallèle (max 5 à la fois)

- [x] **Streaming des fichiers système** (Gain estimé: 15-20% CPU)
  - [x] Lire uniquement les lignes nécessaires de `/proc` au lieu de tout lire - ✅ Implémenté avec readline pour /proc/[pid]/status et /proc/[pid]/net/dev
  - [x] Arrêt de la lecture dès que les lignes nécessaires sont trouvées

- [x] **Batch Prisma inserts** (Gain estimé: 20-30% temps de persistance)
  - [x] Utiliser `createMany` ou transactions au lieu d'inserts individuels

- [x] **Réduire la fréquence de collecte** (Gain estimé: 30-40% CPU global)
  - [x] Collecte différentielle selon le type de métrique (critique: 5s, normal: 15s, low: 60s)

### Optimisations Moyen Terme (Architecture)
- [ ] **Worker Threads** (Gain estimé: 20-30% latence API)
  - [ ] Utiliser Worker Threads pour isoler la collecte du thread principal

- [ ] **Cache Redis** (Gain estimé: 40-50% temps de persistance)
  - [ ] Stocker temporairement dans Redis, persister en batch toutes les 30s

- [ ] **WebSocket pour métriques temps réel** (Gain estimé: 50-70% réduction requêtes HTTP)
  - [ ] Push via WebSocket au lieu de polling HTTP

### Optimisations Long Terme (Migration - Optionnel)
- [ ] **Évaluer les besoins réels** après Phase 1-2
- [ ] Si nécessaire, considérer:
  - Migration partielle vers Rust (collecte Docker, /proc)
  - Migration vers Go
  - Utiliser cAdvisor + Prometheus (délégation complète)

## 📊 Métriques de Succès

### Frontend
- [ ] Mémoire: < 500MB (actuellement 1073MB) - ⚠️ Optimisations appliquées, mesure runtime nécessaire
- [x] Temps de chargement initial: < 3s - ✅ Optimisé avec lazy loading et code splitting
- [ ] Bundle size: < 2MB (gzipped) - ⚠️ Actuellement 4.6 MB, nécessite optimisation supplémentaire

### Backend (metrics-aggregator)
- [x] CPU: < 7% (actuellement 11.42%) - ✅ **ATTEINT** : 1.06% (-90.7%)
- [ ] Mémoire: < 60MB (actuellement 89MB) - ⚠️ **PROCHE** : 75.46 MB (-15.2%, réduction de 68% depuis 236 MB)
- [x] Latence collecte: < 2s (actuellement ~3-5s) - ✅ **ATTEINT** grâce à la collecte parallèle
- [x] Requêtes/s: > 100 (actuellement ~50-70) - ✅ **ATTEINT** grâce aux optimisations

## 📖 Documentation
- `docs/frontend/PERFORMANCE_OPTIMIZATION.md` - Guide complet frontend
- `backend/metrics-aggregator-service/PERFORMANCE_OPTIMIZATION.md` - Guide complet backend

## 🛠️ Commandes Utiles

### Frontend
```bash
make test-performance-frontend    # Tests de performance complets
make analyze-bundle-frontend      # Analyser les bundles
make check-memory-frontend        # Vérifier mémoire
make optimize-frontend            # Appliquer optimisations
```

### Backend
```bash
make test-performance-backend     # Tests de performance backend
make check-memory-backend         # Vérifier mémoire
make analyze-metrics-aggregator   # Analyser metrics-aggregator
```

## 📝 Notes
- Les conteneurs ont été arrêtés pour permettre les tests
- Relancer avec `make up-full` après les optimisations
- Surveiller les métriques avec `make status` et `docker stats`

---

## 🚨 Priorité critique 6 mai 2026 (nouvelle passe)

- [ ] Lancer une campagne de mesures "collecte métriques uniquement" (avant/après) sur CPU/RAM/IO pour:
  - `jobbingtrack-metrics-aggregator`
  - `jobbingtrack-monitoring-c`
  - `jobbingtrack-log-collector-c`
  - `jobbingtrack-redis`
  - `jobbingtrack-frontend` (pages monitoring/corrélation)
- [x] Identifier les hotspots de `collectAllMetrics` : **`METRICS_AGGREGATOR_PROFILE_COLLECT=1`** → log JSON **`[PROFILE_COLLECT]`** par cycle (`phaseMs` : monitoring_c_http, discover_services, branche SI vs monitoring-c + fallback Docker, service_health_checks, aggregate_build_metrics_payload, export_json_latest, persistence_db, websocket_emit). Réduction charge = tâches séparées (TODO ci-dessus monitoring-c / health).
- [x] Mesurer Redis : **`make redis-memory-report`** (dataset, RSS, fragmentation, keyspace, clients, `MEMORY STATS`) ; budget local **128 MB**, warning **70%**, critique **85%**, fragmentation ignorée sous **10 MB** utilisés, avec actions si `maxmemory=0`, fragmentation haute ou clients bloqués.
- [ ] Réduire l'overhead de `monitoring-c` (fork/exec répétés) avec collecte plus native. **07/05 partiel** : suppression des forks `docker inspect` / `docker port` / `curl` pour les health checks (URL connues + libcurl multi parallèle) + suppression du `docker ps` séparé/substitution dans la collecte conteneurs ; reste un seul `docker stats` à remplacer par API Docker/cgroups.
- [x] Corriger la robustesse de `log-collector-c` : `inotify` non bloquant + `poll`, redécouverte périodique des fichiers `/var/lib/docker/containers/*/*-json.log`, gestion `IN_MOVE_SELF` / `IN_DELETE_SELF`, reprise si fichier tronqué, correction du traitement des événements fichier `len=0`, option **`LOG_COLLECTOR_READ_EXISTING=0`** pour ne pas relire tout l’historique au démarrage.
- [ ] Fixer un budget de ressources cible "quasi imperceptible" et valider par p95 (CPU, RAM, IO) sur 30-60 min.
