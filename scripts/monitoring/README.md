# 📊 Script de Monitoring JobbingTrack

Script complet de test et surveillance du système de monitoring pour JobbingTrack.

## 🎯 Vue d'ensemble

Le script `monitoring.sh` effectue une analyse complète de votre système JobbingTrack :
- 13 tests de métriques système et services
- Collectes temporelles pour analyse des tendances
- Comparaison hôte vs conteneurs
- Validation de la cohérence des données
- Métriques avancées (disque I/O, réseau, swap, etc.)

## 🚀 Utilisation Rapide

### Avec Make (recommandé)

```bash
# Monitoring complet (durée: ~60 secondes)
make mon

# Test rapide (sans collectes temporelles)
make mon-quick

# Sauvegarder les stats
make mon-save

# Surveillance continue (actualisation toutes les 60s)
make mon-watch

# Voir l'historique des logs
make mon-history

# Afficher le dernier log
make mon-last

# Nettoyer les anciens logs (garde les 30 derniers)
make mon-clean
```

### Direct (sans Make)

```bash
# Monitoring complet
./scripts/monitoring/monitoring.sh

# Test rapide
./scripts/monitoring/monitoring.sh quick

# Sauvegarder dans un fichier
./scripts/monitoring/monitoring.sh > monitoring-$(date +%Y%m%d-%H%M%S).log
```

## 📋 Tests Effectués

### 1. Health Check Service de Métriques
- Vérification de la disponibilité du service
- Uptime du service
- Status général

### 2. Métriques Docker Agrégées
- Nombre de conteneurs
- CPU (avec explication détaillée du calcul)
- Mémoire (%, MB, GB)
- Réseau (RX/TX)
- Temps de réponse
- Taux d'erreur
- Santé des services
- Score de charge global

### 3. Liste des Services
- Tous les services avec leurs métriques
- Status (running/stopped)
- CPU et mémoire par service
- Résumé total

### 4. Métriques Système Complètes
- CPU système (explication détaillée)
- Mémoire système
- Load Average
- Uptime
- Disques (partitions, usage, inodes)
- Réseau conteneurs

### 5. Métriques Disque Détaillées
- Usage par partition
- Espace disponible/utilisé
- Fallback sur `df` si API indisponible

### 6. Informations Docker
- Version Docker
- Système d'exploitation
- Architecture
- Nombre de conteneurs

### 7. Historique et Persistance
- Vérification de l'historique
- 5 dernières entrées
- Statistiques sur la période
- Validation de la persistance

### 8. Sessions Actives
- (Nécessite authentification JWT)

### 9. Performance Détaillée par Service
- Top 5 CPU
- Top 5 Mémoire
- Top 5 Trafic réseau
- Top 5 Temps de réponse
- Services avec erreurs
- Statistiques globales

### 10. Validation des Données
- Cohérence CPU
- Cohérence mémoire
- Cohérence nombre de services

### 11. Comparaison Hôte vs Conteneurs
- Tableau comparatif visuel
- CPU: conversion Docker → % réel système
- Analyse de charge
- Recommandations

### 12. Monitoring dans le Temps
- 5 collectes espacées de 10 secondes
- Calcul des moyennes
- Détection des variations
- Analyse des tendances
- Vérification de cohérence

### 13. Métriques Avancées
- Disque I/O (avec iostat)
- Top processus Docker par CPU
- Espace disque Docker
- Statistiques réseau système (connexions TCP)
- Limites système (file descriptors, processus, threads)
- Swap
- Logs Docker récents
- Conteneurs unhealthy
- Uptime système

## 🎨 Fonctionnalités

### Affichage Coloré
- ✅ Vert : Succès
- ❌ Rouge : Erreur
- ⚠️ Jaune : Avertissement
- 🔵 Bleu : Sections
- 🔷 Cyan : Explications détaillées

### Explications CPU Détaillées
Le script explique pourquoi Docker affiche des valeurs CPU > 100% :
- Docker calcule : 1 cœur = 100%
- Donc 205% = 2.05 cœurs utilisés
- Sur 16 cœurs : 205% ÷ 1600% = 12.8% réel
- Affichage d'une barre de progression visuelle

### Conversion Automatique
- Uptime en format lisible (jours, heures, minutes)
- Mémoire en MB/GB selon les besoins
- Réseau en MB
- Timestamps formatés

### Validation Robuste
- Vérification que toutes les valeurs sont numériques
- Gestion des valeurs manquantes (N/A)
- Fallbacks multiples pour chaque métrique
- Gestion d'erreurs complète

## 📊 Tableaux de Comparaison

Le script génère des tableaux visuels comparant :
- Conteneurs JobbingTrack vs Système Hôte
- CPU, Mémoire, Load Average
- Explications détaillées des différences

## 🔧 Prérequis

### Obligatoires
- `bash` (≥ 4.0)
- `curl`
- `jq` (JSON parser)
- `bc` (calculateur)
- `docker`

### Optionnels
- `iostat` (sysstat) - Pour les métriques I/O disque
- `ss` - Pour les stats réseau avancées

### Installation des prérequis

**Manjaro/Arch:**
```bash
sudo pacman -S jq bc sysstat
```

**Ubuntu/Debian:**
```bash
sudo apt install jq bc sysstat
```

## 📈 Sauvegarde des Stats

Les stats peuvent être sauvegardées automatiquement :

```bash
# Sauvegarder dans data/monitoring/history/
make mon-save

# Le fichier sera nommé: stats-YYYYMMDD-HHMMSS.log
```

Structure du dossier :
```
data/monitoring/history/
├── stats-20251103-141530.log
├── stats-20251103-143045.log
└── stats-20251103-145612.log
```

## 🔄 Surveillance Continue

Pour une surveillance en temps réel :

```bash
# Actualisation toutes les 60 secondes
make mon-watch

# Ctrl+C pour arrêter
```

Affiche :
- Horodatage de chaque collecte
- Toutes les métriques principales
- Mise à jour automatique

## 🌐 URLs du Système

Le script teste et affiche les URLs :

- **Frontend:** http://localhost:8080
- **API Gateway:** http://localhost:3000
- **Metrics Service:** http://localhost:8014
- **Prometheus:** http://localhost:9090
- **cAdvisor:** http://localhost:8082
- **Grafana:** http://localhost:3013
- **Loki:** http://localhost:3100

## 💡 Conseils et Recommandations

### Quand lancer le monitoring ?

1. **Après démarrage du système** - Vérifier que tout fonctionne
2. **Avant un déploiement** - Établir une baseline
3. **Après un déploiement** - Vérifier l'impact
4. **Lors de problèmes** - Diagnostiquer
5. **Régulièrement** - Surveillance continue

### Interprétation des Résultats

**CPU:**
- Docker > 100% est NORMAL (1 cœur = 100%)
- Regarder le % réel système (calculé automatiquement)
- < 50% = Normal
- 50-80% = Modéré
- > 80% = Élevé

**Mémoire:**
- < 70% = Normal
- 70-85% = À surveiller
- > 85% = Critique (risque swap)

**Load Average:**
- < nb_cœurs = Normal
- ≈ nb_cœurs = Chargé
- > nb_cœurs = Surchargé

**Swap:**
- 0 = Optimal
- > 0 = Manque de RAM

**Erreurs:**
- 0 = Optimal
- Quelques erreurs = Acceptable
- Beaucoup d'erreurs = Problème

### Automatisation avec Cron

Pour surveiller automatiquement :

```bash
# Éditer crontab
crontab -e

# Ajouter (toutes les heures)
0 * * * * cd /path/to/JobbingTrack && make mon-save

# Ajouter (toutes les 15 minutes)
*/15 * * * * cd /path/to/JobbingTrack && make mon-save
```

### Nettoyage

Le script ne génère pas de fichiers temporaires, mais les logs peuvent s'accumuler :

```bash
# Nettoyer les anciens logs (garde les 30 derniers)
make mon-clean

# Nettoyer tout
rm -rf data/monitoring/history/*.log
```

## 🐛 Dépannage

### Erreur "jq: command not found"
```bash
sudo pacman -S jq  # Manjaro/Arch
sudo apt install jq  # Ubuntu/Debian
```

### Erreur "bc: command not found"
```bash
sudo pacman -S bc  # Manjaro/Arch
sudo apt install bc  # Ubuntu/Debian
```

### "Impossible de joindre le service de métriques"
1. Vérifier que le système est démarré : `make status`
2. Vérifier que metrics-aggregator tourne : `docker ps | grep metrics`
3. Tester manuellement : `curl http://localhost:8014/api/v1/health`

### "iostat non disponible"
C'est optionnel, mais pour l'avoir :
```bash
sudo pacman -S sysstat  # Manjaro/Arch
sudo apt install sysstat  # Ubuntu/Debian
```

### Collectes temporelles trop longues
Utilisez le mode rapide :
```bash
make mon-quick
```

## 📚 Voir Aussi

- [Documentation Monitoring](../../docs/monitoring/)
- [Guide Administration](../../docs/administration/README.md)
- [Architecture Système](../../docs/architecture/)
- [Makefile Backend](../../makefiles/backend/Makefile)
- [Makefile Utils](../../makefiles/utils/Makefile)

## 🤝 Contribution

Pour améliorer le script :
1. Modifier `scripts/monitoring/monitoring.sh`
2. Tester avec `make mon`
3. Mettre à jour ce README si nécessaire

## 📝 Licence

Partie du projet JobbingTrack - Voir LICENSE à la racine du projet.

