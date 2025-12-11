# 📋 TODO - Optimisations Performance

## 🎯 Objectifs
- **Frontend**: Réduire la mémoire de 1073MB à ~500MB (50%)
- **Backend (metrics-aggregator)**: Réduire CPU de 11.42% à ~5-7% et mémoire de 89MB à ~50-60MB

## ✅ Fait
- [x] Création des scripts de test de performance frontend
- [x] Création des scripts de test de performance backend
- [x] Documentation d'optimisation créée
- [x] Commandes Makefile ajoutées
- [x] Correction erreur permission analyze-bundle-frontend

## 🔄 À Faire - Frontend

### Tests et Analyse
- [ ] `make analyze-bundle-frontend` - Analyser les bundles webpack
- [ ] `make check-memory-frontend` - Vérifier consommation mémoire
- [ ] `make optimize-frontend` - Appliquer optimisations
- [ ] Analyser les rapports dans `frontend/performance-reports/`

### Optimisations à Appliquer
- [ ] **Code Splitting** (Gain estimé: 200-300MB)
  - [ ] Utiliser `React.lazy()` pour les pages lourdes (analytics, statistics, data-management)
  - [ ] Implémenter le lazy loading des routes
  - [ ] Séparer les vendors dans des chunks distincts

- [ ] **Optimisation des imports** (Gain estimé: 100-150MB)
  - [ ] Optimiser les 59 imports `lucide-react` (importer uniquement les icônes nécessaires)
  - [ ] Optimiser les 41 imports `axios` (utiliser tree-shaking)
  - [ ] Optimiser les 5 imports `recharts` (lazy loading)

- [ ] **Mémoire** (Gain estimé: 100-150MB)
  - [ ] Implémenter la virtualisation pour les longues listes
  - [ ] Nettoyer les event listeners et timers
  - [ ] Utiliser `useMemo` et `useCallback` pour éviter les re-renders
  - [ ] Paginer les données au lieu de tout charger

- [ ] **Build** (Gain estimé: 50-100MB)
  - [ ] Activer la compression Brotli
  - [ ] Optimiser les images (WebP, AVIF)
  - [ ] Minifier le CSS et JS
  - [ ] Désactiver les source maps en production

## 🔄 À Faire - Backend (metrics-aggregator)

### Tests et Analyse
- [ ] `make test-performance-backend` - Tests de performance backend
- [ ] `make check-memory-backend` - Vérifier consommation mémoire
- [ ] `make analyze-metrics-aggregator` - Analyser metrics-aggregator en détail

### Optimisations Court Terme (Node.js)
- [ ] **Cache des métriques système** (Gain estimé: 20-30% CPU)
  - [ ] Implémenter un cache avec TTL pour les métriques système
  - [ ] Réduire la fréquence de collecte pour les métriques non critiques

- [ ] **Pool de connexions Docker** (Gain estimé: 10-15% CPU, 10-20MB mémoire)
  - [ ] Réutiliser une instance Docker unique au lieu de créer de nouvelles instances

- [ ] **Collecte asynchrone et parallèle** (Gain estimé: 30-40% temps de collecte)
  - [ ] Utiliser `Promise.all()` avec limite de concurrence (p-limit)
  - [ ] Collecter les conteneurs en parallèle (max 5 à la fois)

- [ ] **Streaming des fichiers système** (Gain estimé: 15-20% CPU)
  - [ ] Lire uniquement les lignes nécessaires de `/proc` au lieu de tout lire

- [ ] **Batch Prisma inserts** (Gain estimé: 20-30% temps de persistance)
  - [ ] Utiliser `createMany` ou transactions au lieu d'inserts individuels

- [ ] **Réduire la fréquence de collecte** (Gain estimé: 30-40% CPU global)
  - [ ] Collecte différentielle selon le type de métrique (critique: 5s, normal: 15s, low: 60s)

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
- [ ] Mémoire: < 500MB (actuellement 1073MB)
- [ ] Temps de chargement initial: < 3s
- [ ] Bundle size: < 2MB (gzipped)

### Backend (metrics-aggregator)
- [ ] CPU: < 7% (actuellement 11.42%)
- [ ] Mémoire: < 60MB (actuellement 89MB)
- [ ] Latence collecte: < 2s (actuellement ~3-5s)
- [ ] Requêtes/s: > 100 (actuellement ~50-70)

## 📖 Documentation
- `frontend/PERFORMANCE_OPTIMIZATION.md` - Guide complet frontend
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

