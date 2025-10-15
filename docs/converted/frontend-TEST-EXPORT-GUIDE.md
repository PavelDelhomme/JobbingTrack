# Guide de test de l'exporteur de données

## 🚀 Comment tester l'exporteur de données

### 1. Ouvrir la page de gestion des données
```
http://localhost:3000/backoffice/data-management
```

### 2. Sélectionner une table avec des données
- Cliquez sur "Utilisateurs", "Entreprises", etc.
- Assurez-vous que des données sont affichées dans le tableau

### 3. Tester l'exporteur avancé

#### Dans la barre d'actions (en haut à droite) :
- Cliquez sur le bouton "Exporter"
- Un menu s'ouvre avec les options d'export

#### Dans l'onglet Export :
- Allez dans l'onglet "Export"
- Cliquez sur "Exporter" pour ouvrir le menu avancé

### 4. Tester les fonctionnalités

#### Sélection de format :
- Cliquez sur "CSV" ou "JSON" pour changer le format d'export

#### Sélection de tables :
- Cochez/décochez les tables disponibles
- Utilisez "Tout" pour sélectionner toutes les tables disponibles
- Utilisez "Aucun" pour tout désélectionner

#### Export simple :
- Sélectionnez une seule table
- Cliquez sur "Exporter" (bouton vert)
- Le fichier sera téléchargé automatiquement

#### Export multiple :
- Sélectionnez plusieurs tables
- Cliquez sur "Exporter"
- Un fichier ZIP sera créé avec tous les fichiers sélectionnés

### 5. Debugging dans la console

Dans la console du navigateur, vous pouvez utiliser :

```javascript
// Voir les données disponibles
window.testExportData.data

// Voir les options disponibles
window.testExportData.availableOptions

// Voir les tables sélectionnées
window.testExportData.selectedTables

// Générer du CSV pour une table spécifique
window.testExportData.generateCSV('users')

// Générer du JSON pour une table spécifique
window.testExportData.generateJSON('companies')

// Exporter les tables sélectionnées
window.testExportData.exportSelected('csv')
window.testExportData.exportSelected('json')
```

### 6. Données de test recommandées

Pour tester correctement, assurez-vous d'avoir des données dans les tables suivantes :
- **Users** : Utilisateurs avec différents rôles
- **Companies** : Entreprises avec différents secteurs
- **Applications** : Candidatures avec différents statuts

### 7. Vérification du téléchargement

- Ouvrez le dossier de téléchargements
- Vérifiez que les fichiers sont créés avec les bons noms
- Ouvrez les fichiers pour vérifier le contenu

### 8. Tests d'erreur

Pour tester les erreurs :
- Déconnectez-vous du serveur (mode hors ligne)
- Essayez d'exporter sans données
- Vérifiez que les messages d'erreur s'affichent correctement

## 🎯 Points à vérifier

### Fonctionnalités de base :
- ✅ Sélection de format (CSV/JSON)
- ✅ Sélection de tables individuelles
- ✅ Sélection multiple avec ZIP
- ✅ Téléchargement automatique
- ✅ Interface responsive

### Interface utilisateur :
- ✅ Boutons "Tout" et "Aucun" fonctionnels
- ✅ Compteur de tables sélectionnées
- ✅ Indicateur de progression pendant l'export
- ✅ Messages de succès/erreur

### Gestion des données :
- ✅ Export de données avec caractères spéciaux
- ✅ Gestion des valeurs nulles
- ✅ Formatage correct des dates
- ✅ Nettoyage des champs internes (_id, __v)

## 🔧 Dépannage

### Problème : "Aucun" puis "Tout" ne fonctionne pas
- Vérifiez que les données sont bien chargées
- Regardez la console pour voir les options disponibles
- Assurez-vous que des tables ont des données

### Problème : Export ne se lance pas
- Vérifiez la console pour les erreurs JavaScript
- Assurez-vous qu'au moins une table est sélectionnée
- Vérifiez les permissions du navigateur pour les téléchargements

### Problème : Fichier téléchargé vide
- Vérifiez que les données sont bien présentes dans le tableau
- Regardez les logs dans la console
- Testez avec des données de test simples

## 📊 Exemples de données de test

```javascript
// Dans la console du navigateur :
const testData = {
  users: [
    { id: '1', email: 'redacted@example.invalid', firstName: 'Test', lastName: 'User' },
    { id: '2', email: 'redacted@example.invalid', firstName: 'Admin', lastName: 'User' }
  ],
  companies: [
    { id: '1', name: 'Test Company', sector: 'Tech', size: 'startup' }
  ]
};

// Tester l'export
window.testExportData.exportSelected('json');
```
