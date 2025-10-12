# 🚀 Guide de Développement JobbingTrack

## 📋 Table des matières

1. [Génération de données de test](#génération-de-données-de-test)
2. [Gestion de la corbeille](#gestion-de-la-corbeille)
3. [Gestion des archives](#gestion-des-archives)
4. [Émulateur mobile](#émulateur-mobile)
5. [Logs et monitoring](#logs-et-monitoring)

---

## 🎲 Génération de données de test

### Via l'interface web

1. Accédez au backoffice : http://localhost:8080/backoffice
2. Connectez-vous avec `admin@jobbingtrack.test` / `password123`
3. Allez dans **Développement** > **Données de Test**
4. Choisissez un preset ou personnalisez la configuration
5. Cliquez sur **Générer les données de test**

### Via la ligne de commande

```bash
cd backend

# Générer avec un preset
make seed-minimal      # Configuration minimale
make seed-standard     # Configuration standard (recommandé)
make seed-complete     # Beaucoup de données
make seed-demo         # Configuration pour démo

# Ou directement avec le script
./generate-test-data.sh standard

# Nettoyer toutes les données
make clean-data
```

### Configuration des presets

| Preset | Utilisateurs | Entreprises | Candidatures | Contacts | Entretiens | Relances | Appels |
|--------|--------------|-------------|--------------|----------|------------|----------|--------|
| **Minimal** | 2 | 5 | 5 | 5 | 2 | 3 | 2 |
| **Standard** | 3 | 10 | 20 | 15 | 8 | 12 | 10 |
| **Complet** | 5 | 20 | 50 | 40 | 20 | 30 | 25 |
| **Démo** | 1 | 8 | 15 | 12 | 6 | 8 | 5 |

### Comptes générés

Les comptes suivants sont créés avec le mot de passe `password123` :

- `user1@jobbingtrack.test` - **SUPER_ADMIN** (accès complet)
- `user2@jobbingtrack.test` - **ADMIN** (gestion administrative)
- `user3@jobbingtrack.test` - **USER** (utilisateur standard)

### Données générées

Le script génère automatiquement :

- ✅ **Utilisateurs** avec différents rôles
- ✅ **Entreprises** réalistes (Google, Microsoft, Amazon, etc.)
- ✅ **Candidatures** avec statuts variés
- ✅ **Contacts** liés aux entreprises
- ✅ **Entretiens** planifiés et passés
- ✅ **Relances** complétées et en attente
- ✅ **Appels** entrants et sortants
- ✅ **Liaisons** Application-Contact cohérentes
- ✅ **Activités** et historique complet
- ✅ **Éléments en corbeille** (soft delete)
- ✅ **Éléments archivés**

---

## 🗑️ Gestion de la corbeille

### Accès

Backoffice > **Nettoyage** > **Corbeille**

### Fonctionnalités

- **Visualiser** tous les éléments supprimés
- **Filtrer** par type d'entité
- **Rechercher** dans les éléments supprimés
- **Restaurer** un élément (si restaurable)
- **Supprimer définitivement** un élément
- **Vider la corbeille** (supprime les éléments > 30 jours)

### API Endpoints

```bash
# Récupérer la corbeille
GET /api/v1/admin/trash?type=application

# Restaurer un élément
POST /api/v1/admin/trash/application/:id/restore

# Supprimer définitivement
DELETE /api/v1/admin/trash/application/:id/permanent

# Vider la corbeille
POST /api/v1/admin/trash/empty
```

### Logique de suppression

1. **Soft Delete** : `deletedAt = now()`
   - L'élément reste en base mais est caché
   - Peut être restauré facilement

2. **Restauration** : `deletedAt = null`
   - L'élément redevient actif

3. **Suppression définitive** : `DELETE FROM table`
   - CASCADE automatique vers les entités liées
   - **IRRÉVERSIBLE**

4. **Auto-nettoyage** : Après 30 jours
   - Les éléments en corbeille > 30 jours sont supprimés définitivement

---

## 📦 Gestion des archives

### Accès

Backoffice > **Nettoyage** > **Archives**

### Fonctionnalités

- **Visualiser** tous les éléments archivés
- **Filtrer** par type d'entité
- **Rechercher** dans les archives
- **Désarchiver** un élément pour le rendre actif

### API Endpoints

```bash
# Récupérer les archives
GET /api/v1/admin/archive?type=application

# Archiver un élément
POST /api/v1/admin/archive/application/:id

# Désarchiver un élément
POST /api/v1/admin/archive/application/:id/unarchive
```

### Différence Corbeille vs Archives

| | Corbeille | Archives |
|---|-----------|----------|
| **But** | Suppression temporaire | Conservation inactive |
| **Auto-suppression** | Oui (30 jours) | Non |
| **Restauration** | Possible si `canRestore=true` | Toujours possible |
| **Usage** | Éléments à supprimer | Historique à conserver |

---

## 📱 Émulateur mobile

### Accès

Backoffice > **Développement** > **Émulateur Mobile**

### Fonctionnalités

- **Appareils supportés**
  - iPhone 14 (390x844px)
  - iPhone 14 Pro Max (430x932px)
  - Google Pixel 7 (412x915px)
  - Samsung Galaxy S23 (360x780px)
  - iPad Pro 11" (834x1194px)

- **Options**
  - Rotation portrait/paysage
  - Zoom (50% à 150%)
  - Mode sombre
  - Cadre de device (on/off)
  - Simulation réseau (4G, 3G, hors ligne)

- **Navigation rapide**
  - Liens vers toutes les pages principales
  - Barre d'URL personnalisée
  - Rafraîchissement manuel

### Utilisation

1. Sélectionnez un appareil
2. Naviguez avec les liens rapides ou l'URL
3. Testez l'interface en conditions réelles
4. Ajustez le zoom si nécessaire
5. Testez en mode portrait et paysage

### Raccourcis clavier

- `R` : Rotation portrait/paysage
- `F` : Toggle cadre de device
- `D` : Toggle mode sombre

---

## 📋 Logs et monitoring

### Accès

Backoffice > **Administration** > **Logs & Activités**

### Fonctionnalités

- **Visualiser** les logs en temps réel
- **Filtrer** par service
- **Actualisation automatique** (toutes les 5s)
- **Télécharger** les logs
- **Coloration** selon le niveau (ERROR, WARN, INFO, SUCCESS)

### Services disponibles

- api-gateway
- auth-service
- application-service
- company-service
- contact-service
- interview-service
- notification-service
- dashboard-service
- call-service
- profile-service
- event-service
- followup-service
- workflow-service
- postgres
- redis

### Via ligne de commande

```bash
cd backend

# Voir les logs d'un service
make logs-auth-service
make logs-application-service

# Voir tous les logs
make logs

# En temps réel
docker compose logs -f auth-service
```

---

## 🔧 Commandes utiles

### Développement

```bash
# Démarrer tous les services
make up

# Voir le statut
make status

# Générer des données de test
make seed-standard

# Nettoyer les données
make clean-data

# Voir les logs
make logs

# Redémarrer un service
make restart-auth-service
```

### Tests

```bash
# Tester tous les services
./test-services.sh

# Tester un service spécifique
curl http://localhost:3001/health
```

### Base de données

```bash
# Migrations
make migrate

# Accéder à PostgreSQL
docker compose exec postgres psql -U jobbingtrack -d jobbingtrack

# Backup
docker compose exec postgres pg_dump -U jobbingtrack jobbingtrack > backup.sql

# Restore
docker compose exec -T postgres psql -U jobbingtrack -d jobbingtrack < backup.sql
```

---

## 🎯 Workflow de développement recommandé

### 1. Setup initial

```bash
cd backend
make up                    # Démarrer les services
make migrate               # Exécuter les migrations
make seed-standard         # Générer des données de test
```

### 2. Développement

```bash
# Terminal 1 : Logs
make logs

# Terminal 2 : Frontend
cd ../frontend
npm run dev

# Accéder au backoffice
# http://localhost:8080/backoffice
```

### 3. Tests

```bash
# Tester les services
./test-services.sh

# Tester une fonctionnalité spécifique
# Utiliser le Testeur API dans le backoffice
```

### 4. Nettoyage

```bash
# Nettoyer les données de test
make clean-data

# Regénérer avec un preset différent
make seed-demo
```

---

## 📚 Ressources

- **Documentation complète** : [README.md](README.md)
- **Architecture** : [architecture.md](architecture.md)
- **Logique de suppression** : [LOGIQUE-SUPPRESSION-CASCADE.md](LOGIQUE-SUPPRESSION-CASCADE.md)
- **Migration** : [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)

---

## 🆘 Dépannage

### Problème : "Cannot connect to database"

```bash
# Vérifier que PostgreSQL est démarré
docker compose ps postgres

# Redémarrer PostgreSQL
make restart-postgres
```

### Problème : "Service unavailable"

```bash
# Voir les logs du service
make logs-auth-service

# Redémarrer le service
make restart-auth-service
```

### Problème : "Données de test ne se génèrent pas"

```bash
# Vérifier la connexion
docker compose exec postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT COUNT(*) FROM \"User\";"

# Régénérer
make clean-data
make seed-standard
```

---

**Dernière mise à jour** : 2025-10-10  
**Version** : 2.0

