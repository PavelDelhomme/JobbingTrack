# 🔧 Lib - Utilitaires et Services

Bibliothèque d'utilitaires, hooks et services pour l'application frontend JobbingTrack.

## 📁 Structure Organisée

```
lib/
├── README.md                  # ← Documentation (ce fichier)
│
├── hooks/                     # Hooks React personnalisés
│   ├── useAuth.tsx           # Gestion de l'authentification
│   ├── useTheme.ts           # Gestion du thème sombre/clair
│   └── index.ts              # Exports des hooks
│
├── integrations/             # Services d'intégration externe
│   ├── calendar-integration.ts  # Intégration calendrier
│   ├── linkedin.ts           # Intégration LinkedIn
│   └── index.ts              # Exports des intégrations
│
├── api.ts                    # Client API principal
├── auth.tsx                  # Provider d'authentification (legacy)
├── theme.ts                  # Configuration thème (legacy)
└── utils/                    # Utilitaires divers
    └── index.ts              # Exports des utilitaires
```

## 🎯 Services et Hooks

### Authentification (`hooks/useAuth`)
Hook principal pour la gestion de l'authentification utilisateur.
```tsx
import { useAuth } from '@/lib/hooks'

function MyComponent() {
  const { user, token, login, logout, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return <Dashboard user={user} />
}
```

### Gestion du Thème (`hooks/useTheme`)
Hook pour la gestion du thème avec persistance et détection système.
```tsx
import { useTheme } from '@/lib/hooks'

function ThemeToggle() {
  const { theme, toggleTheme, actualTheme } = useTheme()

  return (
    <button onClick={toggleTheme}>
      {actualTheme === 'dark' ? '🌙' : '☀️'}
    </button>
  )
}
```

### Intégrations Externes (`integrations/`)
Services pour l'intégration avec des APIs externes.

#### LinkedIn (`integrations/linkedin`)
```tsx
import { linkedinService } from '@/lib/integrations'

const profile = await linkedinService.getProfile('profile-id')
```

#### Calendrier (`integrations/calendar-integration`)
```tsx
import { calendarService } from '@/lib/integrations'

await calendarService.createEvent({
  title: 'Entretien',
  startTime: new Date(),
  attendees: ['redacted@example.invalid']
})
```

## 🚀 Utilisation Rapide

### Hooks
```tsx
// Import depuis le dossier hooks
import { useAuth, useTheme } from '@/lib/hooks'

// Ou import individuel
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/lib/hooks/useTheme'
```

### Intégrations
```tsx
// Import depuis le dossier integrations
import { linkedinService, calendarService } from '@/lib/integrations'

// Ou import individuel
import { linkedinService } from '@/lib/integrations/linkedin'
```

## 🎨 Configuration

### Variables d'Environnement
```bash
# Authentification
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
JWT_SECRET=your-secret-key

# LinkedIn
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Calendrier Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Configuration des Hooks
```tsx
// Dans votre _app.tsx ou layout principal
import { AuthProvider } from '@/lib/hooks/useAuth'

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  )
}
```

## 🔧 Services API

### Client API Principal (`api.ts`)
Configuration centralisée du client HTTP avec interceptors.
```tsx
import { apiClient } from '@/lib/api'

// Requêtes automatiques avec gestion d'erreurs
const response = await apiClient.get('/applications')
const newApp = await apiClient.post('/applications', data)
```

## 📚 Fonctionnalités Avancées

### Gestion d'État Globale
- **Persistance automatique** : localStorage pour les préférences
- **Gestion d'erreurs** : Retry et fallbacks automatiques
- **Cache intelligent** : Évite les requêtes inutiles
- **Optimisations** : Debouncing et throttling

### Sécurité
- **Tokens JWT** : Gestion automatique du refresh
- **HTTPS uniquement** : Sécurité en production
- **CORS configuré** : Contrôle d'accès cross-origin
- **Rate limiting** : Protection contre les abus

## 🚀 Performance

- **Tree-shaking** : Imports optimisés automatiquement
- **Code splitting** : Chargement à la demande
- **Mémorisation** : Évite les calculs redondants
- **Compression** : Bundles optimisés

## 🧪 Tests

```bash
# Tests des hooks
make test-hooks

# Tests des intégrations
make test-integrations

# Tests de l'API client
make test-api

# Tests unitaires complets
make test-lib
```

## 🔄 Migration Legacy

Certains fichiers sont conservés pour compatibilité :
- `auth.tsx` → Migrer vers `hooks/useAuth.tsx`
- `theme.ts` → Migrer vers `hooks/useTheme.ts`
- `utils.ts` → Réorganiser dans des modules spécialisés

## 📈 Monitoring

### Métriques Suivies
- **Temps de réponse** des hooks
- **Taux d'erreur** des intégrations
- **Utilisation mémoire** des services
- **Performance réseau** des APIs

### Logs et Debug
- **Console logs** conditionnels en développement
- **Error boundaries** pour la gestion d'erreurs
- **Performance monitoring** intégré
- **Debug mode** avec variables d'environnement

---

## 🧭 Navigation

### 🔧 **Librairie Frontend**
- **[Accueil Frontend](../../README.md)** - Vue d'ensemble du dashboard
- **[Hooks Personnalisés](./hooks/README.md)** - Gestion d'état et effets
- **[Intégrations Externes](./integrations/README.md)** - Services externes

### 🎨 **Composants Frontend**
- **[Composants Charts](../components/charts/README.md)** - Graphiques SVG performants
- **[Composants Widgets](../components/widgets/README.md)** - Métriques et KPIs
- **[Composants Layout](../components/layout/README.md)** - Mise en page responsive
- **[Composants Forms](../components/forms/README.md)** - Formulaires génériques
- **[Composants Modals](../components/modals/README.md)** - Modales spécialisées
- **[Composants Integrations](../components/integrations/README.md)** - Intégrations externes
- **[Composants UI](../components/ui/README.md)** - Composants de base shadcn/ui
- **[Features Spécialisés](../components/features/README.md)** - Composants métier avancés

### 📚 **Documentation Centrale**
- **[Accueil Projet](../../../README.md)** - Vue d'ensemble complète
- **[Documentation Organisée](../../../docs/README.md)** - Documentation structurée
- **[Spécifications Techniques](../../../docs/SPEC-TECHNIQUE-JOBBINGTRACK.md)** - Architecture détaillée

### 🧪 **Tests et Qualité**
- **[Tests Frontend](../../README.md#tests)** - Tests unitaires et e2e
- **[Tests Automatisés](../../../tests/README.md)** - Suite complète
- **[Tests d'Intégration](../../../tests/README.md#tests-dintegration)** - Workflows complets

### 📦 **Déploiement**
- **[Guide de Déploiement](../../../docs/deployment/README.md)** - Production complète
- **[Variables d'Environnement](../../../README.md#variables-denvironnement)** - Configuration

### 🛠️ **Outils de Développement**
- **[Makefiles](../../../makefiles/README.md)** - Commandes automatisées
- **[Scripts Frontend](../../../scripts/README.md)** - Outils spécialisés

### 📁 **Structure du Projet**
- **[Backend](../../../backend/README.md)** - Architecture microservices
- **[Mobile](../../../mobile/README.md)** - Application React Native
- **[API](../../../docs/api/README.md)** - Documentation API complète
