# 🔧 Corrections des erreurs 404 et timeouts

## Date: 2025-11-04

### Problèmes identifiés

1. **Erreurs 404 sur endpoints manquants** :
   - `/api/v1/auth/sessions/active` ❌
   - `/api/v1/auth/users` ❌  
   - `/api/v1/applications` ❌
   - `/api/v1/companies` ❌
   - `/api/v1/preferences` ❌

2. **Erreur 503 Service Unavailable** :
   - `/api/v1/services` ⚠️

3. **Timeouts répétés** :
   - `TimeoutError: signal timed out` sur plusieurs endpoints

4. **Besoin de version dynamique** :
   - Remplacer `/api/v1/` en dur par un système dynamique

### Solutions appliquées

#### 1. ✅ Configuration centralisée de l'API

**Fichier créé** : `frontend/src/config/api.config.ts`

- Version dynamique de l'API (actuellement `v1`)
- Helper `buildApiUrl(endpoint)` pour construire les URLs
- Liste des endpoints optionnels
- Configuration des timeouts

**Utilisation** :
```typescript
import { buildApiUrl } from '@/config/api.config'

// Au lieu de :
const url = `${API_URL}/api/v1/users`

// Utiliser :
const url = buildApiUrl('users')  // http://localhost:3000/api/v1/users
```

#### 2. ✅ Gestion silencieuse des 404 sur endpoints optionnels

**Modifications dans** :
- `frontend/src/lib/services/preferencesService.ts`
- `frontend/src/app/(admin)/backoffice/page.tsx`

**Principe** :
- Les 404 sur endpoints optionnels ne sont plus loggés
- Retourne des valeurs par défaut au lieu de fail
- Évite de polluer la console

#### 3. ✅ Augmentation des timeouts

**Modifications dans** : `frontend/src/lib/services/centralMetricsService.ts`

- Timeouts standards : `3s` → `10s`
- Timeouts longs (historique) : `8s` → `15s`
- Timeout API Gateway : `2s` → `8s`

### Actions recommandées

#### Backend : Créer les endpoints manquants

1. **Sessions actives** : `/api/v1/auth/sessions/active`
   ```bash
   # Créer dans backend/auth-service/src/controllers/sessions.controller.js
   # Ajouter route dans backend/auth-service/src/routes/sessions.routes.js
   # Proxier depuis API Gateway
   ```

2. **Applications** : `/api/v1/applications`
   ```bash
   # Vérifier backend/application-service
   # Vérifier le proxy dans API Gateway
   ```

3. **Companies** : `/api/v1/companies`
   ```bash
   # Vérifier backend/company-service
   # Vérifier le proxy dans API Gateway
   ```

#### Frontend : Migration vers buildApiUrl

**Fichiers à migrer** :
```bash
# Rechercher tous les appels axios avec /api/v1/ en dur
grep -r "axios.*api/v1/" frontend/src/lib/services/
grep -r "axios.*api/v1/" frontend/src/app/
```

**Pattern à remplacer** :
```typescript
// AVANT
axios.get(`${API_URL}/api/v1/users`)

// APRÈS  
import { buildApiUrl } from '@/config/api.config'
axios.get(buildApiUrl('users'))
```

### État actuel

✅ **Fonctionne** :
- Métriques Docker depuis l'agrégateur
- Services récupérés (19 services)
- CPU et mémoire affichés correctement
- Système de cache

⚠️ **À corriger** :
- Timeouts occasionnels sur `/api/v1/services`
- Agrégateur retourne parfois `null`
- Fallback vers sources individuelles fonctionne mais moins optimal

❌ **Non implémenté** :
- Endpoints pour sessions/applications/companies
- Migration complète vers `buildApiUrl`

### Prochaines étapes

1. Implémenter les endpoints manquants côté backend
2. Migrer tous les appels API vers `buildApiUrl`
3. Investiguer les causes des timeouts sur `/api/v1/services`
4. Optimiser l'agrégateur pour éviter les retours `null`

