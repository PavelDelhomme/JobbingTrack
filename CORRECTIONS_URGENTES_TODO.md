# 🚨 Corrections Urgentes à Effectuer

## 1. Page Analytics - Services & Logs

### Problèmes identifiés :
- ❌ Logs ne s'affichent pas (maintenant corrigé avec le nouveau service)
- ❌ RX/TX affichent "N/A" ou 0
- ❌ Temps de réponse non affiché
- ❌ Données manquantes dans les métriques

### Solution :
Les métriques doivent être enrichies avec les données réseau depuis `containerMetrics`. Le problème vient de `centralMetricsService.fetchMetrics()` qui ne retourne pas toutes les informations.

**Fichier à modifier** : `frontend/src/lib/services/centralMetricsService.ts`

```typescript
// Ajouter dans fetchMetrics() :
if (data.services) {
  Object.keys(data.services).forEach(serviceName => {
    const service = data.services[serviceName];
    const containerName = serviceName.replace('jobbingtrack-', '');
    
    // Enrichir avec les données du conteneur
    if (data.containers && data.containers[containerName]) {
      const container = data.containers[containerName];
      service.metrics = {
        ...service.metrics,
        network: container.network || { rx: 0, tx: 0, rx_mb: 0, tx_mb: 0 },
      };
      service.responseTimeMs = service.health?.responseTime || null;
      service.networkMb = {
        rx: (container.network?.rx || 0) / 1024 / 1024,
        tx: (container.network?.tx || 0) / 1024 / 1024,
      };
    }
  });
}
```

## 2. Pages manquantes dans /backoffice

### Pages à créer/réactiver :

#### Applications
- `frontend/src/app/(admin)/backoffice/applications/page.tsx`
- Copier depuis `app/(development)/services/applications/page.tsx`

#### Companies
- `frontend/src/app/(admin)/backoffice/companies/page.tsx`
- Copier depuis `app/(dashboard)/entities/companies/page.tsx`

#### Contacts
- `frontend/src/app/(admin)/backoffice/contacts/page.tsx`
- Créer nouvelle page

#### Interviews
- `frontend/src/app/(admin)/backoffice/interviews/page.tsx`
- Créer nouvelle page

#### Calls
- `frontend/src/app/(admin)/backoffice/calls/page.tsx`
- Créer nouvelle page

#### Users (PRIORITAIRE)
- `frontend/src/app/(admin)/backoffice/users/page.tsx`
- Copier depuis `app/(dashboard)/entities/users/page.tsx`

#### Data Management
- `frontend/src/app/(admin)/backoffice/data-management/page.tsx`
- Créer nouvelle page pour gérer les données

#### API Tester
- `frontend/src/app/(admin)/backoffice/api-tester/page.tsx`
- Créer outil de test d'API

#### Test Data
- `frontend/src/app/(admin)/backoffice/test-data/page.tsx`
- Créer générateur de données de test

#### Mobile Emulator
- `frontend/src/app/(admin)/backoffice/mobile-emulator/page.tsx`
- Copier depuis `app/(development)/mobile-emulator/page.tsx`

#### Playwright Tests
- `frontend/src/app/(admin)/backoffice/playwright-tests/page.tsx`
- Créer visualiseur de tests

#### Performance Tests
- `frontend/src/app/(admin)/backoffice/performance-tests/page.tsx`
- Créer visualiseur de tests de performance

#### Events
- `frontend/src/app/(admin)/backoffice/events/page.tsx`
- Créer nouvelle page

#### Notifications
- `frontend/src/app/(admin)/backoffice/notifications/page.tsx`
- Créer nouvelle page

#### Followups
- `frontend/src/app/(admin)/backoffice/followups/page.tsx`
- Créer nouvelle page

## 3. Page backoffice/services - Ligne cliquable

**Problème** : On ne peut plus cliquer sur une ligne de service

**Fichier** : `frontend/src/app/(admin)/backoffice/services/page.tsx`

**Solution** : Ajouter un onClick sur les lignes du tableau

```tsx
<tr 
  key={service.name} 
  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
  onClick={() => router.push(`/backoffice/services/${service.name.replace('jobbingtrack-', '')}`)}
>
```

## 4. Pages de sécurité vides

### Logs de sécurité
**Fichier à créer** : `frontend/src/app/(admin)/backoffice/security/logs/page.tsx`

### Analyse de sécurité
**Fichier à créer** : `frontend/src/app/(admin)/backoffice/security/analysis/page.tsx`

Utiliser `analyticsService.getSecuritySummary()` et `analyticsService.getSecurityMetrics()`

---

## Ordre de priorité

1. ✅ **FAIT** : Corriger les logs dans Analytics (nouveau service de persistance)
2. 🔴 **URGENT** : Enrichir les métriques réseau et temps de réponse
3. 🔴 **URGENT** : Créer page /backoffice/users
4. 🟡 **Important** : Rendre les lignes cliquables dans /backoffice/services
5. 🟡 **Important** : Créer les pages de sécurité
6. 🟢 **Normal** : Créer les autres pages manquantes

---

## Script de vérification

```bash
# Vérifier quelles pages existent
ls -la frontend/src/app/\(admin\)/backoffice/

# Vérifier les logs
curl http://localhost:3014/api/v1/persistence/containers/jobbingtrack-auth-service/logs/live?tail=20 | jq

# Vérifier les métriques
curl http://localhost:3014/api/v1/metrics | jq
```

