# 📊 Data - Fichiers de Configuration et SQL

Fichiers de données, scripts SQL et configurations pour le développement et déploiement de JobbingTrack.

## 📁 Structure Organisée

```
data/
├── README.md                 # ← Documentation (ce fichier)
└── sql/                      # Scripts SQL et schémas
    ├── init-db.sql          # Initialisation base de données
    ├── seed-defaults.sql    # Données de démonstration
    └── migrations/          # Migrations Prisma
```

## 🎯 Utilisation

### Initialisation Base de Données
```bash
# Exécuter l'initialisation complète
psql -U jobbingtrack -d jobbingtrack -f data/sql/init-db.sql

# Ou avec Docker
docker exec -i jobbingtrack-db psql -U jobbingtrack -d jobbingtrack < data/sql/init-db.sql
```

### Peuplement avec Données de Test
```bash
# Ajouter les données de démonstration
psql -U jobbingtrack -d jobbingtrack -f data/sql/seed-defaults.sql
```

## 📋 Scripts SQL Disponibles

### `init-db.sql`
- **Création complète** des tables et relations
- **Configuration des utilisateurs** et permissions
- **Index optimisés** pour les performances
- **Contraintes d'intégrité** pour la cohérence des données

### `seed-defaults.sql`
- **Utilisateur administrateur** de démonstration
- **Données d'exemple** réalistes
- **Relations cohérentes** entre les entités
- **Configuration initiale** pour tests

## 🔧 Configuration

### Variables d'Environnement
```bash
# Base de données
DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack

# Utilisateur de démonstration
DEMO_USER_EMAIL=pavel@jobbingtrack.com
DEMO_USER_PASSWORD=password123
```

### Utilisateur de Test
Après exécution des scripts :
- **Email** : `pavel@jobbingtrack.com`
- **Mot de passe** : `password123`
- **Rôle** : Administrateur complet

## 🚀 Données Incluses

### Utilisateurs
- Administrateur système complet
- Utilisateur standard pour tests
- Comptes avec différents niveaux d'accès

### Entreprises
- **TechCorp** : Société technologique fictive
- **DataSoft** : Éditeur de logiciels
- **GreenEnergy** : Entreprise énergétique

### Candidatures
- **Statuts variés** : APPLIED, INTERVIEW, REJECTED, etc.
- **Relations entreprises** : Liens avec les sociétés
- **Historique complet** : Timeline des activités

## 📈 Métriques et Monitoring

### Intégrité des Données
- **Contraintes de clé étrangère** : Prévention des données orphelines
- **Index de performance** : Requêtes optimisées
- **Vérifications de cohérence** : Scripts de validation

### Sauvegardes
- **Sauvegarde automatique** avant modifications importantes
- **Tests de restauration** périodiques
- **Compression** pour optimisation stockage

## 🔒 Sécurité

- **Mots de passe hashés** : Sécurité des comptes utilisateurs
- **Permissions granulaires** : Contrôle d'accès précis
- **Audit logging** : Traçabilité des modifications
- **Chiffrement des données sensibles** : Protection RGPD

## 📚 Référence

Voir le [README principal](../../README.md) pour :
- Installation complète de la base de données
- Configuration des services
- Guide de déploiement en production
