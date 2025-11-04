# 🔄 Guide - Enregistrement Automatique des Paramètres

## 📋 Vue d'ensemble

Le système d'enregistrement automatique permet aux administrateurs de **modifier leurs paramètres en temps réel** sans avoir à cliquer sur un bouton "Enregistrer". Toutes les modifications sont automatiquement sauvegardées dans la base de données avec un **debounce intelligent**.

## ✨ Fonctionnalités Principales

### 1. **Enregistrement Automatique avec Debounce**
- ⏱️ **Délai de 800ms** : Les changements sont enregistrés 800ms après la dernière modification
- 🚀 **Performance optimisée** : Évite les appels API excessifs
- ❌ **Annulation intelligente** : Si l'utilisateur modifie à nouveau avant la fin du délai, l'enregistrement précédent est annulé

### 2. **Indicateurs Visuels en Temps Réel**
| État | Icône | Couleur | Description |
|------|-------|---------|-------------|
| **Enregistrement...** | <Loader2 /> | 🔵 Bleu | Animation de spinner pendant la sauvegarde |
| **Enregistré !** | <Check /> | 🟢 Vert | Confirmation de sauvegarde réussie (disparaît après 2s) |
| **Erreur** | <Clock /> | 🔴 Rouge | Erreur de sauvegarde (disparaît après 3s) |

### 3. **Paramètres Enregistrés Automatiquement**

#### 🎨 **Apparence**
```json
{
  "theme": "light | dark | system",
  "language": "fr | en | es",
  "timezone": "Europe/Paris"
}
```

#### 🔄 **Intervalles de Rafraîchissement**
```json
{
  "refreshInterval": {
    "logs": 30000,        // Logs de Sécurité (5-120s)
    "analytics": 10000,   // Analytics (5-60s)
    "metrics": 15000,     // Métriques (5-60s)
    "dashboard": 30000,   // Dashboard (10-120s)
    "services": 20000     // Services (10-120s)
  }
}
```

#### 🔔 **Notifications**
```json
{
  "notifications": {
    "desktop": true,            // Notifications Bureau
    "sound": false,             // Son
    "highPriorityOnly": false   // Priorité Élevée Uniquement
  }
}
```

#### 📱 **Affichage**
```json
{
  "display": {
    "itemsPerPage": 20,       // 10, 20, 50, 100
    "compactMode": false,     // Mode Compact
    "showCharts": true,       // Afficher les Graphiques
    "showMetrics": true       // Afficher les Métriques
  }
}
```

## 🏗️ Architecture Technique

### **Backend** (`auth-service`)

#### Modèle Prisma
```prisma
model UserCustomization {
  id        String   @id @default(cuid())
  userId    String   @unique
  settings  Json     // Stockage flexible de TOUS les paramètres
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### Endpoints API
- `GET /api/v1/preferences` - Récupérer les préférences
- `PUT /api/v1/preferences` - Mettre à jour les préférences (avec fusion intelligente)
- `POST /api/v1/preferences/reset` - Réinitialiser aux valeurs par défaut

#### Controller (`preferences.controller.js`)
- **Fusion intelligente** : Les nouvelles préférences sont fusionnées avec les existantes
- **Création automatique** : Si l'utilisateur n'a pas de préférences, elles sont créées avec des valeurs par défaut
- **Logging** : Toutes les modifications sont loggées

### **Frontend** (`SettingsPopup.tsx`)

#### Hooks et Refs
```typescript
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
```

#### Fonction d'Auto-Save avec Debounce
```typescript
const autoSave = useCallback((newPreferences: UserPreferences) => {
  // Annuler l'enregistrement précédent
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current)
  }
  
  setSaveStatus('saving')
  
  // Programmer l'enregistrement avec délai de 800ms
  saveTimeoutRef.current = setTimeout(async () => {
    try {
      await preferencesService.updateUserPreferences(newPreferences)
      setSaveStatus('saved')
      
      // Réinitialiser après 2 secondes
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Erreur sauvegarde automatique:', error)
      setSaveStatus('error')
    }
  }, 800)
}, [])
```

#### Mise à Jour Automatique
```typescript
// Pour les intervalles de rafraîchissement
const updateRefreshInterval = useCallback((key, value) => {
  const newPreferences = { ...preferences, refreshInterval: { ...preferences.refreshInterval, [key]: value } }
  setPreferences(newPreferences)
  autoSave(newPreferences)  // ⚡ Sauvegarde automatique !
}, [preferences, autoSave])

// Pour l'affichage
const updateDisplay = useCallback((key, value) => {
  const newPreferences = { ...preferences, display: { ...preferences.display, [key]: value } }
  setPreferences(newPreferences)
  autoSave(newPreferences)  // ⚡ Sauvegarde automatique !
}, [preferences, autoSave])

// Pour les notifications
const updateNotifications = useCallback((key, value) => {
  const newPreferences = { ...preferences, notifications: { ...preferences.notifications, [key]: value } }
  setPreferences(newPreferences)
  autoSave(newPreferences)  // ⚡ Sauvegarde automatique !
}, [preferences, autoSave])
```

## 🎯 Flux de Données

```
┌─────────────────────────────────────────────────────────────┐
│                    Utilisateur modifie                       │
│                    un paramètre (ex: thème)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│          updatePreferences({ theme: 'dark' })                │
│                  (fonction React)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              setPreferences(newPreferences)                  │
│              autoSave(newPreferences)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│          Debounce 800ms (annule les précédents)              │
│              setSaveStatus('saving')                         │
└───────────────────────┬─────────────────────────────────────┘
                        │ (après 800ms)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│    PUT /api/v1/preferences (avec newPreferences)             │
│              via preferencesService                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│     preferences.controller.js (Backend)                      │
│     - Fusion avec préférences existantes                     │
│     - UPDATE dans PostgreSQL                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            Réponse { success: true }                         │
│            setSaveStatus('saved')                            │
│            Affichage ✅ "Enregistré !"                       │
└───────────────────────┬─────────────────────────────────────┘
                        │ (après 2 secondes)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            setSaveStatus('idle')                             │
│            L'indicateur disparaît                            │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Tests

### Test Manuel

1. **Ouvrir les Paramètres**
   ```
   Cliquer sur le bouton ⚙️ dans la barre supérieure
   ```

2. **Modifier un Paramètre**
   ```
   - Changer le thème de "Clair" à "Sombre"
   - Observer l'indicateur "💾 Enregistrement..."
   - Attendre 1 seconde
   - Observer l'indicateur "✅ Enregistré !"
   ```

3. **Rafraîchir la Page**
   ```
   - Recharger la page (F5)
   - Rouvrir les Paramètres
   - Vérifier que le thème est toujours "Sombre"
   ```

4. **Test de Debounce**
   ```
   - Déplacer rapidement le slider "Analytics"
   - Observer que "💾 Enregistrement..." n'apparaît qu'après avoir arrêté
   - Vérifier qu'un seul appel API est fait (pas 10 appels)
   ```

### Test avec les Dev Tools

```javascript
// Dans la console du navigateur
localStorage.getItem('token') // Vérifier le token
```

```bash
# Vérifier les logs du backend
docker logs jobbingtrack-auth-service --tail 50 | grep "Préférences"
```

## 🔧 Configuration

### Ajuster le Délai de Debounce

Dans `SettingsPopup.tsx` :
```typescript
saveTimeoutRef.current = setTimeout(async () => {
  // ...
}, 800) // ← Changer cette valeur (en millisecondes)
```

**Recommandations** :
- **500ms** : Plus réactif, mais plus d'appels API
- **800ms** : ⭐ Optimal (recommandé)
- **1500ms** : Plus lent, mais très économe en ressources

### Valeurs par Défaut

Dans `preferences.controller.js` :
```javascript
const defaultSettings = {
  refreshInterval: {
    logs: 30000,
    analytics: 10000,
    metrics: 15000,
    dashboard: 30000,
    services: 20000
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

## 🐛 Dépannage

### Problème : Les paramètres ne sont pas sauvegardés

**Solution 1** : Vérifier que l'utilisateur est authentifié
```bash
# Vérifier les logs du backend
docker logs jobbingtrack-auth-service --tail 20
```

**Solution 2** : Vérifier la base de données
```sql
SELECT * FROM "UserCustomization" WHERE "userId" = 'YOUR_USER_ID';
```

**Solution 3** : Vider le cache et réessayer
```javascript
// Dans la console du navigateur
localStorage.clear()
location.reload()
```

### Problème : L'indicateur reste bloqué sur "Enregistrement..."

**Cause** : Le backend ne répond pas
**Solution** : Vérifier que le service `auth-service` est en cours d'exécution
```bash
docker ps | grep auth-service
docker logs jobbingtrack-auth-service --tail 30
```

### Problème : Erreur 401 Unauthorized

**Cause** : Token expiré ou invalide
**Solution** : Se reconnecter
```bash
# Vérifier le token dans localStorage
localStorage.getItem('token')
```

## 📊 Métriques et Performance

### Temps de Réponse
- **Délai de debounce** : 800ms
- **Appel API** : ~50-200ms
- **Mise à jour BDD** : ~10-30ms
- **Total** : ~860-1030ms après la dernière modification

### Charge Serveur
- **Avant** (avec bouton "Enregistrer") : 1 requête par clic
- **Après** (auto-save avec debounce) : 1 requête toutes les 800ms max, même avec de nombreuses modifications

### Optimisations
- ✅ **Debounce** : Évite les appels API inutiles
- ✅ **Fusion intelligente** : Ne met à jour que les champs modifiés
- ✅ **Cleanup** : Les timeouts sont nettoyés au démontage du composant
- ✅ **Cache** : Les préférences sont cachées côté frontend

## 📝 Notes de Développement

### Ajout d'un Nouveau Paramètre

1. **Backend** : Aucune modification nécessaire (stockage JSON flexible)

2. **Frontend** : Ajouter dans `SettingsPopup.tsx`
```typescript
const updateMyNewSetting = useCallback((value) => {
  const newPreferences = {
    ...preferences,
    myNewSetting: value
  }
  setPreferences(newPreferences)
  autoSave(newPreferences)  // Auto-save !
}, [preferences, autoSave])
```

3. **Type TypeScript** : Ajouter dans `preferencesService.ts`
```typescript
export interface UserPreferences {
  // ... autres champs
  myNewSetting?: string
}
```

## 🚀 Améliorations Futures

- [ ] **Historique des modifications** : Tracker les changements de préférences
- [ ] **Synchronisation multi-onglets** : Mettre à jour les préférences dans tous les onglets ouverts
- [ ] **Notifications push** : Notifier l'utilisateur quand les préférences sont synchronisées
- [ ] **Export/Import** : Permettre d'exporter et importer les préférences
- [ ] **Préréglages** : Proposer des profils de préférences prédéfinis

---

**Créé le** : 3 novembre 2025  
**Version** : 1.0.0  
**Auteur** : JobbingTrack Development Team

