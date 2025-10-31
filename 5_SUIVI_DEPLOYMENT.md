# 📊 Système de Suivi des Déploiements

## 🎯 Vue d'Ensemble

Système complet de suivi et monitoring des déploiements de la base de données JobbingTrack.

**Fonctionnalités** :
- ✅ Logging automatique de toutes les opérations
- ✅ Historique JSON des déploiements
- ✅ Rapports Markdown générés
- ✅ Dashboard interactif
- ✅ Export des logs
- ✅ Nettoyage automatique

---

## 🚀 Utilisation

### Dashboard Principal

```bash
# Afficher le dashboard
bash scripts/dashboard-deployment.sh

# Mode surveillance (rafraîchissement automatique)
bash scripts/dashboard-deployment.sh --watch
```

**Affiche** :
- 📈 Statistiques globales (total, réussis, échoués)
- 🔄 Dernier déploiement
- 📜 Historique des 5 derniers
- 🔧 État actuel du système
- 📁 Fichiers disponibles
- ⚡ Actions rapides

---

## 📝 Commandes de Suivi

### Historique

```bash
# Voir l'historique complet
bash scripts/track-deployment.sh history
```

### Nettoyage

```bash
# Nettoyer les logs de plus de 30 jours
bash scripts/track-deployment.sh cleanup

# Nettoyer les logs de plus de 7 jours
bash scripts/track-deployment.sh cleanup 7
```

### Export

```bash
# Exporter tous les logs
bash scripts/track-deployment.sh export

# Exporter vers un dossier spécifique
bash scripts/track-deployment.sh export /path/to/export
```

### Rapport

```bash
# Voir un rapport spécifique
bash scripts/track-deployment.sh report 20251031_010830
```

---

## 📁 Structure des Logs

```
logs/
└── deployment/
    ├── deployment_20251031_010830.log      # Log détaillé
    ├── report_20251031_010830.md           # Rapport Markdown
    ├── last_deployment.json                # Dernier déploiement (JSON)
    └── deployment_history.json             # Historique complet
```

---

## 📊 Format des Logs

### Log Fichier (`.log`)

```
[2025-10-31 01:08:30] [INFO] Initialisation du suivi de déploiement
[2025-10-31 01:08:30] [INFO] Fichier de log: logs/deployment/deployment_20251031_010830.log
[2025-10-31 01:08:31] [INFO] Branche Git: tech/monitoring-system (abc1234)
[2025-10-31 01:08:31] [INFO] Docker: 24.0.0 (12 conteneurs actifs)
[2025-10-31 01:08:31] [INFO] PostgreSQL: running (19 tables)
[2025-10-31 01:08:32] [INFO] ═══════════════════════════════════════
[2025-10-31 01:08:32] [INFO] DÉBUT DÉPLOIEMENT: automated_deployment
[2025-10-31 01:08:32] [INFO] ═══════════════════════════════════════
[2025-10-31 01:08:33] [INFO] ─────────────────────────────────────
[2025-10-31 01:08:33] [INFO] ÉTAPE 1/5: Migrations Prisma
[2025-10-31 01:08:33] [INFO] ─────────────────────────────────────
[2025-10-31 01:10:15] [SUCCESS] Étape terminée: Migrations appliquées (102s)
...
[2025-10-31 01:18:45] [INFO] ═══════════════════════════════════════
[2025-10-31 01:18:45] [INFO] FIN DÉPLOIEMENT
[2025-10-31 01:18:45] [INFO] ═══════════════════════════════════════
[2025-10-31 01:18:45] [INFO] Status: SUCCESS
[2025-10-31 01:18:45] [INFO] Durée: 615s
[2025-10-31 01:18:45] [SUCCESS] Enregistrement dans l'historique
```

### Rapport Markdown (`.md`)

```markdown
# 📊 Rapport de Déploiement

**ID**: deploy_20251031_010830  
**Date**: Thu Oct 31 01:08:30 CET 2025  
**Type**: automated_deployment  
**Durée**: 615s  
**Status**: SUCCESS  

---

## 🔧 Informations Système

- **Système**: Linux
- **Hostname**: dev-machine
- **Utilisateur**: developer

## 🐳 Docker

- **Version**: 24.0.0
- **Conteneurs actifs**: 12

## 📂 Git

- **Branche**: tech/monitoring-system
- **Commit**: abc1234
- **Fichiers modifiés**: 3

## 🗄️ Base de Données

- **Status PostgreSQL**: running
- **Tables créées**: 19

---

## 📝 Logs Complets

Voir: `logs/deployment/deployment_20251031_010830.log`
```

### JSON Historique

```json
{
  "id": "deploy_20251031_010830",
  "timestamp": "20251031_010830",
  "date": "2025-10-31T01:08:30+01:00",
  "type": "automated_deployment",
  "status": "SUCCESS",
  "duration": 615,
  "message": "Déploiement terminé",
  "git": {
    "branch": "tech/monitoring-system",
    "commit": "abc1234",
    "modified_files": 3
  },
  "docker": {
    "version": "24.0.0",
    "containers": 12
  },
  "database": {
    "status": "running",
    "tables": 19
  },
  "user": "developer",
  "hostname": "dev-machine",
  "log_file": "logs/deployment/deployment_20251031_010830.log"
}
```

---

## 🔧 Intégration dans les Scripts

### Script de Déploiement

Le système de suivi est automatiquement intégré dans `deploy-new-database-architecture.sh` :

```bash
# Début (automatique)
bash scripts/track-deployment.sh track "automated_deployment"

# Pendant (optionnel)
bash scripts/track-deployment.sh step "Migrations Prisma" 1 5
# ... exécution ...
bash scripts/track-deployment.sh step-end "SUCCESS" "Migrations appliquées"

# Tests (optionnel)
bash scripts/track-deployment.sh test "PostgreSQL accessible" "PASS"

# Fin (automatique)
bash scripts/track-deployment.sh end "SUCCESS" "Déploiement terminé"
```

### Utilisation Manuelle

```bash
# Démarrer le suivi
bash scripts/track-deployment.sh track "manual_deployment"

# Enregistrer une étape
bash scripts/track-deployment.sh step "Migration DB" 1 3

# Terminer une étape
bash scripts/track-deployment.sh step-end "SUCCESS" "Migration terminée"

# Enregistrer un test
bash scripts/track-deployment.sh test "Test connexion" "PASS"

# Terminer le suivi
bash scripts/track-deployment.sh end "SUCCESS" "Tout OK"
```

---

## 📈 Statistiques et Métriques

### Taux de Réussite

Le dashboard calcule automatiquement :
- **Total déploiements**
- **Déploiements réussis**
- **Déploiements échoués**
- **Taux de réussite** (%)

### Durée Moyenne

Chaque déploiement enregistre sa durée en secondes.

### Tendances

L'historique permet d'analyser :
- Évolution du taux de réussite
- Durée moyenne des déploiements
- Fréquence des déploiements

---

## 🛠️ Maintenance

### Nettoyage Automatique

Par défaut, les logs de plus de 30 jours sont conservés.

**Configurer la rétention** :

```bash
# Dans vos scripts
bash scripts/track-deployment.sh cleanup 14  # 14 jours
```

**Taille des logs** :

Chaque déploiement génère environ :
- 50-200 KB pour le log `.log`
- 1-5 KB pour le rapport `.md`
- 1-2 KB pour le JSON

**Estimation** : ~1 MB pour 20 déploiements

### Archivage

**Export périodique** :

```bash
# Exporter avant nettoyage
bash scripts/track-deployment.sh export ./archives/deployment_$(date +%Y%m)

# Puis nettoyer
bash scripts/track-deployment.sh cleanup 7
```

---

## 🔍 Analyse des Logs

### Recherche

```bash
# Trouver tous les déploiements échoués
grep -l "\[ERROR\]" logs/deployment/deployment_*.log

# Trouver les déploiements d'une date
ls logs/deployment/deployment_20251031_*.log

# Rechercher un message spécifique
grep "Migration failed" logs/deployment/*.log
```

### Extraction de Données

```bash
# Lister tous les statuts
grep "Status:" logs/deployment/report_*.md

# Lister toutes les durées
grep "Durée:" logs/deployment/report_*.md | awk '{print $3}'
```

---

## 📊 Dashboard Avancé

### Mode Surveillance

```bash
# Rafraîchissement automatique toutes les 30s
bash scripts/dashboard-deployment.sh --watch
```

**Idéal pour** :
- Surveillance en temps réel pendant un déploiement
- Monitoring continu
- Affichage sur écran secondaire

### Personnalisation

Modifiez `scripts/dashboard-deployment.sh` pour :
- Changer les couleurs
- Ajouter des métriques
- Modifier le délai de rafraîchissement
- Ajouter des alertes

---

## 🎯 Cas d'Usage

### 1. Déploiement avec Suivi

```bash
# Le suivi est automatique
bash scripts/deploy-new-database-architecture.sh
```

### 2. Monitoring Post-Déploiement

```bash
# Afficher le dashboard
bash scripts/dashboard-deployment.sh

# Voir le dernier log
tail -f logs/deployment/deployment_$(ls -t logs/deployment/deployment_*.log | head -1 | xargs basename | sed 's/deployment_//' | sed 's/.log//')).log
```

### 3. Analyse d'Échec

```bash
# Trouver le dernier déploiement échoué
FAILED_LOG=$(grep -L "\[SUCCESS\]" logs/deployment/deployment_*.log | tail -1)

# Voir le log complet
less "$FAILED_LOG"

# Voir le rapport
cat "$(echo $FAILED_LOG | sed 's/deployment_/report_/' | sed 's/.log/.md/')"
```

### 4. Rapport Mensuel

```bash
# Exporter tous les logs du mois
bash scripts/track-deployment.sh export ./reports/october_2025

# Analyser
cd ./reports/october_2025
grep "Status: SUCCESS" report_*.md | wc -l  # Nombre de réussites
grep "Durée:" report_*.md | awk '{sum+=$3; count++} END {print sum/count "s"}'  # Durée moyenne
```

---

## 🔗 Intégration CI/CD

### GitHub Actions

```yaml
- name: Deploy with tracking
  run: bash scripts/deploy-new-database-architecture.sh

- name: Upload logs
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: deployment-logs
    path: logs/deployment/
```

### Notifications

Ajoutez dans vos scripts :

```bash
# À la fin du déploiement
if [ "$STATUS" = "SUCCESS" ]; then
    # Notifier succès (Slack, email, etc.)
    curl -X POST https://hooks.slack.com/... -d "Déploiement réussi"
else
    # Notifier échec
    curl -X POST https://hooks.slack.com/... -d "Déploiement échoué: $(cat logs/deployment/last_deployment.json)"
fi
```

---

## 📚 Ressources

- **Scripts** : `scripts/track-deployment.sh`, `scripts/dashboard-deployment.sh`
- **Logs** : `logs/deployment/`
- **Documentation** : Ce fichier

---

## 💡 Bonnes Pratiques

1. **Consultez toujours le dashboard avant un nouveau déploiement**
2. **Exportez régulièrement les logs pour archivage**
3. **Analysez les échecs pour améliorer le processus**
4. **Nettoyez les anciens logs régulièrement**
5. **Utilisez le mode surveillance pendant les déploiements critiques**

---

## 🆘 Support

En cas de problème avec le système de suivi :

1. Vérifier que le dossier `logs/deployment/` existe
2. Vérifier les permissions d'écriture
3. Consulter les logs système si erreur

**Réinitialiser** :
```bash
rm -rf logs/deployment/
mkdir -p logs/deployment/
```

---

**Dernière mise à jour** : 31 Octobre 2025  
**Version** : 1.0
