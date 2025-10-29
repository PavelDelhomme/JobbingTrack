# 🔧 Résolution des Problèmes de Métriques

[← Architecture Métriques](../README.md) | [← Documentation](../../../README.md) | [← README principal](../../../../README.md) | [🧭 Navigation](../../../navigation.md)

## 📋 Résumé des Corrections Effectuées

### 1. **Cache Frontend Désactivé**
- **Problème** : Les données étaient en cache pendant 60 secondes
- **Solution** : Cache désactivé temporairement dans `centralMetricsService.ts`
- **Fichier** : `/frontend/src/lib/services/centralMetricsService.ts`

### 2. **Popup "État des Services" Restaurée**
- **Problème** : La carte n'était plus cliquable
- **Solution** : Ajout de `onClick={() => setShowServicesPopup(true)}`
- **Fichier** : `/frontend/src/app/backoffice/page.tsx`

### 3. **Mapping CPU/Mémoire Corrigé**
- **Problème** : Backend renvoie `percent`, frontend attend `usage`
- **Solution** : Mapping dans `getAggregatorMetrics()`
- **Code** : `usage: data.system.cpu?.percent ?? data.system.cpu?.usage ?? 0`

### 4. **Collection des Conteneurs Modifiée**
- **Problème** : cAdvisor ne retourne aucun conteneur
- **Solution** : Utilisation de `systeminformation` au lieu de cAdvisor
- **Fichier** : `/backend/metrics-aggregator-service/src/server.js`

## 🚨 Problème Principal Actuel

Le service **metrics-aggregator** ne démarre pas car il utilise le profil `monitoring` qui n'est pas activé par défaut.

## ✅ Solution Complète

### Étape 1 : Supprimer le Profil du Service

Éditez `/docker-compose.yml` ligne 155-157 et **supprimez** ces lignes :

```yaml
# SUPPRIMER CES LIGNES :
    profiles:
      - monitoring
      - full
```

### Étape 2 : Reconstruire et Démarrer le Service

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Arrêter le service
docker-compose stop jobbingtrack-metrics-aggregator

# Supprimer le conteneur
docker-compose rm -f jobbingtrack-metrics-aggregator

# Supprimer l'image
docker rmi jobbingtrack-metrics-aggregator

# Reconstruire sans cache
docker-compose build --no-cache jobbingtrack-metrics-aggregator

# Démarrer
docker-compose up -d jobbingtrack-metrics-aggregator

# Attendre 10 secondes
sleep 10

# Vérifier les logs
docker-compose logs --tail=30 jobbingtrack-metrics-aggregator
```

### Étape 3 : Tester les Métriques

```bash
# Test 1 : Vérifier que le service répond
curl http://localhost:3014/api/v1/health

# Test 2 : Récupérer les métriques
curl -s http://localhost:3014/api/v1/metrics | jq '{
  cpu: .system.cpu.percent,
  memory: .system.memory.percent,
  containers: (.containers | length),
  jobbingtrack: .system.jobbingtrack,
  timestamp: .timestamp
}'
```

**Résultat attendu** :
```json
{
  "cpu": 2.5,
  "memory": 14.5,
  "containers": 15,
  "jobbingtrack": {
    "containers": {
      "count": 8,
      "cpu": {
        "averagePercent": 15,
        "totalPercent": 120
      },
      "memory": {
        "used": 2048,
        "limit": 4096,
        "percent": 50
      }
    }
  },
  "timestamp": "2025-10-29T10:28:00.000Z"
}
```

### Étape 4 : Vérifier le Dashboard

1. Ouvrir http://localhost:8080
2. Aller sur "Vue d'ensemble"
3. Ouvrir la console du navigateur (F12)
4. Recharger la page (Ctrl+R)

**Vous devriez voir** :
- Logs `[CACHE] Cache désactivé pour tests`
- Logs `[AGGREGATOR] Données brutes reçues`
- CPU et Mémoire affichés correctement
- Timestamp qui change toutes les 10 secondes

## 🐛 Dépannage

### Le service ne démarre pas

```bash
# Vérifier le statut
docker-compose ps

# Voir les erreurs
docker-compose logs jobbingtrack-metrics-aggregator

# Vérifier l'image
docker images | grep metrics-aggregator
```

### Les conteneurs ne sont pas détectés

```bash
# Vérifier que Docker socket est accessible
docker-compose exec jobbingtrack-metrics-aggregator ls -la /var/run/docker.sock

# Devrait afficher : srw-rw---- 1 root docker
```

### Les métriques ne changent pas

```bash
# Test en boucle
for i in {1..5}; do
  echo "Test $i:"
  curl -s http://localhost:3014/api/v1/metrics | jq -r '.timestamp'
  sleep 3
done

# Les timestamps DOIVENT être différents
```

### Cache Frontend Persistant

```bash
# Ouvrir la console navigateur (F12)
# Onglet Application > Storage > Clear site data
# Recharger la page
```

## 📊 Logs à Surveiller

### Backend (Bon)
```
[COLLECTOR] === DÉBUT COLLECTE ===
[DOCKER] 15 conteneurs trouvés
[DOCKER] jobbingtrack-frontend: CPU 2.50%, Mémoire 12.30%
[COLLECTOR] JobbingTrack: 8 conteneurs, CPU avg: 15%, Mémoire: 50%
[COLLECTOR] === FIN COLLECTE ===
```

### Backend (Mauvais)
```
[CONTAINERS] Récupération depuis cAdvisor...
[CADVISOR] 0 conteneurs trouvés
```

### Frontend (Bon)
```
[CACHE] Cache désactivé pour tests - rechargement
[AGGREGATOR] Données brutes reçues: { cpu_percent: 2.5, memory_percent: 14.5 }
```

## 🎯 Checklist Finale

- [ ] Profil `monitoring` supprimé de `docker-compose.yml`
- [ ] Service reconstructit avec `--no-cache`
- [ ] Logs montrent `[DOCKER]` et non `[CADVISOR]`
- [ ] `/api/v1/metrics` retourne des conteneurs (length > 0)
- [ ] Timestamp change toutes les 10 secondes
- [ ] Dashboard affiche CPU et Mémoire correctement
- [ ] Console navigateur affiche logs `[AGGREGATOR]`
- [ ] Section "Conteneurs JobbingTrack" visible

## 📁 Fichiers Modifiés

1. `/frontend/src/lib/services/centralMetricsService.ts`
   - Cache désactivé (ligne 147)
   - Mapping percent → usage (ligne 547-556)
   - Logs ajoutés

2. `/frontend/src/app/backoffice/page.tsx`
   - Carte "État des Services" cliquable (ligne 485)
   - Section "Conteneurs JobbingTrack" (ligne 434-477)
   - useEffect avec fetchMetrics() (ligne 159)

3. `/backend/metrics-aggregator-service/src/server.js`
   - Collection via systeminformation (ligne 163-220)
   - Calcul métriques JobbingTrack (ligne 277-313)

4. `/docker-compose.yml`
   - **À MODIFIER** : Supprimer lignes 155-157 (profiles)

## 🔄 Réactiver le Cache (Après Tests)

Une fois que tout fonctionne, réactiver le cache dans `centralMetricsService.ts` :

```typescript
private getCachedMetrics(): MetricsData | null {
  const now = Date.now()
  if (this.metricsCache && (now - this.cacheTimestamp) < this.cacheDuration) {
    return this.metricsCache
  }
  return null
}
```

---

**Dernière mise à jour** : 2025-10-29T10:28:00+01:00
