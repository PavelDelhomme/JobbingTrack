# 📊 Guide - Tendances des Métriques

## 🎯 Vue d'ensemble

Les **indicateurs de tendance** dans le dashboard affichent les variations en pourcentage par rapport à une période précédente, avec une **logique de couleur adaptée** à chaque métrique.

## ✅ Logique des Couleurs

### **Principe de Base**

| Type de Métrique | Augmentation (↑) | Diminution (↓) | Raison |
|------------------|------------------|----------------|---------|
| **CPU** | 🔴 Rouge (Mauvais) | 🟢 Vert (Bon) | Moins de CPU utilisé = meilleure performance |
| **Mémoire** | 🔴 Rouge (Mauvais) | 🟢 Vert (Bon) | Moins de mémoire utilisée = meilleure efficacité |
| **Temps de Réponse** | 🔴 Rouge (Mauvais) | 🟢 Vert (Bon) | Temps de réponse plus rapide = meilleure UX |
| **Disponibilité** | 🟢 Vert (Bon) | 🔴 Rouge (Mauvais) | Plus de disponibilité = meilleur service |

### **Règles Détaillées**

#### 1️⃣ **Métriques "Moins = Mieux"** (`trendType="positive-is-bad"`)

Pour les métriques où **une valeur plus basse est meilleure** :

- **CPU (Conteneurs)** : `-3.2%` → 🟢 Vert (moins de CPU utilisé)
- **Mémoire (Conteneurs)** : `-5.1%` → 🟢 Vert (moins de mémoire utilisée)
- **Temps de Réponse** : `-8.3%` → 🟢 Vert (réponses plus rapides)

**Exemples** :
```typescript
// CPU diminue de 3.2% = BON
trend={-3.2}
trendType="positive-is-bad"
// Affiche: ↓ 3.2% en VERT

// CPU augmente de 5.7% = MAUVAIS
trend={5.7}
trendType="positive-is-bad"
// Affiche: ↑ 5.7% en ROUGE
```

#### 2️⃣ **Métriques "Plus = Mieux"** (`trendType="negative-is-bad"`)

Pour les métriques où **une valeur plus élevée est meilleure** :

- **Disponibilité** : `+2.5%` → 🟢 Vert (plus de disponibilité)
- **Santé Système** : `+4.0%` → 🟢 Vert (meilleure santé)
- **Uptime** : `+1.2%` → 🟢 Vert (plus de temps actif)

**Exemples** :
```typescript
// Disponibilité augmente de 2.5% = BON
trend={2.5}
trendType="negative-is-bad"
// Affiche: ↑ 2.5% en VERT

// Disponibilité diminue de 3.0% = MAUVAIS
trend={-3.0}
trendType="negative-is-bad"
// Affiche: ↓ 3.0% en ROUGE
```

## 🔧 Implémentation Technique

### **Composant MetricCard**

```typescript
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  href, 
  trend,           // Pourcentage de changement
  trendType        // Type de logique
}: {
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'pink' | 'red'
  href?: string
  trend?: number
  trendType?: 'negative-is-bad' | 'positive-is-bad'
}) {
  // Logique de couleur
  const getTrendColor = () => {
    if (trend === undefined || trend === null || trend === 0) 
      return 'text-white/70'
    
    if (trendType === 'positive-is-bad') {
      // Pour CPU, Mémoire, Temps de réponse
      return trend > 0 ? 'text-red-200' : 'text-green-200'
    } else {
      // Pour Disponibilité
      return trend > 0 ? 'text-green-200' : 'text-red-200'
    }
  }

  const getTrendIcon = () => {
    if (trend === undefined || trend === null || trend === 0) return null
    return trend > 0 ? '↑' : '↓'
  }

  // ... reste du composant
}
```

### **Utilisation dans le Dashboard**

```typescript
{/* Disponibilité - Plus = Mieux */}
<MetricCard
  title="Santé Système"
  value="98.5%"
  subtitle="Disponibilité"
  icon={<Zap className="h-6 w-6" />}
  color="blue"
  trend={2.5}  // +2.5% = BON → Vert ↑
  trendType="negative-is-bad"
/>

{/* Temps de Réponse - Moins = Mieux */}
<MetricCard
  title="Temps Réponse"
  value="45ms"
  subtitle="Moyen"
  icon={<Clock className="h-6 w-6" />}
  color="purple"
  trend={-8.3}  // -8.3% = BON → Vert ↓
  trendType="positive-is-bad"
/>

{/* CPU - Moins = Mieux */}
<MetricCard
  title="CPU (Conteneurs)"
  value="42.3%"
  subtitle="Utilisation"
  icon={<Cpu className="h-6 w-6" />}
  color="orange"
  trend={-3.2}  // -3.2% = BON → Vert ↓
  trendType="positive-is-bad"
/>

{/* Mémoire - Moins = Mieux */}
<MetricCard
  title="Mémoire (Conteneurs)"
  value="68.7%"
  subtitle="Utilisation"
  icon={<MemoryStick className="h-6 w-6" />}
  color="yellow"
  trend={1.8}  // +1.8% = MAUVAIS → Rouge ↑
  trendType="positive-is-bad"
/>
```

## 📊 Calcul des Tendances

### **Méthode Recommandée**

Pour calculer la tendance, comparer la valeur actuelle avec la valeur précédente (1 heure, 24 heures, ou 7 jours) :

```typescript
const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// Exemples
calculateTrend(45, 50)   // = -10% (diminution de 10%)
calculateTrend(60, 50)   // = +20% (augmentation de 20%)
calculateTrend(50, 50)   // = 0% (pas de changement)
```

### **Période de Comparaison**

| Période | Usage | Recommandation |
|---------|-------|----------------|
| **1 heure** | Monitoring temps réel | Pour détecter des variations rapides |
| **24 heures** | Vue quotidienne | **Recommandé** - Équilibre entre réactivité et stabilité |
| **7 jours** | Vue hebdomadaire | Pour les tendances à moyen terme |

## 🎨 Palette de Couleurs

### **Tendances dans les Cartes Métriques**

```css
/* Tendance Positive (Bon) */
.trend-positive {
  color: #BBF7D0; /* text-green-200 */
}

/* Tendance Négative (Mauvais) */
.trend-negative {
  color: #FECACA; /* text-red-200 */
}

/* Pas de tendance */
.trend-neutral {
  color: rgba(255, 255, 255, 0.7); /* text-white/70 */
}
```

## 📈 Exemples Visuels

### **Scénarios Typiques**

#### **Scénario 1 : Système Performant** ✅

```
CPU (Conteneurs): 35.2%          ↓ 5.2%  🟢
Mémoire: 58.3%                   ↓ 3.1%  🟢
Temps de Réponse: 42ms           ↓ 8.5%  🟢
Disponibilité: 99.8%             ↑ 0.2%  🟢
```

#### **Scénario 2 : Charge Augmente** ⚠️

```
CPU (Conteneurs): 72.8%          ↑ 12.5% 🔴
Mémoire: 81.5%                   ↑ 8.3%  🔴
Temps de Réponse: 125ms          ↑ 45.2% 🔴
Disponibilité: 98.2%             ↓ 1.5%  🔴
```

#### **Scénario 3 : Optimisation Réussie** ✅

```
CPU (Conteneurs): 28.5%          ↓ 18.3% 🟢
Mémoire: 45.2%                   ↓ 22.1% 🟢
Temps de Réponse: 38ms           ↓ 32.5% 🟢
Disponibilité: 99.9%             ↑ 0.5%  🟢
```

## 🚀 Améliorations Futures

### **À Implémenter**

1. **Calcul Automatique** : Stocker les valeurs historiques et calculer automatiquement les tendances
2. **Période Configurable** : Permettre à l'utilisateur de choisir la période (1h / 24h / 7j)
3. **Seuils d'Alerte** : Alerter quand la tendance dépasse un certain seuil
4. **Graphiques de Tendances** : Afficher un mini graphique de l'évolution
5. **Comparaison Multi-Périodes** : Comparer plusieurs périodes simultanément

### **Stockage des Données Historiques**

```typescript
interface MetricHistory {
  timestamp: Date
  cpu: number
  memory: number
  responseTime: number
  availability: number
}

// Stocker dans Redis ou PostgreSQL
const storeMetricSnapshot = async (metrics: MetricHistory) => {
  // Garder les snapshots des 7 derniers jours
  await prisma.metricHistory.create({
    data: {
      timestamp: new Date(),
      cpu: metrics.cpu,
      memory: metrics.memory,
      responseTime: metrics.responseTime,
      availability: metrics.availability
    }
  })
}

// Récupérer les tendances
const getTrends = async (period: '1h' | '24h' | '7d') => {
  const now = new Date()
  const past = new Date(now.getTime() - getPeriodMs(period))
  
  const [current, previous] = await Promise.all([
    getLatestMetrics(),
    getMetricsAt(past)
  ])
  
  return {
    cpu: calculateTrend(current.cpu, previous.cpu),
    memory: calculateTrend(current.memory, previous.memory),
    responseTime: calculateTrend(current.responseTime, previous.responseTime),
    availability: calculateTrend(current.availability, previous.availability)
  }
}
```

## 🔍 Dépannage

### **Problème : Toutes les tendances sont à 0%**

**Cause** : Pas de données historiques disponibles
**Solution** : Attendre au moins 1 cycle de collecte (5-10 minutes)

### **Problème : Les couleurs sont inversées**

**Cause** : Mauvais `trendType` configuré
**Solution** : Vérifier le `trendType` dans le code :
- CPU/Mémoire/Temps de réponse → `positive-is-bad`
- Disponibilité/Santé → `negative-is-bad`

### **Problème : Les tendances ne se mettent pas à jour**

**Cause** : Le cache frontend empêche le rafraîchissement
**Solution** : Vider le cache ou recharger la page (F5)

## 📚 Ressources

- [Monitoring Best Practices](https://www.datadoghq.com/blog/monitoring-101-collecting-data/)
- [SRE Book - Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Dashboard Design Patterns](https://www.klipfolio.com/resources/articles/what-is-data-visualization)

---

**Créé le** : 3 novembre 2025  
**Version** : 1.0.0  
**Auteur** : JobbingTrack Development Team

