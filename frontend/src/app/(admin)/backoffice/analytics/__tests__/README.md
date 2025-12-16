# Tests pour la page Analytics

Cette suite de tests complète détecte et prévient les problèmes courants dans la page Analytics.

## Types de tests

### 1. Tests de validation des props (`analytics-page.test.tsx`)
- Vérifie que `timeRange` est défini et passé correctement
- Détecte les props manquantes
- Vérifie que les composants Tab reçoivent toutes les props nécessaires

### 2. Tests des composants Tab (`tab-components.test.tsx`)
- Valide que chaque composant Tab (OverviewTab, SystemTab, PerformanceTab, NetworkTab) fonctionne correctement
- Vérifie que `timeRange` est utilisé correctement dans chaque composant
- Détecte les erreurs de référence non définies

### 3. Tests de détection d'erreurs React (`react-errors-detector.test.tsx`)
- Détecte les erreurs React courantes :
  - Props manquantes
  - Références non définies
  - Erreurs de rendu
  - Warnings React

### 4. Tests de performance (`performance.test.tsx`)
- Mesure le temps de chargement
- Vérifie l'utilisation de `useMemo` et `useCallback`
- Détecte les fuites mémoire

## Scripts de validation

### Validation automatique
```bash
npm run test:analytics:validate
```
Vérifie automatiquement :
- Présence de `timeRange` dans tous les composants Tab
- Utilisation de `useCallback` pour `handleTimeRangeChange`
- Utilisation de `useMemo` pour `timeRangeMs`
- Mémorisation des composants Tab
- Erreurs TypeScript
- Erreurs ESLint

### Suite de tests complète
```bash
npm run test:analytics:complete
```
Exécute :
1. Validation automatique
2. Tests unitaires
3. Tests de détection d'erreurs React
4. Tests E2E (si serveur démarré)
5. Vérification de performance

### Tests unitaires uniquement
```bash
npm run test:analytics
```

## Problèmes détectés

Ces tests détectent automatiquement :

1. **Props manquantes** : `timeRange is not defined`
2. **Références non définies** : Variables utilisées sans être déclarées
3. **Erreurs React** : Warnings et erreurs de rendu
4. **Problèmes de performance** : Temps de chargement excessif, fuites mémoire
5. **Optimisations manquantes** : Absence de `useMemo` ou `useCallback`

## Exécution dans CI/CD

Ajoutez ces commandes à votre pipeline CI/CD :

```yaml
- name: Run analytics tests
  run: |
    npm run test:analytics:validate
    npm run test:analytics
```

## Contribution

Lors de l'ajout de nouvelles fonctionnalités à la page Analytics :

1. Exécutez `npm run test:analytics:validate` avant de commiter
2. Ajoutez des tests pour les nouvelles fonctionnalités
3. Vérifiez que tous les tests passent

