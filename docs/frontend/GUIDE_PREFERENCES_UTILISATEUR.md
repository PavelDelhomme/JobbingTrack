# 🎛️ Guide - Système de Préférences Utilisateur

## Vue d'ensemble

Le système de préférences utilisateur permet à chaque administrateur de personnaliser son expérience dans le backoffice, notamment :
- **Intervalles de rafraîchissement** des données (logs, analytics, métriques, dashboard, services)
- **Préférences d'affichage** (éléments par page, mode compact, graphiques, métriques)
- **Notifications** (bureau, son, priorité élevée uniquement)

## 📋 Architecture

### Backend

#### 1. Modèle de données (Prisma)
```prisma
model UserCustomization {
  id        String   @id @default(cuid())
  userId    String   @unique
  settings  Json     // Stockage flexible des paramètres
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### 2. Contrôleur (`preferences.controller.js`)
- `getUserPreferences()` - Récupérer les préférences de l'utilisateur connecté
- `updateUserPreferences()` - Mettre à jour les préférences
- `resetUserPreferences()` - Réinitialiser aux valeurs par défaut

#### 3. Routes (`preferences.routes.js`)
- `GET /api/v1/preferences` - Récupérer les préférences
- `PUT /api/v1/preferences` - Mettre à jour les préférences
- `POST /api/v1/preferences/reset` - Réinitialiser

#### 4. API Gateway
Route proxy vers le `auth-service` pour toutes les requêtes `/api/v1/preferences`

### Frontend

#### 1. Service (`preferencesService.ts`)
```typescript
interface UserPreferences {
  refreshInterval: {
    logs: number;        // 30000ms par défaut
    analytics: number;   // 10000ms par défaut
    metrics: number;     // 15000ms par défaut
    dashboard: number;   // 30000ms par défaut
    services: number;    // 20000ms par défaut
  };
  display: {
    itemsPerPage: number;
    compactMode: boolean;
    showCharts: boolean;
    showMetrics: boolean;
  };
  notifications: {
    desktop: boolean;
    sound: boolean;
    highPriorityOnly: boolean;
  };
  theme: string;
  language: string;
  timezone: string;
}
```

#### 2. Page de paramètres (`/backoffice/settings/page.tsx`)
Interface complète pour configurer toutes les préférences utilisateur.

#### 3. Intégration dans les pages
Les pages suivantes utilisent les préférences de rafraîchissement :
- `/backoffice/security/logs` - Utilise `refreshInterval.logs`
- `/backoffice/analytics` - Utilise `refreshInterval.analytics` et `refreshInterval.metrics`

## 🚀 Utilisation

### 1. Accéder aux paramètres

1. Ouvrir le backoffice : `http://localhost:8080/backoffice`
2. Cliquer sur **Administration** > **Paramètres**
3. Ou accéder directement à : `http://localhost:8080/backoffice/settings`

### 2. Configurer les intervalles de rafraîchissement

**Logs de Sécurité** (5s - 2min)
- Contrôle la fréquence de rafraîchissement de la page des logs de sécurité
- Valeur recommandée : 30 secondes

**Analytics & Performance** (5s - 2min)
- Contrôle la fréquence de rafraîchissement des métriques en temps réel
- Valeur recommandée : 10 secondes

**Métriques Système** (5s - 2min)
- Contrôle la fréquence de rafraîchissement des graphiques historiques
- Valeur recommandée : 15 secondes

**Dashboard** (10s - 5min)
- Contrôle la fréquence de rafraîchissement du dashboard général
- Valeur recommandée : 30 secondes

**État des Services** (10s - 3min)
- Contrôle la fréquence de vérification de l'état des services
- Valeur recommandée : 20 secondes

### 3. Configurer l'affichage

- **Éléments par page** : Nombre d'éléments à afficher dans les listes (10-100)
- **Mode compact** : Réduire l'espacement entre les éléments
- **Afficher les graphiques** : Afficher/masquer les visualisations
- **Afficher les métriques** : Afficher/masquer les statistiques détaillées

### 4. Configurer les notifications

- **Notifications bureau** : Recevoir des notifications sur le bureau
- **Son** : Jouer un son lors des notifications
- **Priorité élevée uniquement** : Afficher uniquement les notifications importantes

## 💾 Persistance des données

### Côté Backend
Les préférences sont stockées dans la table `UserCustomization` de PostgreSQL avec un format JSON flexible.

### Côté Frontend
- **Cache en mémoire** : 5 minutes de validité
- **localStorage** : Copie locale pour accès rapide
- **Synchronisation** : Automatique lors de la mise à jour

## 🔧 Utilisation dans le code

### Récupérer les préférences

```typescript
import preferencesService from '@/lib/services/preferencesService';

// Récupérer toutes les préférences
const preferences = await preferencesService.getUserPreferences();

// Récupérer un intervalle spécifique
const logsInterval = await preferencesService.getRefreshInterval('logs');
```

### Mettre à jour les préférences

```typescript
// Mettre à jour partiellement
await preferencesService.updateUserPreferences({
  refreshInterval: {
    logs: 20000 // 20 secondes
  }
});

// Mettre à jour un intervalle spécifique
await preferencesService.updateRefreshInterval('logs', 20000);
```

### Réinitialiser les préférences

```typescript
await preferencesService.resetUserPreferences();
```

### Utilisation dans un composant React

```typescript
import { useState, useEffect } from 'react';
import preferencesService from '@/lib/services/preferencesService';

export default function MyPage() {
  const [refreshInterval, setRefreshInterval] = useState(30000);

  useEffect(() => {
    const loadInterval = async () => {
      const interval = await preferencesService.getRefreshInterval('logs');
      setRefreshInterval(interval);
    };
    loadInterval();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      // Votre logique de chargement
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return <div>...</div>;
}
```

## 🎯 Valeurs par défaut

```javascript
{
  refreshInterval: {
    logs: 30000,        // 30 secondes
    analytics: 10000,   // 10 secondes
    metrics: 15000,     // 15 secondes
    dashboard: 30000,   // 30 secondes
    services: 20000     // 20 secondes
  },
  display: {
    itemsPerPage: 20,
    compactMode: false,
    showCharts: true,
    showMetrics: true
  },
  notifications: {
    desktop: true,
    sound: false,
    highPriorityOnly: false
  },
  theme: 'light',
  language: 'fr',
  timezone: 'Europe/Paris'
}
```

## 📊 Impact sur les performances

### Intervalles courts (< 10s)
✅ **Avantages** :
- Données très à jour
- Détection rapide des anomalies
- Meilleure réactivité

❌ **Inconvénients** :
- Charge réseau élevée
- Plus de requêtes API
- Consommation CPU accrue

### Intervalles longs (> 30s)
✅ **Avantages** :
- Charge réseau réduite
- Moins de requêtes API
- Économie de ressources

❌ **Inconvénients** :
- Données moins fraîches
- Détection plus lente des problèmes
- Moins réactif

### Recommandations

**Pour un usage normal** :
- Logs : 30 secondes
- Analytics : 15 secondes
- Métriques : 20 secondes
- Dashboard : 30 secondes
- Services : 30 secondes

**Pour un monitoring intensif** :
- Logs : 10 secondes
- Analytics : 5 secondes
- Métriques : 10 secondes
- Dashboard : 15 secondes
- Services : 15 secondes

**Pour économiser les ressources** :
- Logs : 60 secondes
- Analytics : 30 secondes
- Métriques : 60 secondes
- Dashboard : 60 secondes
- Services : 60 secondes

## 🔒 Sécurité

- **Authentification requise** : Toutes les routes sont protégées par le middleware `authenticateToken`
- **Isolation des données** : Chaque utilisateur ne peut accéder qu'à ses propres préférences
- **Validation des données** : Les valeurs sont validées côté backend
- **Limites** : Les intervalles sont bornés (min/max) pour éviter les abus

## 🐛 Dépannage

### Les préférences ne se sauvent pas

1. Vérifier que l'utilisateur est bien authentifié
2. Vérifier les logs du `auth-service`
3. Vérifier que la table `UserCustomization` existe dans PostgreSQL

```bash
psql -U user -d auth_db -c "\d user_customizations"
```

### Les intervalles ne sont pas appliqués

1. Vérifier la console du navigateur pour les erreurs
2. Vider le cache du navigateur (localStorage)
3. Recharger la page (Ctrl+F5)

### Erreur 401 (Non autorisé)

1. Vérifier que le token est valide
2. Se reconnecter si nécessaire
3. Vérifier que le middleware d'authentification fonctionne

```bash
# Tester l'authentification
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/preferences
```

## 📝 Fichiers modifiés/créés

### Backend
- `backend/auth-service/src/controllers/preferences.controller.js` ✨ NOUVEAU
- `backend/auth-service/src/routes/preferences.routes.js` ✨ NOUVEAU
- `backend/auth-service/src/server.js` ✏️ MODIFIÉ
- `backend/api-gateway/src/server.js` ✏️ MODIFIÉ

### Frontend
- `frontend/src/lib/services/preferencesService.ts` ✨ NOUVEAU
- `frontend/src/app/(admin)/backoffice/settings/page.tsx` ✨ NOUVEAU
- `frontend/src/app/(admin)/backoffice/security/logs/page.tsx` ✏️ MODIFIÉ
- `frontend/src/app/(admin)/backoffice/analytics/page.tsx` ✏️ MODIFIÉ
- `frontend/src/components/features/AdminLayout.tsx` ✏️ MODIFIÉ

## 🎉 Fonctionnalités futures

- [ ] Import/Export des préférences
- [ ] Préférences par rôle (admin, user, etc.)
- [ ] Thème sombre/clair
- [ ] Personnalisation des couleurs
- [ ] Préférences de notification avancées
- [ ] Synchronisation multi-appareils
- [ ] Historique des modifications de préférences

## 📞 Support

Pour toute question ou problème, consultez :
- La documentation principale : `README.md`
- La documentation de sécurité : `SYSTEME_SECURITE_README.md`
- Les logs des services : `docker logs auth-service`

---

**Note** : Ce système est conçu pour être extensible. Vous pouvez facilement ajouter de nouvelles préférences en modifiant l'interface `UserPreferences` et en les intégrant dans vos composants.

