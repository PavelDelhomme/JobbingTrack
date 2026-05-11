# 🚀 Guide d'Optimisation Performance Frontend

Guide spécifique au frontend Next.js : mémoire, bundles, lazy loading. Les rapports générés (analyses, résumés) sont dans `frontend/performance-reports/`. Documentation centralisée : ce fichier est la référence ; une redirection existe dans `frontend/PERFORMANCE_OPTIMIZATION.md`.

[← Retour frontend](README.md) | [Performance globale](../performance/README.md) | [Index doc](../INDEX.md)

---

## 📊 Objectif
Réduire la consommation mémoire de **1073MB à ~500MB** (réduction de 50%)

## 🔍 Analyse des Causes Probables

### 1. Imports Lucide-React
- **Problème**: 36 fichiers importent depuis `lucide-react`
- **Impact**: Chaque import charge potentiellement toute la bibliothèque
- **Solution**: Importer uniquement les icônes nécessaires

### 2. Composants Lourds Non Lazy-Loadés
- **Problème**: Pages lourdes chargées immédiatement
- **Impact**: Tous les composants en mémoire dès le chargement
- **Solution**: Utiliser `React.lazy()` et `Suspense`

### 3. Recharts (Bibliothèque de Graphiques)
- **Problème**: Bibliothèque volumineuse
- **Impact**: ~200-300MB en mémoire
- **Solution**: Lazy loading des composants de graphiques

### 4. Socket.io-client
- **Problème**: Connexion WebSocket persistante
- **Impact**: Maintient des listeners en mémoire
- **Solution**: Nettoyer les listeners et reconnexions

### 5. Données en Mémoire
- **Problème**: Stockage de grandes quantités de données dans le state
- **Impact**: Accumulation de données non nettoyées
- **Solution**: Pagination, virtualisation, nettoyage

## ✅ Optimisations à Appliquer

### 1. Optimisation des Imports Lucide-React

**Avant:**
```typescript
import { Play, Square, RotateCw, ... } from 'lucide-react'
```

**Après:**
```typescript
// Importer uniquement ce qui est nécessaire
import Play from 'lucide-react/dist/esm/icons/play'
import Square from 'lucide-react/dist/esm/icons/square'
```

**Ou utiliser un helper:**
```typescript
// lib/utils/icon-loader.ts
export const loadIcon = (name: string) => {
  return dynamic(() => import(`lucide-react/dist/esm/icons/${name}`))
}
```

### 2. Lazy Loading des Pages Lourdes

**Exemple pour analytics:**
```typescript
// app/(admin)/analytics/page.tsx
import { lazy, Suspense } from 'react'

const AnalyticsContent = lazy(() => import('./AnalyticsContent'))

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AnalyticsContent />
    </Suspense>
  )
}
```

### 3. Lazy Loading des Composants de Graphiques

```typescript
// Composants lourds
const LineChart = lazy(() => import('recharts').then(mod => ({ default: mod.LineChart })))
const AreaChart = lazy(() => import('recharts').then(mod => ({ default: mod.AreaChart })))
```

### 4. Virtualisation des Listes

```typescript
// Pour les longues listes
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {Row}
</FixedSizeList>
```

### 5. Nettoyage des Event Listeners

```typescript
useEffect(() => {
  const handleEvent = () => {}
  window.addEventListener('resize', handleEvent)
  
  return () => {
    window.removeEventListener('resize', handleEvent) // ✅ Nettoyage
  }
}, [])
```

### 6. Optimisation du State

```typescript
// ❌ Éviter
const [allData, setAllData] = useState([]) // Toutes les données

// ✅ Préférer
const [visibleData, setVisibleData] = useState([]) // Seulement visible
const [page, setPage] = useState(1)
```

### 7. Memoization

```typescript
// Éviter les re-renders inutiles
const MemoizedComponent = React.memo(Component)
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b])
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b])
```

## 📋 Checklist d'Optimisation

- [ ] Optimiser tous les imports `lucide-react`
- [ ] Lazy load des pages lourdes (analytics, statistics, data-management)
- [ ] Lazy load des composants Recharts
- [ ] Implémenter la virtualisation pour les listes longues
- [ ] Nettoyer tous les event listeners
- [ ] Nettoyer les timers et intervals
- [ ] Utiliser `useMemo` et `useCallback` pour les calculs coûteux
- [ ] Paginer les données au lieu de tout charger
- [ ] Optimiser les images (WebP, AVIF)
- [ ] Activer la compression Brotli
- [ ] Analyser les bundles avec webpack-bundle-analyzer

## 🛠️ Commandes Makefile

```bash
# Test de performance complet
make test-performance-frontend

# Analyser les bundles
make analyze-bundle-frontend

# Vérifier la mémoire
make check-memory-frontend

# Appliquer les optimisations
make optimize-frontend
```

## 📈 Résultats Attendus

- **Mémoire initiale**: 1073MB
- **Objectif**: ~500MB
- **Réduction**: ~50%

## 🔄 Plan d'Action

1. **Phase 1**: Optimiser les imports (gain estimé: 100-150MB)
2. **Phase 2**: Lazy loading des pages lourdes (gain estimé: 200-300MB)
3. **Phase 3**: Virtualisation et pagination (gain estimé: 100-150MB)
4. **Phase 4**: Nettoyage et memoization (gain estimé: 50-100MB)

## 📂 Rapports générés

Les rapports d’analyse (résumés, analyse finale) sont générés dans le dépôt frontend :

- `docs/performance/FRONTEND_REPORTS_SUMMARY.md`
- `docs/performance/FRONTEND_REPORTS_FINAL_ANALYSIS.md`

Voir aussi **`docs/performance/`** pour les rapports globaux et le backend.
