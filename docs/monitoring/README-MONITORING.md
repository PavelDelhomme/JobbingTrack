# 📊 Monitoring JobbingTrack

## 🚀 Démarrage Ultra-Rapide

```bash
./monitoring.sh
```

**C'est tout ! Le script fait tout automatiquement en ~90 secondes.**  
_(13 tests complets + monitoring temporel 5 collectes)_

---

## 📁 Fichiers Disponibles

### 1. `monitoring.sh` 
**Le script principal** - Tout-en-un
- Durée : ~90 secondes (13 tests + monitoring temporel)
- Contient : Toutes les métriques + 5 collectes temporelles
- Usage : `./monitoring.sh`

### 2. `QUICK-START-MONITORING.md`
**Guide de démarrage** (2 min de lecture)
- Comment lire les résultats
- Checklist quotidienne
- Installation optionnelle (sysstat)

### 3. `MONITORING-GUIDE.md`
**Documentation complète** (20 min de lecture)
- Toutes les métriques expliquées  
- Troubleshooting complet
- Exemples d'utilisation
- Guide de maintenance

---

## 💡 L'Essentiel

### CPU > 100% ? NORMAL !

```
Docker : 254.96% = 2.55 cœurs sur 16 = 15.94% réel ✅
```

Docker calcule **par cœur** (1 cœur = 100%), pas globalement.

### Services "degraded" ? OK !

```
degraded = temps réponse 50-100ms (lent mais fonctionne)
```

Pas critique, juste un peu lent.

### Utilisation

```bash
# Monitoring complet
./monitoring.sh

# Avec rapport sauvegardé
./monitoring.sh > rapport-$(date +%Y%m%d).log

# Surveillance continue
watch -n 60 './monitoring.sh'
```

---

## ✅ Checklist Rapide

Après chaque `./monitoring.sh`, vérifier :

- [ ] CPU réel < 50% ✅
- [ ] Load < 16 (nb de cœurs) ✅  
- [ ] Swap = 0 ✅
- [ ] Services dégradés < 50% ✅
- [ ] Disques < 80% ✅

---

## 🆘 Problème ?

1. **Lire** `QUICK-START-MONITORING.md` (2 min)
2. **Chercher** dans `MONITORING-GUIDE.md` section "Troubleshooting"

---

## 🔧 Corrections Appliquées

### Docker Stats Corrigé
**Problème :** `unknown flag: --filter`  
**Solution :** Utilise maintenant `docker stats` puis filtre avec `grep`

### Monitoring Temporel Amélioré
- **5 collectes** au lieu de 3 (espacées de 10s)
- **Toutes les métriques** collectées à chaque étape :
  - CPU, Mémoire, Load
  - Réseau (RX/TX)
  - Temps de réponse
  - Santé des services
  - Disponibilité
- **Analyse complète** : moyennes, min/max, variations, tendances
- **Durée totale** : ~50 secondes
- **Erreurs corrigées** : Plus d'erreurs "illegal character" ou "invalid number" dans les calculs

### Tableau Comparaison Hôte vs Conteneurs
**Améliorations :**
- **Mémoire système** : Affichage correct du pourcentage utilisé (avant: 0.00%)
- **CPU système** : Affichage plus clair (nombre de cœurs au lieu de "100%")
- **Load Average** : Explication de ce que le chiffre signifie (ex: 0.37 = 2.3% de charge)
- **Explications** : Section ajoutée sous le tableau pour comprendre chaque métrique

### Calculs Robustes
- Validation des valeurs numériques avant tous les calculs
- Gestion d'erreurs pour `bc` et `printf`
- Valeurs par défaut (0) si données manquantes
- Plus d'erreurs de caractères illégaux (émojis filtrés)

### Métriques Disque
- Fallback automatique sur `df` si l'API retourne `null`
- Affiche les vraies valeurs du système

### Statuts Services
- Explication inline des statuts "degraded"
- `degraded` = lent (50-100ms) mais OK, pas cassé

---

## 📦 Installation (optionnelle)

Pour les métriques I/O disque :

```bash
# Manjaro/Arch
sudo pacman -S sysstat

# Ubuntu/Debian  
sudo apt install sysstat
```

Le script fonctionne **sans** sysstat, mais avec moins de détails I/O.

---

**Version :** 3.2  
**Date :** 2025-11-03  
**Status :** ✅ Production Ready

### Changelog v3.2
- ✅ Correction des erreurs "illegal character" dans l'analyse temporelle
- ✅ Correction du tableau de comparaison (mémoire système, CPU, load average)
- ✅ Ajout d'explications claires sous le tableau de comparaison
- ✅ Validation robuste de toutes les valeurs numériques avant calculs
- ✅ Récupération correcte de la mémoire système utilisée (avec fallback via `free`)
- ✅ **Section "Tous les processus Docker"** améliorée :
  - Affichage du pourcentage de mémoire pour chaque service
  - Résumé total : mémoire allouée, mémoire utilisée, pourcentage global
  - Calcul automatique de la mémoire totale consommée par tous les services
- ✅ **Uptime converti en format lisible** :
  - Affichage intelligent : années, mois, semaines, jours, heures, minutes
  - Exemple : "5 jours, 12h, 20min" au lieu de "8197.99s" ou "341h"
  - Appliqué partout : service métriques, système, uptime global

