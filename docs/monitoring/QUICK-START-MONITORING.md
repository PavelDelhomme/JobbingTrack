# ⚡ Quick Start - Monitoring JobbingTrack

## 🎯 La Réponse à Votre Question

### "Pourquoi j'ai 123.9% CPU ??"

**→ C'EST NORMAL ! Docker calcule par cœur.**

```
Docker: 1 cœur = 100%
Votre système: 16 cœurs = 1600% max

205% Docker = 2.05 cœurs = 12.8% réel ✅
```

---

## 🚀 Lancer le Script

### Monitoring Complet
```bash
./monitoring.sh
```

**Durée :** ~40 secondes  
**Contient :** 13 tests complets + toutes les métriques

---

## 📊 Lire les Résultats

### CPU
```
   📊 CPU Docker:        254.96%
   ✅ % du système:      15.94%    ← Le vrai chiffre !
```

**Règle :**
- < 50% → ✅ OK
- 50-80% → ⚠️ Surveillez
- > 80% → ❌ Problème

### Load Average
```
   ⚡ Load Average: 0.37 (2.3%)
      • Recommandé: < 16 (nombre de cœurs)
```

**💡 Qu'est-ce que ça veut dire ?**
- **0.37** = En moyenne, 0.37 processus attendent pour s'exécuter
- **2.3%** = Sur 16 cœurs, c'est 2.3% de charge
- Plus proche de 0 = système moins chargé
- Plus proche du nombre de cœurs = système très chargé

**Règle :**
- Load < 16 (nb cœurs) → ✅ OK
- Load > 16 → ❌ Surchargé

### Swap
```
   💱 Swap: 0B
```

**Règle :**
- 0 → ✅ Parfait
- > 0 → ⚠️ Manque RAM

### Uptime
```
   ⏱️  UPTIME SYSTÈME:
      5 jours, 12h, 20min
```

**💡 Format intelligent :**
- Moins d'1h : "45min"
- Moins d'1 jour : "8h, 30min"
- Moins d'1 semaine : "3 jours, 14h, 5min"
- Plus : "2 sems, 3 jours, 8h"
- Jusqu'à : années, mois, semaines, jours, heures, minutes

### Statuts Services
```
   • Sains: 5 | Dégradés: 14 | Offline: 0
   
   💡 Statuts Expliqués:
      • Sain (healthy):    Temps réponse < 50ms
      • Dégradé (degraded): Temps réponse 50-100ms (lent mais OK)
      • Offline:           Service arrêté ou erreur
```

**Services "degraded" = temps de réponse lents, pas critique**

---

## 📊 Tableau de Comparaison Hôte vs Conteneurs

Le script affiche maintenant un tableau comparatif clair :

```
╔════════════════════════════════════════════════════════════════╗
║         COMPARAISON HÔTE vs CONTENEURS JOBBINGTRACK           ║
╠════════════════════════════════════════════════════════════════╣
║ Métrique                      ║ Conteneurs      ║ Système Hôte  ║
╠════════════════════════════════════════════════════════════════╣
║ CPU utilisé                   ║ 2.00%           ║ 16 cœurs      ║
║ Mémoire utilisée             ║ 30.63%          ║ 38.45% (3GB/8GB) ║
║ Conteneurs                     ║ 19 JobbingTrack ║ 25 total      ║
║ Load Average                   ║ 0.37 (2.3%)     ║ Max: 16       ║
╚════════════════════════════════════════════════════════════════╝
```

### 💡 Comment lire ce tableau ?

**CPU utilisé :**
- **Conteneurs (2.00%)** = Utilisation réelle du système par vos conteneurs
- **Système Hôte (16 cœurs)** = Nombre de cœurs disponibles

**Mémoire utilisée :**
- **Conteneurs (30.63%)** = % de mémoire allouée aux conteneurs
- **Système Hôte (38.45%)** = % de RAM totale utilisée par le système (3GB sur 8GB)

**Load Average :**
- **0.37** = En moyenne 0.37 processus attendent pour s'exécuter
- **2.3%** = Sur 16 cœurs, c'est une charge de 2.3%
- Plus le chiffre est bas, mieux c'est !

---

## 🔝 Tous les Processus Docker

Le script affiche maintenant un tableau détaillé de tous les processus :

```
🔝 TOUS LES PROCESSUS DOCKER JOBBINGTRACK (par utilisation CPU):

   Service                                       CPU          Mémoire                    % Mem
   ─────────────────────────────────────────────────────────────────────────────────
   metrics-aggregator                            114.85%      700.7MiB / 7.56GiB        9.05%
   frontend                                      0.10%        866.1MiB / 7.56GiB        11.18%
   loki                                          1.31%        215.8MiB / 7.56GiB        2.79%
   ...

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 RÉSUMÉ TOTAL:
   • Conteneurs JobbingTrack:  25
   • Mémoire totale allouée:   7.56GB
   • Mémoire totale utilisée:  3.12GB (3195.45MB)
   • Pourcentage utilisé:      41.27%
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 💡 Comment le lire ?

**Pour chaque service :**
- **CPU** : Utilisation CPU (peut dépasser 100% = 1 cœur)
- **Mémoire** : Mémoire utilisée / Mémoire limite allouée
- **% Mem** : Pourcentage de la mémoire allouée utilisée par ce service

**Résumé total :**
- **Mémoire totale allouée** : Total de RAM disponible pour Docker
- **Mémoire totale utilisée** : Somme de la mémoire utilisée par tous les services
- **Pourcentage utilisé** : Proportion de la mémoire allouée réellement utilisée

---

## 📖 Documentation

- **Quick Start** → Ce fichier (2 min)
- **README** → `README-MONITORING.md` (point d'entrée)
- **Guide Complet** → `MONITORING-GUIDE.md` (20 min)

---

## 📦 Installation (optionnelle)

### Pour les métriques I/O disque

```bash
# Manjaro/Arch
sudo pacman -S sysstat

# Ubuntu/Debian
sudo apt install sysstat

# Activer le service
sudo systemctl enable sysstat
sudo systemctl start sysstat
```

**Note :** Le script fonctionne sans sysstat, mais les métriques I/O seront limitées

---

## ✅ Checklist Quotidienne

```bash
./monitoring.sh
```

Vérifiez :
- [ ] CPU réel < 50% ✅
- [ ] Load < 16 ✅
- [ ] Swap = 0 ✅
- [ ] Services healthy ✅
- [ ] Disques < 80% ✅

**Durée : ~40 secondes** 🎉

---

## 🆘 En Cas de Problème

### CPU élevé (>80%)
```bash
# Voir les services gourmands
docker stats

# Redémarrer un service
docker restart jobbingtrack-[service]
```

### Disque plein
```bash
# Voir l'espace
docker system df

# Nettoyer
docker system prune -a
```

### Service degraded
```bash
# Voir les logs
docker logs jobbingtrack-[service]

# Redémarrer
docker restart jobbingtrack-[service]
```

---

## 🎯 L'Essentiel

**254.96% CPU ?**
→ = 2.55 cœurs sur 16
→ = 15.94% du système
→ ✅ NORMAL !

**Pas de panique ! 🚀**

---

**Créé le :** 2025-11-03

