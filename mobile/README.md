# JobbingTrack Mobile

Application mobile React Native pour la gestion des candidatures, appels, contacts et calendrier.

## Fonctionnalités

### 📞 Gestion des Appels
- **Liste des appels** avec filtrage par date et statut
- **Calendrier intégré** pour visualiser les appels programmés
- **Gestion des statuts** : Planifié, Terminé, Annulé, Pas de réponse, Message vocal, Replanifié
- **Détails des appels** : durée, notes, contacts associés
- **Filtrage et recherche** avancés

### 👥 Contacts & Entreprises
- **Gestion des contacts** avec informations détaillées
- **Gestion des entreprises** avec secteur d'activité et localisation
- **Liaison contacts-entreprises** avec rôles (recruteur, manager, RH)
- **Actions rapides** : email, téléphone, LinkedIn
- **Recherche par nom, poste, entreprise**

### 🔄 Gestion des Relances
- **Suivi des relances** avec différents types (email, téléphone, LinkedIn)
- **Statuts de relance** : En attente, Retour positif, Retour négatif, Aucun retour, Programmée
- **Échéances et rappels** automatiques
- **Historique des réponses** reçues
- **Statistiques** des relances en attente, en retard, etc.

### ⚙️ Paramètres Utilisateur
- **Profil utilisateur** personnalisable
- **Préférences de notifications** (email, push, rappels)
- **Configuration des délais** par défaut (durée entretiens, archivage automatique)
- **Gestion du thème** (clair, sombre, automatique)
- **Paramètres de langue** et préférences

### 📅 Calendrier
- **Vue calendrier mensuelle** avec événements marqués
- **Vue hebdomadaire** détaillée
- **Vue journalière** avec événements du jour
- **Types d'événements** : candidatures, entretiens, relances, échéances, rendez-vous
- **Synchronisation** avec les données de l'application

## Structure des Écrans

```
src/screens/
├── CallsScreen.tsx          # Gestion des appels avec calendrier
├── ContactsScreen.tsx       # Contacts et entreprises
├── FollowUpsScreen.tsx      # Gestion des relances
├── SettingsScreen.tsx       # Paramètres utilisateur
└── CalendarScreen.tsx       # Calendrier des événements
```

## États et Modèles de Données

### États des Candidatures
- `CANDIDATE_PENDING` : "Candidaté et en attente"
- `NO_RESPONSE` : "Aucune réponse"
- `NO_RESPONSE_AFTER_FIRST_FOLLOWUP` : "Aucune réponse après 1 relance"
- `NO_RESPONSE_AFTER_SECOND_FOLLOWUP` : "Aucune réponse après 2 relance"
- `FIRST_INTERVIEW_PENDING` : "1er entretien en attente"
- `OTHER_INTERVIEW_PENDING` : "Autre entretien en attente"
- `ACCEPTED_AFTER_INTERVIEW` : "Retenue après entretien"
- `REJECTED_WITHOUT_INTERVIEW` : "Non retenue sans entretien"
- `REJECTED_AFTER_INTERVIEW` : "Non retenue après entretien"

### États des Entretiens
- `UPCOMING_ARRIVAL` : "Entretien arrivé"
- `COMPLETED` : "Entretien passé"
- `FEEDBACK_PENDING` : "Retour prévu d'ici (plage de retour)"
- `PENDING` : "Entretien en attente"

### États des Relances
- `PENDING_FOLLOWUP` : "Relance et en attente"
- `POSITIVE_RESPONSE` : "Retour positif reçu"
- `NEGATIVE_RESPONSE` : "Retour négatif reçu"
- `NO_RESPONSE` : "Aucun retour"
- `SCHEDULED_FOLLOWUP` : "Relance prévisionnel"

## Installation et Configuration

1. **Installation des dépendances** :
```bash
npm install
# ou
yarn install
```

2. **Installation des dépendances React Native** :
```bash
npm install react-native-calendars date-fns
# ou
yarn add react-native-calendars date-fns
```

3. **Configuration des services API** :
   - Mettre à jour les URLs des services dans les fichiers de configuration
   - Configurer l'authentification mobile
   - Ajouter les certificats SSL si nécessaire

4. **Configuration du calendrier** :
   - Installer `react-native-calendars` avec `npm install react-native-calendars`
   - Personnaliser les thèmes et locales selon les besoins

## Utilisation

### Écran des Appels
- **Vue calendrier** : Sélectionner une date pour voir les appels du jour
- **Liste des appels** : Filtrer par statut, rechercher par contact/entreprise
- **Actions** : Marquer comme terminé, reprogrammer, ajouter des notes

### Écran Contacts/Entreprises
- **Onglets** : Basculer entre contacts et entreprises
- **Recherche** : Trouver rapidement un contact ou une entreprise
- **Actions** : Appeler, envoyer un email, voir les candidatures liées

### Écran des Relances
- **Statistiques** : Voir le nombre de relances en attente, en retard, etc.
- **Gestion** : Marquer comme terminée, voir les réponses reçues
- **Filtres** : Par statut, type de relance, date

### Écran Paramètres
- **Profil** : Modifier les informations personnelles
- **Notifications** : Configurer les rappels et alertes
- **Préférences** : Personnaliser l'expérience utilisateur

### Écran Calendrier
- **Vues multiples** : Mois, semaine, jour
- **Navigation** : Se déplacer facilement dans le temps
- **Événements** : Visualiser tous les types d'événements

## Développement

### Ajout de nouvelles fonctionnalités
1. Créer un nouveau fichier d'écran dans `src/screens/`
2. Implémenter les appels API nécessaires dans `src/services/`
3. Ajouter la navigation dans le système de routage
4. Tester sur les émulateurs iOS/Android

### Personnalisation des thèmes
Les couleurs et styles peuvent être personnalisés dans les objets `StyleSheet` de chaque écran.

### Gestion des données locales
Pour l'instant, les données sont mockées. Implémenter la persistance locale avec AsyncStorage ou Redux Persist selon les besoins.

## Technologies utilisées

- **React Native** : Framework mobile
- **TypeScript** : Typage statique
- **React Native Calendars** : Composant calendrier
- **Date-fns** : Manipulation des dates
- **React Navigation** : Système de navigation (à implémenter)

## Prochaines étapes

1. **Intégration API** : Connecter aux services backend existants
2. **Authentification** : Implémenter le système de connexion mobile
3. **Notifications push** : Ajouter les notifications en temps réel
4. **Synchronisation offline** : Gérer les données hors ligne
5. **Tests unitaires** : Ajouter des tests pour les composants
6. **Optimisation performance** : Lazy loading, pagination, etc.

## Support

Pour toute question ou problème, consulter la documentation backend ou contacter l'équipe de développement.
