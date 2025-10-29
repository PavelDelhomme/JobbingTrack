# 🔧 Guide Administration - JobbingTrack

[← Retour à la documentation](../README.md) | [← README principal](../../README.md) | [🧭 Navigation](../navigation.md)

Guide d'administration et dashboard pour JobbingTrack v4.1.

## 🎯 Vue d'ensemble

Interface d'administration complète pour la gestion, la surveillance et la maintenance du système JobbingTrack.

## 📊 Dashboard Administrateur

### Accès au Dashboard
- **URL**: http://localhost:8080/backoffice
- **Authentification**: Compte administrateur requis
- **Rôles**: `admin`, `super_admin`

### Fonctionnalités principales

#### 1. Vue d'ensemble système
- **Métriques temps réel**: CPU, mémoire, réseau
- **État des services**: Tous les microservices
- **Statistiques**: Utilisateurs actifs, candidatures, notifications
- **Alertes**: Problèmes système et avertissements

#### 2. Gestion des utilisateurs
- **Liste des utilisateurs**: Recherche, filtres, pagination
- **Création/modification**: Comptes utilisateurs
- **Gestion des rôles**: user, admin, super_admin
- **Permissions**: Contrôle d'accès fin
- **Activation/désactivation**: Comptes utilisateurs

#### 3. Gestion des services
- **État des microservices**: Health checks
- **Démarrage/arrêt**: Contrôle des services
- **Logs**: Consultation en temps réel
- **Redémarrage**: Services individuels ou groupés

#### 4. Monitoring et métriques
- **Graphiques temps réel**: Performances système
- **Métriques conteneurs**: Docker
- **Utilisation ressources**: Par service
- **Historique**: Métriques sur 90 jours

#### 5. Base de données
- **État de la BDD**: Connexions, taille, performances
- **Migrations**: Historique et statut
- **Backups**: Gestion des sauvegardes
- **Maintenance**: Optimisation, vacuum

#### 6. Configuration système
- **Variables d'environnement**: Consultation et modification
- **Paramètres globaux**: Configuration application
- **Thèmes**: Interface utilisateur
- **Notifications**: Configuration alertes

## 🔐 Gestion des utilisateurs

### Créer un administrateur

```bash
# Via CLI (depuis la racine du projet)
npm run admin:create --email=redacted@example.invalid --password=SecurePass123!

# Ou via script
docker exec jobbingtrack-auth-service node scripts/create-admin.js
```

### Rôles et permissions

| Rôle | Permissions | Description |
|------|-------------|-------------|
| **user** | read, write_own | Utilisateur standard |
| **admin** | read, write, delete, manage_users | Administrateur |
| **super_admin** | all | Super administrateur |

### Gestion des permissions

```javascript
// Exemple de vérification permissions
const hasPermission = (user, permission) => {
  return user.roles.some(role => 
    role.permissions.includes(permission)
  );
};
```

## 📊 Surveillance système

### Métriques clés à surveiller

#### Performances
- **CPU**: < 80% en moyenne
- **Mémoire**: < 85% utilisée
- **Disque**: > 20% disponible
- **Réseau**: Latence < 100ms

#### Services
- **Uptime**: > 99.9%
- **Temps de réponse**: < 200ms (p95)
- **Taux d'erreur**: < 0.1%
- **Connexions actives**: Monitoring

#### Base de données
- **Connexions**: < 80% du max
- **Requêtes lentes**: Identifier et optimiser
- **Taille**: Croissance normale
- **Réplication**: État synchronisation

### Alertes configurées

```yaml
# Alertes critiques
- Service Down (> 1min)
- CPU élevé (> 90% pendant 5min)
- Mémoire critique (> 95%)
- Disque plein (> 95%)
- Erreurs API (> 5% pendant 5min)
- BDD inaccessible

# Alertes warning
- CPU moyen (> 80% pendant 10min)
- Mémoire élevée (> 85%)
- Latence API (> 500ms p95)
- Connexions BDD élevées (> 80%)
```

## 🛠️ Maintenance

### Tâches de maintenance régulières

#### Quotidiennes
- ✅ Vérifier logs d'erreurs
- ✅ Consulter métriques système
- ✅ Vérifier état des backups
- ✅ Surveiller alertes

#### Hebdomadaires
- ✅ Analyser performances
- ✅ Vérifier espace disque
- ✅ Nettoyer logs anciens
- ✅ Mettre à jour documentation

#### Mensuelles
- ✅ Backup complet système
- ✅ Audit sécurité
- ✅ Optimisation BDD
- ✅ Mise à jour dépendances
- ✅ Revue des accès utilisateurs

### Scripts d'administration

```bash
# Depuis la racine du projet

# Backup base de données
make db-backup

# Restauration
make db-restore backup=chemin/vers/backup.sql

# Nettoyage logs
make logs-clean

# Optimisation BDD
make db-optimize

# Vérification santé système
make health

# Redémarrage services
make restart service=auth-service
```

## 📈 Rapports et analytics

### Génération de rapports

#### Dashboard Next.js
- **Statistiques**: Vue d'ensemble
- **Graphiques**: Évolution temporelle
- **Export**: PDF, CSV, Excel
- **Planification**: Rapports automatiques

#### Types de rapports disponibles
- **Utilisateurs**: Activité, inscriptions, connexions
- **Candidatures**: Créées, mises à jour, statuts
- **Performances**: Temps de réponse, erreurs
- **Système**: Ressources, uptime, incidents

### Commandes analytics

```bash
# Statistiques utilisateurs
npm run stats:users --period=30d

# Rapport candidatures
npm run stats:applications --format=csv --output=rapport.csv

# Analyse performances
npm run stats:performance --services=all
```

## 🔒 Sécurité administration

### Bonnes pratiques

✅ **Authentification forte**
- MFA activé pour admins
- Rotation mots de passe (90 jours)
- Politique mots de passe complexes

✅ **Audit logging**
- Toutes actions admin loggées
- Rétention logs 1 an
- Alertes sur actions sensibles

✅ **Accès restreint**
- IP whitelisting
- VPN pour accès distant
- Sessions limitées (1h)

✅ **Mises à jour**
- Dépendances à jour
- Patches sécurité appliqués
- Scan vulnérabilités régulier

### Configuration sécurité

```yaml
# config/admin-security.yml
security:
  session:
    duration: 3600  # 1 heure
    refresh: true
    secure: true
  
  mfa:
    enabled: true
    methods: [totp, sms, email]
  
  audit:
    enabled: true
    retention_days: 365
    sensitive_actions: 
      - user_create
      - user_delete
      - role_change
      - config_update
```

## 🐛 Dépannage administration

### Problèmes courants

**Dashboard inaccessible**
```bash
# Vérifier service frontend
make health-frontend

# Consulter logs
docker logs jobbingtrack-frontend

# Redémarrer
make restart-frontend
```

**Métriques non affichées**
```bash
# Vérifier metrics aggregator
curl http://localhost:3014/api/v1/health

# Consulter logs
docker logs jobbingtrack-metrics-aggregator

# Redémarrer
docker-compose restart jobbingtrack-metrics-aggregator
```

**Erreurs authentification admin**
```bash
# Réinitialiser mot de passe admin
npm run admin:reset-password --email=redacted@example.invalid

# Vérifier auth service
make health-auth
```

## 📚 Ressources

- **[Monitoring](../monitoring/README.md)** - Système de surveillance complet
- **[Sécurité](../deployment/security/README.md)** - Configuration sécurité
- **[Dépannage](../troubleshooting/README.md)** - Guide de résolution
- **[API Dashboard](../api/api-reference/README.md#dashboard)** - Endpoints dashboard
- **[Base de Données](../database/README.md)** - Gestion BDD

## 🔄 Mises à jour système

### Processus de mise à jour

1. **Sauvegarde complète**
   ```bash
   make backup-all
   ```

2. **Mise à jour code**
   ```bash
   git pull origin main
   npm install
   ```

3. **Migrations BDD**
   ```bash
   make db-migrate
   ```

4. **Rebuild services**
   ```bash
   make rebuild
   ```

5. **Tests post-déploiement**
   ```bash
   make test-integration
   make health
   ```

6. **Validation**
   - Vérifier dashboard
   - Tester fonctionnalités critiques
   - Consulter logs

---

**Version**: 4.1  
**Dernière mise à jour**: Octobre 2025
