# 📊 Guide du Système de Monitoring JobbingTrack

## 🎯 Problème Résolu : CPU > 100% ?

### ❓ Pourquoi Docker affiche un CPU > 100% ?

**C'est NORMAL !** Docker calcule l'utilisation CPU différemment du système :

```
Docker : 1 cœur CPU = 100%
```

#### Exemple avec 16 cœurs :

- **Docker affiche : 254.96%**
  - Signifie : 2.55 cœurs CPU utilisés
  - Capacité max : 16 × 100% = 1600%
  - **% réel du système : 254.96 ÷ 1600 = 15.94%**

#### Autre exemple :

- **Docker affiche : 205%**
  - Signifie : 2.05 cœurs CPU utilisés
  - **% réel du système : 205 ÷ 1600 = 12.8%**

### ✅ Comment lire les métriques CPU ?

Le script amélioré affiche maintenant :

```
═══════════════════════════════════════════════════════════
🔥 EXPLICATION CPU - Conteneurs JobbingTrack
═══════════════════════════════════════════════════════════

   📊 CPU Docker:        254.96%
   💡 Pourquoi >100% ?   Docker calcule: 1 cœur = 100%
                         Donc 200% = 2 cœurs utilisés

   🖥️  Votre système:     16 cœurs CPU disponibles
   📈 Capacité max:      1600% (16 × 100%)

   ✅ UTILISATION RÉELLE:
   • Cœurs utilisés:     2.55 / 16 cœurs
   • % du système:       15.94%

   📊 [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 15.94%
═══════════════════════════════════════════════════════════
```

---

## 🚀 Script de Monitoring

### Script Unifié (monitoring.sh)

```bash
./monitoring.sh
```

**Durée :** ~40 secondes

**Affiche :**
- ✅ 13 tests complets incluant :
  - Historique des métriques
  - Monitoring temporel (3 collectes espacées)
  - Métriques disque I/O
  - TOP 5 services par CPU/Mémoire/Réseau
  - Statistiques système avancées
  - Espace disque Docker
  - Connexions réseau TCP
  - Swap, processus, threads
  - Logs Docker récents
  - Et plus encore...

**Utilisation :** Vérification quotidienne ou hebdomadaire complète

---

## 📊 Améliorations Apportées

### 1. ✅ Correction des erreurs `printf`

**Solution appliquée :**
- ✅ Ajout de `export LC_NUMERIC=C` et `export LC_ALL=C`
- ✅ Plus d'erreurs de formatage
- ✅ Nombres affichés correctement dans `monitoring.sh`

### 2. ✅ Explication CPU claire

**Avant :**
```
CPU total utilisé: 254.96
```
❌ Confus : Pourquoi >100% ?

**Après :**
```
═══════════════════════════════════════════════════════════
🔥 EXPLICATION CPU - Conteneurs JobbingTrack
═══════════════════════════════════════════════════════════

   📊 CPU Docker:        254.96%
   💡 Pourquoi >100% ?   Docker calcule: 1 cœur = 100%
                         Donc 200% = 2 cœurs utilisés

   🖥️  Votre système:     16 cœurs CPU disponibles
   📈 Capacité max:      1600% (16 × 100%)

   ✅ UTILISATION RÉELLE:
   • Cœurs utilisés:     2.55 / 16 cœurs
   • % du système:       15.94%

   📊 [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 15.94%
═══════════════════════════════════════════════════════════
```
✅ Clair et visuel !

### 3. ✅ Tableau de comparaison hôte vs conteneurs

**Nouveau :**
```
╔════════════════════════════════════════════════════════════════╗
║         COMPARAISON HÔTE vs CONTENEURS JOBBINGTRACK           ║
╠════════════════════════════════════════════════════════════════╣
║ Métrique                       ║ Conteneurs      ║ Système Hôte   ║
╠════════════════════════════════════════════════════════════════╣
║ CPU utilisé                    ║ 15.94%          ║ 16 cœurs       ║
║ Mémoire utilisée               ║ 33.54%          ║ 7.55 GB        ║
║ Conteneurs JobbingTrack        ║ 19              ║ N/A            ║
║ Load Average                   ║ N/A             ║ 2.55           ║
╚════════════════════════════════════════════════════════════════╝

🔍 ANALYSE DÉTAILLÉE:
   🔥 CPU:
      • Docker rapporte:  254.96%
      • Cœurs utilisés:   2.55 / 16 cœurs
      • % réel système:   15.94%
      ✅ Charge CPU normale

   ⚡ Load Average: 2.55
      • Recommandé: < 16 (nombre de cœurs)
      ✅ Load normal
```

### 4. ✅ Métriques disque I/O ajoutées

**Nouveau :**
```
💿 DISQUE I/O (lecture/écriture par seconde):
   📁 sda:
      • Lectures:  25.50 kB/s
      • Écritures: 1250.30 kB/s
      • Utilisation: 12.5%
```

### 5. ✅ Métriques système avancées

**Nouveau dans le test complet :**
```
📊 13. MÉTRIQUES DISQUE I/O ET SYSTÈME AVANCÉES

🔝 TOP 5 PROCESSUS DOCKER (par utilisation CPU):
   • jobbingtrack-metrics-aggregator    CPU: 73.6%, MEM: 654.4MB
   • jobbingtrack-frontend               CPU: 4.89%, MEM: 881.3MB
   ...

🐳 ESPACE DISQUE DOCKER:
   • Images        Count: 25    Size: 5.2GB      Reclaimable: 1.2GB
   • Containers    Count: 19    Size: 250MB      Reclaimable: 0B
   • Volumes       Count: 12    Size: 850MB      Reclaimable: 0B

🌐 STATISTIQUES RÉSEAU SYSTÈME:
   • Connexions établies:  145
   • Ports en écoute:      32
   • Connexions TIME-WAIT: 8

⚙️  LIMITES SYSTÈME:
   • File descriptors:
      Limite actuelle:     1048576
   • Processus totaux:     342
   • Threads totaux:       1256

💱 SWAP:
   • Total:      4.0Gi
   • Utilisé:    0B
   • Libre:      4.0Gi
   ✅ Swap non utilisé (optimal)

📝 LOGS DOCKER RÉCENTS (erreurs):
   ✅ Aucun conteneur arrêté récemment

⏱️  UPTIME SYSTÈME:
   up 2 days, 5 hours, 23 minutes
```

---

## 📈 Métriques Collectées

### CPU
- ✅ CPU Docker (%)
- ✅ CPU réel du système (%)
- ✅ Cœurs CPU utilisés / disponibles
- ✅ CPU par cœur (moyenne)
- ✅ Barre de progression visuelle
- ✅ TOP 5 services par CPU

### Mémoire
- ✅ Mémoire conteneurs (%, MB, GB)
- ✅ Mémoire système totale
- ✅ Mémoire libre/utilisée
- ✅ Swap (total, utilisé, libre)
- ✅ TOP 5 services par mémoire

### Disque
- ✅ Usage par partition (%, inodes)
- ✅ Disque I/O (lectures/écritures par seconde)
- ✅ Espace Docker (images, conteneurs, volumes)
- ✅ Espace récupérable

### Réseau
- ✅ Trafic RX/TX (global et par service)
- ✅ Connexions TCP (établies, écoute, TIME-WAIT)
- ✅ TOP 5 services par trafic réseau

### Performance
- ✅ Temps de réponse (moyen, min, max)
- ✅ Taux d'erreur (global et par service)
- ✅ Load average avec recommandations
- ✅ Charge globale (score 0-1)

### Santé
- ✅ Disponibilité (%) de tous les services
- ✅ Services sains/dégradés/offline
- ✅ Liste COMPLÈTE de tous les services (25)
- ✅ Métriques détaillées par service

### Système
- ✅ Processus et threads totaux
- ✅ File descriptors (limites)
- ✅ Uptime système
- ✅ Logs Docker récents
- ✅ TOP 5 processus Docker

### Temporel
- ✅ Historique des métriques
- ✅ 3 collectes espacées de 15 secondes
- ✅ Calcul des moyennes et variations
- ✅ Détection des tendances (hausse/baisse/stable)
- ✅ Vérification de la cohérence

---

## 💡 Recommandations

### Comprendre le Load Average

```
Load Average = nombre de processus en attente CPU
```

**Règle :**
- **Load < nombre de cœurs** = ✅ OK
- **Load ≈ nombre de cœurs** = ⚠️ Système chargé mais OK
- **Load > nombre de cœurs** = ❌ Système surchargé

**Exemple :**
- Système avec **16 cœurs**
- Load Average = **2.55** → ✅ OK (2.55 < 16)
- Load Average = **18.5** → ❌ Surchargé (18.5 > 16)

### Interpréter le Swap

```
💱 SWAP:
   • Utilisé:    0B
   ✅ Swap non utilisé (optimal)
```

- **Swap = 0** → ✅ RAM suffisante
- **Swap > 0** → ⚠️ Manque de RAM (peut ralentir le système)

**Solution si swap utilisé :**
1. Augmenter la RAM
2. Optimiser les services gourmands
3. Réduire le nombre de services actifs

### Nettoyer Docker

Si l'espace disque Docker est élevé :

```bash
# Voir l'espace utilisé
docker system df

# Nettoyer (ATTENTION : supprime images non utilisées)
docker system prune -a --volumes

# Nettoyer seulement les conteneurs arrêtés
docker container prune

# Nettoyer seulement les images non utilisées
docker image prune -a

# Nettoyer seulement les volumes non utilisés
docker volume prune
```

### Surveiller régulièrement

**Option 1 : Cron job (tous les 15 min)**
```bash
# Éditer le crontab
crontab -e

# Ajouter :
*/15 * * * * /chemin/vers/test-monitoring-quick.sh >> /var/log/monitoring.log 2>&1
```

**Option 2 : Script watch (toutes les 30s)**
```bash
watch -n 30 ./monitoring.sh
```

**Option 3 : Tmux/Screen**
```bash
# Dans un terminal dédié
while true; do
    clear
    ./monitoring.sh
    sleep 30
done
```

---

## 🔗 URLs de l'API

### Métriques agrégées
```
GET http://localhost:8014/api/v1/docker/jobbingtrack/aggregated
```

**Retourne :**
- CPU total (%, par cœur)
- Mémoire (%, MB, GB)
- Réseau (RX/TX)
- Santé des services
- Charge globale
- Et plus...

### Liste des services
```
GET http://localhost:8014/api/v1/docker/services/all
```

**Retourne :**
- Liste COMPLÈTE des 25 services
- Métriques par service
- Status (running/stopped)

### Historique
```
GET http://localhost:8014/api/v1/docker/history?limit=10
```

**Retourne :**
- Historique des métriques
- Évolution dans le temps

### Health check
```
GET http://localhost:8014/api/v1/health
```

**Retourne :**
- Status du service
- Uptime

### Métriques système
```
GET http://localhost:8014/api/v1/metrics
```

**Retourne :**
- Infos CPU (modèle, cœurs)
- Mémoire système
- Disques
- Uptime

---

## 🐛 Troubleshooting

### Erreur : `printf: nombre non valable`

**Solution :** ✅ Déjà corrigé dans le script amélioré

Le script utilise maintenant :
```bash
export LC_NUMERIC=C
export LC_ALL=C
```

### Métriques disque "null"

**Symptôme :**
```
💿 DISQUES:
✅ 1 partition(s) détectée(s)
   📁 null:
      Total: null GB | Utilisé: null GB (5%)
      Libre: null GB | Inodes: N/A/N/A
```

**Cause :** L'API `metrics-aggregator` retourne des valeurs null pour les partitions disque

**Solution :** ✅ **Corrigé !** Le script utilise maintenant un fallback automatique :

Quand l'API retourne `null`, le script utilise directement `df` pour récupérer les vraies données :

```
⚠️  Données disque API non disponibles, utilisation de df

💿 / (/dev/sda1):
   - Total: 100G
   - Utilisé: 45G (45%)
   - Disponible: 55G

💿 /home (/dev/sda2):
   - Total: 500G
   - Utilisé: 250G (50%)
   - Disponible: 250G
```

**Pourquoi l'API retourne null ?**
- Docker Desktop sous Linux peut avoir des problèmes pour récupérer les infos disque
- Le conteneur n'a peut-être pas accès aux métriques système de l'hôte

**C'est grave ?** Non, le fallback `df` donne les vraies valeurs du système

### `iostat` non disponible

**Message :**
```
⚠️  iostat non disponible (installez sysstat)
```

**Solution :**
```bash
# Manjaro/Arch
sudo pacman -S sysstat

# Ubuntu/Debian
sudo apt install sysstat

# Activer la collecte
sudo systemctl enable sysstat
sudo systemctl start sysstat
```

### Services "degraded"

**Qu'est-ce qu'un service "degraded" ?**

Un service est considéré "dégradé" si son **temps de réponse est entre 50ms et 100ms**.

```
Statuts des services :
• ✅ healthy (sain):      Temps réponse < 50ms
• ⚠️  degraded (dégradé): Temps réponse 50-100ms (lent mais OK)
• ❌ offline:            Service arrêté ou erreur
```

**C'est grave ?**

**Non !** Un service dégradé fonctionne toujours, il est juste un peu lent. C'est **normal** pour certains services qui font des opérations complexes.

**Quand s'inquiéter ?**
- Si **TOUS** les services sont dégradés
- Si un service est **toujours** dégradé (vérifier sur plusieurs jours)
- Si le temps de réponse dépasse **100ms** (devient offline)

**Solutions si problématique :**
1. Vérifier la charge CPU/mémoire globale
2. Vérifier les logs : `docker logs [service-name]`
3. Optimiser les requêtes de base de données
4. Augmenter les ressources si nécessaire
5. Redémarrer le service : `docker restart [service-name]`

**Exemple normal :**
```
💚 SANTÉ DES SERVICES:
   • Disponibilité: 26.32%
   • Sains: 5 | Dégradés: 14 | Offline: 0
   
   💡 Statuts Expliqués:
      • Sain (healthy):    Temps réponse < 50ms
      • Dégradé (degraded): Temps réponse 50-100ms (lent mais OK)
      • Offline:           Service arrêté ou erreur
   
   → 14 services dégradés = temps de réponse lents
     Pas critique, mais à surveiller
```

**Frontend souvent dégradé ?** C'est normal, il fait du rendering et c'est plus lent qu'une API simple.

---

## 📝 Exemples d'Utilisation

### 1. Vérification rapide quotidienne

```bash
./monitoring.sh
```

**Résultat en 5 secondes :**
- État général du système ✅/⚠️/❌
- CPU réel du système
- Services dégradés à surveiller

### 2. Audit complet hebdomadaire

```bash
./monitoring.sh > rapport-$(date +%Y%m%d).log
```

**Génère un rapport complet sauvegardé**

### 3. Surveillance en temps réel

```bash
watch -n 30 -c './monitoring.sh'
```

**Rafraîchit toutes les 30 secondes avec couleurs**

### 4. Alertes par email (cron)

```bash
#!/bin/bash
OUTPUT=$(./monitoring.sh)

# Si charge CPU > 80%
if echo "$OUTPUT" | grep -q "Charge CPU élevée"; then
    echo "$OUTPUT" | mail -s "Alerte CPU JobbingTrack" redacted@example.invalid
fi
```

---

## 🎓 Comprendre les Métriques

### CPU Docker vs CPU Système

| Docker | Cœurs | % Système (16 cœurs) |
|--------|-------|----------------------|
| 100%   | 1.0   | 6.25%                |
| 200%   | 2.0   | 12.5%                |
| 400%   | 4.0   | 25%                  |
| 800%   | 8.0   | 50%                  |
| 1600%  | 16.0  | 100%                 |

### Niveaux de Charge

| Métrique | Normal | Modéré | Élevé |
|----------|--------|--------|-------|
| CPU      | < 50%  | 50-80% | > 80% |
| Mémoire  | < 70%  | 70-85% | > 85% |
| Load     | < cores| ≈ cores| > cores|
| Swap     | 0      | < 500MB| > 500MB|

---

## ✅ Checklist de Maintenance

### Quotidienne
- [ ] Exécuter `test-monitoring-quick.sh`
- [ ] Vérifier les services dégradés
- [ ] Surveiller le CPU réel (doit être < 50%)
- [ ] Vérifier que swap = 0

### Hebdomadaire
- [ ] Exécuter `test-monitoring-complete.sh`
- [ ] Analyser les tendances (historique)
- [ ] Nettoyer Docker si espace > 80%
- [ ] Vérifier les logs pour erreurs

### Mensuelle
- [ ] Analyser les rapports complets
- [ ] Optimiser les services gourmands
- [ ] Mettre à jour les services si nécessaire
- [ ] Vérifier les limites système

---

## 📚 Ressources

### Documentation Docker
- [Docker Stats](https://docs.docker.com/engine/reference/commandline/stats/)
- [Understanding CPU usage](https://www.datadoghq.com/blog/docker-monitoring/)

### Outils de monitoring
- Grafana : Visualisation avancée
- Prometheus : Métriques time-series
- cAdvisor : Monitoring conteneurs
- Loki : Logs centralisés

---

**Créé le :** 2025-11-03  
**Version :** 2.0 (Améliorée avec explications CPU)  
**Auteur :** Script de monitoring JobbingTrack

