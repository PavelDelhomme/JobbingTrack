# 📊 Système de Tracking Utilisateur

## Vue d'ensemble

Le système de tracking utilisateur permet de collecter et analyser toutes les actions des utilisateurs sur la plateforme JobbingTrack, que ce soit sur le web ou mobile.

## Fonctionnalités

### ✅ Implémenté

1. **Schéma de base de données** (Prisma)
   - `UserSession` : Sessions utilisateur (web et mobile)
   - `UserEvent` : Événements utilisateur (clics, navigation, etc.)
   - `UserError` : Erreurs et logs utilisateur
   - `UserPerformance` : Métriques de performance
   - `DeviceInfo` : Informations sur les appareils

2. **Backend API** (dashboard-service)
   - `POST /api/v1/analytics/sessions` : Créer une session
   - `PUT /api/v1/analytics/sessions/:sessionId` : Terminer une session
   - `POST /api/v1/analytics/events` : Tracker un événement
   - `POST /api/v1/analytics/errors` : Tracker une erreur
   - `POST /api/v1/analytics/performance` : Tracker une métrique de performance
   - `POST /api/v1/analytics/device` : Enregistrer un appareil
   - `GET /api/v1/analytics/stats/:userId?` : Statistiques utilisateur
   - `GET /api/v1/analytics/events` : Liste des événements
   - `GET /api/v1/analytics/errors` : Liste des erreurs

3. **SDK Frontend** (`frontend/src/lib/tracking/userTracking.ts`)
   - Tracking automatique des erreurs JavaScript
   - Tracking automatique de la navigation
   - Tracking des clics sur les éléments
   - Queue d'événements avec flush périodique
   - Gestion des sessions

4. **Page d'analyse** (`/backoffice/user-analytics`)
   - Vue d'ensemble des statistiques
   - Liste des événements
   - Liste des erreurs
   - Métriques de performance

## Utilisation

### Dans le frontend

```typescript
import { useTracking } from '@/components/tracking/TrackingProvider'

function MyComponent() {
  const { trackEvent, trackClick, trackError, trackPerformance } = useTracking()

  const handleClick = () => {
    trackEvent('button_clicked', 'click', 'ui', {
      buttonId: 'save-button',
      page: '/backoffice/applications'
    })
  }

  return <button onClick={handleClick}>Sauvegarder</button>
}
```

### Tracking automatique

Le tracking est automatiquement initialisé via le `TrackingProvider` dans le layout principal. Il track :
- Les erreurs JavaScript globales
- Les promesses rejetées non gérées
- Les changements de page/navigation
- Les fermetures de page (pour terminer la session)

### Tracking manuel

```typescript
import userTracking from '@/lib/tracking/userTracking'

// Tracker un événement
userTracking.trackEvent('notification_received', 'notification', 'notification', {
  notificationType: 'relance',
  notificationId: '123'
})

// Tracker une erreur
userTracking.trackError(new Error('Something went wrong'), 'javascript', 'error')

// Tracker une métrique de performance
userTracking.trackPerformance('load_applications', 'api_call', null, 250)
```

## Données collectées

### Informations appareil
- Device ID (unique par appareil)
- Plateforme (web, iOS, Android)
- Modèle d'appareil
- OS et version
- Navigateur et version
- Résolution d'écran
- Langue et timezone

### Événements
- Type d'événement (click, navigation, form_submit, etc.)
- Nom de l'événement
- Élément cliqué (ID, type, texte)
- Page/URL
- Propriétés additionnelles

### Erreurs
- Type d'erreur (javascript, api, network, etc.)
- Message d'erreur
- Stack trace (sanitized)
- Page où l'erreur s'est produite
- Sévérité (error, warning, critical)

### Performance
- Type de métrique (page_load, api_call, render, etc.)
- Durée en millisecondes
- Utilisation mémoire
- Utilisation CPU
- Latence réseau
- Type de réseau (wifi, 4g, 5g, etc.)

## Page d'analyse

Accédez à `/backoffice/user-analytics` pour voir :
- Statistiques globales (sessions, événements, erreurs)
- Événements par type
- Pages les plus visitées
- Actions les plus fréquentes
- Liste des erreurs récentes
- Métriques de performance

## Prochaines étapes

1. ✅ Schéma Prisma créé
2. ✅ Backend API créé
3. ✅ SDK Frontend créé
4. ✅ Page d'analyse créée
5. ⏳ Intégration dans les composants (en cours)
6. ⏳ Migration de la base de données
7. ⏳ Tests et validation

## Migration de la base de données

Pour appliquer le schéma :

```bash
cd backend/auth-service
npx prisma db push
```

Ou via Docker :

```bash
docker exec jobbingtrack-postgres psql -U postgres -d jobbingtrack -c "SELECT 1" # Vérifier connexion
make db-push-all
```

## Configuration

Le tracking peut être désactivé par l'utilisateur :

```typescript
userTracking.setEnabled(false) // Désactive le tracking
localStorage.setItem('tracking_disabled', 'true') // Persiste la préférence
```

## Conformité RGPD

- Les données sont stockées de manière sécurisée
- Les utilisateurs peuvent désactiver le tracking
- Les données peuvent être supprimées sur demande
- Les stack traces sont sanitized pour éviter les données sensibles

