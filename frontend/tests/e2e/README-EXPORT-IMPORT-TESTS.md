# Tests Playwright - Export/Import et Gestion des Données

Cette documentation explique les tests Playwright créés pour valider les fonctionnalités d'export, d'import et de gestion des données.

## 📋 Vue d'ensemble des tests

### 1. `data-management.spec.ts` - Tests de base de la gestion des données
**Objectif** : Tester les fonctionnalités principales de la page de gestion des données

**Tests couverts :**
- ✅ Navigation vers la gestion des données
- ✅ Navigation entre les onglets (Parcourir, Export, Import, Opérations, Tests DB)
- ✅ Chargement et navigation des tables avec données mockées
- ✅ Export avancé des données avec sélection de format et tables
- ✅ Modification avancée des données avec modal sophistiqué
- ✅ Tests de base de données avec mocks d'API
- ✅ Import de fichiers CSV et JSON
- ✅ Opérations en masse
- ✅ Gestion des erreurs
- ✅ Maintien de l'état lors de la navigation
- ✅ Responsive design sur mobile

### 2. `export-import-advanced.spec.ts` - Tests avancés d'export/import
**Objectif** : Tester les fonctionnalités avancées d'export et d'import avec des scénarios complexes

**Tests couverts :**
- ✅ Export CSV avec données complexes (caractères spéciaux, nombres décimaux)
- ✅ Export JSON avec sélection multiple de tables
- ✅ Gestion des erreurs d'export (serveur 500)
- ✅ Import de fichiers CSV avec simulation de téléchargement
- ✅ Import de fichiers JSON avec simulation de téléchargement
- ✅ Tests de performance avec gros volumes de données (1000+ enregistrements)
- ✅ Export avec filtrage avancé depuis la page Analytics
- ✅ Cohérence du design entre les pages Analytics et Data Management

## 🚀 Comment exécuter les tests

### Prérequis
- Node.js installé
- Playwright installé (`npm install @playwright/test`)
- Serveur de développement en cours d'exécution

### Exécution des tests

```bash
# Tous les tests de gestion des données
npx playwright test data-management.spec.ts

# Tous les tests avancés d'export/import
npx playwright test export-import-advanced.spec.ts

# Tests spécifiques
npx playwright test data-management.spec.ts -g "devrait permettre l'export avancé"

# Mode debug avec interface graphique
npx playwright test --debug

# Mode headed (voir le navigateur)
npx playwright test --headed

# Générer un rapport HTML
npx playwright show-report
```

## 🔧 Configuration des mocks

Les tests utilisent des mocks d'API pour simuler les réponses du serveur backend :

### Données mockées courantes :
```typescript
// Utilisateurs
{
  users: [
    {
      id: '1',
      email: 'user1@test.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'USER',
      is_active: true,
      createdAt: '2024-01-01T10:00:00Z'
    }
  ]
}

// Entreprises
{
  companies: [
    {
      id: '1',
      name: 'TechCorp',
      sector: 'Technology',
      size: 'startup',
      is_active: true
    }
  ]
}

// Analytics
{
  metrics: { totalRequests: 1000, successRate: 95 },
  errorLogs: [...],
  timeline: [...]
}
```

## 📊 Couverture des fonctionnalités

### Fonctionnalités d'export testées :
- ✅ Sélection de format (CSV/JSON)
- ✅ Sélection de tables individuelles
- ✅ Export multiple avec création de ZIP
- ✅ Gestion des erreurs serveur
- ✅ Téléchargement de fichiers volumineux
- ✅ Interface responsive

### Fonctionnalités d'import testées :
- ✅ Interface de téléchargement de fichiers
- ✅ Support des formats CSV et JSON
- ✅ Validation des fichiers acceptés
- ✅ Gestion des erreurs d'import

### Fonctionnalités de modification testées :
- ✅ Modal avancé avec onglets (Informations, Statut, Avancé)
- ✅ Switches pour les propriétés booléennes
- ✅ Sélecteurs pour les enums (status, priority, rôle)
- ✅ Actions rapides (Activer/Désactiver/Archiver)
- ✅ Sauvegarde avec gestion d'erreurs

### Tests de base de données :
- ✅ Tests de connexion PostgreSQL
- ✅ Vérification des schémas Prisma
- ✅ Tests de migration dry-run
- ✅ Interface de monitoring des tests

## 🎯 Points d'attention

### Limitations actuelles :
- Les tests simulent les téléchargements de fichiers mais ne peuvent pas vérifier le contenu réel des fichiers téléchargés
- Les mocks sont statiques et ne couvrent pas tous les scénarios d'erreur possibles
- Les tests de performance sont simulés et ne mesurent pas les vraies performances

### Améliorations possibles :
- Ajouter des tests d'intégration avec de vraies données
- Tester les téléchargements de fichiers réels
- Ajouter des tests de charge pour mesurer les performances
- Étendre les mocks pour couvrir plus de scénarios d'erreur

## 🔍 Debugging

Pour déboguer les tests :

```bash
# Mode debug avec pause sur chaque action
npx playwright test --debug

# Mode headed pour voir visuellement les actions
npx playwright test --headed --debug

# Générer des traces pour analyser les échecs
npx playwright test --trace on

# Voir le rapport après exécution
npx playwright show-report
```

## 📈 Maintenance

- Mettre à jour les mocks quand l'API backend change
- Ajouter de nouveaux tests quand de nouvelles fonctionnalités sont ajoutées
- Vérifier régulièrement que les sélecteurs CSS sont encore valides
- Maintenir la cohérence entre les différents fichiers de test
