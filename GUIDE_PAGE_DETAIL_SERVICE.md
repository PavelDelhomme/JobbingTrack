# 📊 Guide - Page de Détail des Services

## 🎯 Vue d'ensemble

La **page de détail d'un service** (`/backoffice/services/[serviceName]`) affiche maintenant toutes les informations en **temps réel** pour un service Docker spécifique, incluant les métriques, l'historique de performance, et les logs en direct.

## ✅ Corrections Appliquées

### 1️⃣ **Bouton Retour Intelligent** ✅

**Avant** ❌ : Le bouton retour redirige toujours vers `/backoffice/analytics`

**Après** ✅ : Le bouton utilise l'historique du navigateur
```typescript
// Utilise router.back() pour revenir à la page précédente
<button onClick={() => router.back()}>
  <ArrowLeft />
</button>
```

**Avantages** :
- Retour à `/backoffice/services` si on vient de la liste
- Retour à `/backoffice` (dashboard) si on vient de la popup
- Meilleure UX, navigation intuitive

### 2️⃣ **Détection du Statut Améliorée** ✅

**Problème** : Le service affichait "running" dans la liste mais "Service non disponible" en détail

**Cause** : Logique de détection du statut incohérente

**Solution** :
```typescript
// Priorité au statut Docker natif
const dockerHealth = serviceMetrics?.health_status_docker || 'none';
const httpHealth = serviceMetrics?.health_status_http || 'unknown';
const isHealthy = dockerHealth === 'healthy' || (dockerHealth === 'none' && httpHealth === 'healthy');
```

**Règles** :
- Si `dockerHealth === 'healthy'` → Service OK ✅
- Si `dockerHealth === 'unhealthy'` → Service KO ❌
- Si `dockerHealth === 'none'` ET `httpHealth === 'healthy'` → Service OK ✅
- Sinon → Service KO ❌

### 3️⃣ **Métriques Réseau Complètes** ✅

**Avant** ❌ : Affichage uniquement du total réseau

**Après** ✅ : Détail RX (Réception) et TX (Transmission)

```typescript
<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
  <Network className="h-8 w-8 text-orange-600" />
  <h3>{(networkRxMb + networkTxMb).toFixed(2)} MB</h3>
  <p>Traffic Réseau Total</p>
  <div className="flex justify-between text-xs">
    <span>↓ RX: {networkRxMb.toFixed(2)} MB</span>
    <span>↑ TX: {networkTxMb.toFixed(2)} MB</span>
  </div>
</div>
```

### 4️⃣ **Rafraîchissement en Temps Réel** ✅

**Avant** ❌ : Rafraîchissement toutes les 10 secondes

**Après** ✅ : Rafraîchissement toutes les **5 secondes**

```typescript
useEffect(() => {
  loadServiceData();
  const interval = setInterval(() => loadServiceData(), 5000); // 5s
  return () => clearInterval(interval);
}, [serviceName]);
```

**Impact** : Données 2x plus réactives !

### 5️⃣ **Logs en Temps Réel avec Auto-Scroll** ✅

**Fonctionnalités** :
- ✅ Auto-scroll automatique vers le bas
- ✅ Bouton pour activer/désactiver l'auto-scroll
- ✅ Affichage des 100 dernières lignes (au lieu de 50)
- ✅ Coloration intelligente des logs :
  - 🔴 Rouge : errors, exceptions, fatal
  - 🟡 Jaune : warnings
  - 🔵 Bleu : info
  - ⚫ Gris : debug
  - 🟢 Vert : normal

**Code** :
```typescript
const [autoScroll, setAutoScroll] = useState(true);
const logsEndRef = useRef<HTMLDivElement>(null);

// Auto-scroll vers le bas
useEffect(() => {
  if (autoScroll && logsEndRef.current) {
    logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [serviceLogs, autoScroll]);

// Affichage
<div className="max-h-[500px] overflow-y-auto">
  {serviceLogs.lines.slice(-100).map((line, index) => (
    <div className={getLogColor(line)}>{line}</div>
  ))}
  <div ref={logsEndRef} />
</div>
```

**Bouton flottant** :
- Apparaît quand auto-scroll est désactivé
- Permet de revenir en bas et réactiver l'auto-scroll

### 6️⃣ **Historique Étendu** ✅

**Avant** ❌ : 20-30 points de données

**Après** ✅ : **50 points de données** minimum

```typescript
const historyResponse = await fetch(
  `${metricsUrl}/api/v1/docker/service/${fullServiceName}/history?limit=50`
);
```

**Avantage** : Graphiques plus détaillés et précis !

## 📊 Structure de la Page

### **1. Header**
```
┌─────────────────────────────────────────────┐
│ [← Retour]  Service Name                   │
│                              [🔄 Actualiser]│
└─────────────────────────────────────────────┘
```

### **2. Bannière de Statut**
```
┌─────────────────────────────────────────────┐
│ ✅ Service opérationnel           45ms      │
│ Docker: healthy  HTTP: healthy              │
└─────────────────────────────────────────────┘
```

### **3. Cartes de Métriques** (4 cartes)
```
┌──────────┬──────────┬──────────┬──────────┐
│   CPU    │ Mémoire  │Processus │  Réseau  │
│  42.3%   │ 180 MB   │    15    │ 25.4 MB  │
│          │          │          │ ↓12 ↑13  │
└──────────┴──────────┴──────────┴──────────┘
```

### **4. Historique des Performances**
```
┌─────────────────────────────────────────────┐
│ 📊 Historique des Performances (50 points) │
│                                             │
│ ▸ Graphique CPU (AreaChart)                │
│ ▸ Graphique Mémoire (AreaChart)            │
│ ▸ Graphique Réseau RX/TX (LineChart)       │
└─────────────────────────────────────────────┘
```

### **5. Logs en Temps Réel**
```
┌─────────────────────────────────────────────┐
│ 💻 Logs du Service (Temps Réel)            │
│ [✓ Auto-Scroll Actif] 124 lignes 3 erreurs │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ [ERROR] Failed to connect to DB        ││
│ │ [WARN] Retry attempt 1/3                ││
│ │ [INFO] Server started on port 8001     ││
│ │ ...                                     ││
│ │ [DEBUG] Processing request             ││
│ │ [▼ auto-scroll ref]                    ││
│ └─────────────────────────────────────────┘│
│ 🔄 Rafraîchissement automatique toutes 5s  │
└─────────────────────────────────────────────┘
```

## 🔍 Debugging

### **Console Logs Ajoutés**

Pour faciliter le debugging, des logs ont été ajoutés :

```typescript
console.log('[SERVICE DETAIL] Métriques reçues:', data.service);
console.log('[SERVICE DETAIL] Logs reçus:', logsData.total, 'lignes');
console.log('[SERVICE DETAIL] Historique reçu:', historyData.data?.length, 'points');
console.log('[SERVICE DETAIL] Statuts:', { dockerHealth, httpHealth, isHealthy, cpuPercent, memoryPercent });
```

**Utilisation** :
1. Ouvrir la console du navigateur (F12)
2. Aller sur une page de détail de service
3. Observer les logs pour identifier les problèmes

### **Problèmes Courants**

#### **1. "Service Non Disponible" alors qu'il tourne**

**Symptôme** : Le service est en "running" dans la liste mais "non disponible" en détail

**Cause** : 
- `dockerHealth === 'none'` (pas de healthcheck Docker configuré)
- `httpHealth === 'degraded'` ou `'unknown'`

**Solution** :
- Vérifier les logs du service
- Vérifier que l'endpoint `/health` répond correctement
- Vérifier la configuration Docker healthcheck

#### **2. Pas de données d'historique**

**Symptôme** : Les graphiques sont vides

**Cause** : 
- Le service vient juste de démarrer
- L'endpoint `/history` ne retourne pas de données

**Solution** :
- Attendre quelques minutes pour que les métriques s'accumulent
- Vérifier les logs : `[SERVICE DETAIL] Historique reçu: 0 points`

#### **3. Logs non affichés**

**Symptôme** : La section logs est vide

**Cause** : 
- Le service n'a pas encore de logs
- L'endpoint `/logs` ne fonctionne pas

**Solution** :
```bash
# Tester manuellement
curl http://localhost:8014/api/v1/docker/service/jobbingtrack-auth-service/logs?lines=10
```

## 🚀 Fonctionnalités Avancées

### **1. Filtrage des Logs**

À implémenter dans le futur :
```typescript
const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

const filteredLogs = serviceLogs.lines.filter(line => {
  if (logFilter === 'error') return line.toLowerCase().includes('error');
  if (logFilter === 'warn') return line.toLowerCase().includes('warn');
  if (logFilter === 'info') return line.toLowerCase().includes('info');
  return true;
});
```

### **2. Export des Logs**

```typescript
const exportLogs = () => {
  const blob = new Blob([serviceLogs.lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${serviceName}-logs-${new Date().toISOString()}.log`;
  a.click();
};
```

### **3. Recherche dans les Logs**

```typescript
const [searchTerm, setSearchTerm] = useState('');

const highlightedLogs = serviceLogs.lines.map(line => 
  line.replace(
    new RegExp(searchTerm, 'gi'),
    match => `<mark>${match}</mark>`
  )
);
```

## 📈 Performance

### **Optimisations Appliquées**

1. **Rafraîchissement intelligent** : Ne rafraîchit que si la page est visible
2. **Slice des logs** : Affiche seulement les 100 dernières lignes
3. **Debounce auto-scroll** : Utilise `behavior: 'smooth'`
4. **Cleanup** : Nettoie les intervals au démontage

### **Métriques**

| Métrique | Valeur | Remarque |
|----------|--------|----------|
| Rafraîchissement | 5s | Configurable |
| Logs affichés | 100 lignes | Configurable |
| Historique | 50 points | Configurable |
| Taille page | ~2-3 MB | Avec données |

## 📝 Maintenance

### **Ajout d'un Nouveau Graphique**

1. Ajouter les données dans le backend (endpoint `/history`)
2. Récupérer les données dans le frontend
3. Ajouter le graphique avec Recharts :

```typescript
<ResponsiveContainer width="100%" height={200}>
  <AreaChart data={serviceHistory}>
    <XAxis dataKey="timestamp" />
    <YAxis />
    <Tooltip />
    <Area type="monotone" dataKey="new_metric" stroke="#8884d8" fill="#8884d8" />
  </AreaChart>
</ResponsiveContainer>
```

### **Modification du Délai de Rafraîchissement**

```typescript
// Dans useEffect, changer la valeur :
const interval = setInterval(() => loadServiceData(), 5000); // 5s → 3s par exemple
```

---

**Créé le** : 3 novembre 2025  
**Version** : 1.0.0  
**Auteur** : JobbingTrack Development Team

