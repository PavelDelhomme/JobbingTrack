# 🚀 Guide de Migration - Nouvelle Architecture Base de Données

## 📋 Vue d'Ensemble

Ce guide explique comment déployer la nouvelle architecture de base de données avec schéma Prisma partagé unique.

### Ce qui change

**Avant** :
- Chaque service avait son propre schéma Prisma
- Duplication des modèles
- Synchronisation complexe

**Maintenant** :
- ✅ **UN SEUL schéma Prisma** dans `backend/prisma/`
- ✅ **19 modèles** complets avec relations réelles
- ✅ **52 valeurs prédéfinies** (plateformes, types, etc.)
- ✅ **Pas de duplication**
- ✅ **Foreign Keys PostgreSQL** réelles

---

## 🎯 Migration Automatique (Recommandé)

### Option 1 : Script All-in-One

```bash
# Tout faire en une seule commande
bash scripts/deploy-new-database-architecture.sh
```

Ce script exécute automatiquement :
1. ✅ Migrations Prisma dans Docker
2. ✅ Mise à jour des services
3. ✅ Rebuild Docker
4. ✅ Démarrage des services
5. ✅ Tests de validation

**Durée estimée** : 5-10 minutes

---

## 🔧 Migration Manuelle (Étape par Étape)

### Étape 1 : Migrations Prisma

```bash
# Exécuter les migrations depuis Docker
bash scripts/run-prisma-migrations.sh
```

**Ce qui se passe** :
- Création d'un conteneur temporaire Node.js
- Installation de Prisma
- Application des migrations SQL
- Insertion des 52 valeurs prédéfinies (seed)

**Résultat attendu** :
```
✅ MIGRATION PRISMA RÉUSSIE !
📊 Statistiques:
  - Schéma: 19 modèles créés
  - Seed: 52 valeurs prédéfinies insérées
```

### Étape 2 : Mise à Jour des Imports

```bash
# Mettre à jour automatiquement les imports Prisma
bash scripts/update-prisma-imports.sh
```

**Ce qui se passe** :
- Remplace `const { PrismaClient } = require('@prisma/client')` 
- Par `const { prisma } = require('@jobbingtrack/database')`
- Ajoute la dépendance dans `package.json`

### Étape 3 : Rebuild Docker

```bash
# Arrêter les conteneurs
docker-compose down

# Rebuild
docker-compose build --no-cache

# Redémarrer
docker-compose --profile full up -d
```

### Étape 4 : Validation

```bash
# Exécuter tous les tests de validation
bash scripts/validate-new-architecture.sh
```

**Tests effectués** :
- ✅ PostgreSQL accessible
- ✅ 19 tables créées
- ✅ 52 valeurs prédéfinies insérées
- ✅ Foreign Keys créées (30+)
- ✅ Services Docker actifs
- ✅ API Gateway répond
- ✅ Schéma Prisma valide

---

## 📊 Vérifications Manuelles

### 1. Tables PostgreSQL

```bash
# Se connecter à PostgreSQL
docker exec -it jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack

# Lister les tables
\dt

# Vérifier les Foreign Keys
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY'
ORDER BY table_name;

# Quitter
\q
```

### 2. Valeurs Prédéfinies

```sql
-- Plateformes (13 attendues)
SELECT COUNT(*) FROM "Platform" WHERE "isPredefined" = true;

-- Types de relance (6 attendus)
SELECT COUNT(*) FROM "FollowUpType" WHERE "isPredefined" = true;

-- Types d'entretien (9 attendus)
SELECT COUNT(*) FROM "InterviewType" WHERE "isPredefined" = true;
```

### 3. Prisma Studio

```bash
cd backend/prisma
npm run studio
# Ouvre http://localhost:5555
```

---

## 🐛 Dépannage

### Erreur : "Can't reach database server"

**Cause** : PostgreSQL n'est pas démarré ou n'est pas accessible.

**Solution** :
```bash
# Vérifier que PostgreSQL tourne
docker ps | grep postgres

# Démarrer PostgreSQL
docker-compose up -d postgres

# Attendre qu'il soit prêt
docker exec jobbingtrack-postgres pg_isready -U jobbingtrack
```

### Erreur : "Network jobbingtrack not found"

**Cause** : Le réseau Docker n'existe pas.

**Solution** :
```bash
# Lister les réseaux
docker network ls | grep jobbingtrack

# Le réseau devrait être créé automatiquement par docker-compose
docker-compose up -d
```

### Erreur : "Migration failed"

**Cause** : Le schéma Prisma est invalide ou la DB a des données incompatibles.

**Solution** :
```bash
# Valider le schéma
cd backend/prisma
npx prisma validate

# Réinitialiser la DB (⚠️ SUPPRIME TOUTES LES DONNÉES)
npx prisma migrate reset --force
```

### Les services ne démarrent pas

**Cause** : Dépendances manquantes ou erreurs de build.

**Solution** :
```bash
# Voir les logs
docker-compose logs auth-service
docker-compose logs application-service

# Rebuild sans cache
docker-compose build --no-cache auth-service
docker-compose up -d auth-service
```

---

## 📝 Commandes Utiles

### Makefile (à ajouter)

```makefile
# Makefile targets recommandés
db-migrate:
	@bash scripts/run-prisma-migrations.sh

db-validate:
	@bash scripts/validate-new-architecture.sh

db-deploy:
	@bash scripts/deploy-new-database-architecture.sh

db-studio:
	@cd backend/prisma && npm run studio

db-reset:
	@echo "⚠️  ATTENTION : Cela va SUPPRIMER toutes les données !"
	@read -p "Taper 'yes' pour confirmer: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		cd backend/prisma && npx prisma migrate reset --force; \
	else \
		echo "❌ Annulé"; \
	fi
```

### Utilisation

```bash
make db-migrate    # Exécuter les migrations
make db-validate   # Valider l'architecture
make db-deploy     # Déploiement complet
make db-studio     # Ouvrir Prisma Studio
make db-reset      # Reset DB (DANGER)
```

---

## 🎯 Checklist de Migration

- [ ] ✅ Backup de la DB actuelle effectué
- [ ] ✅ Script `run-prisma-migrations.sh` exécuté avec succès
- [ ] ✅ 19 tables créées dans PostgreSQL
- [ ] ✅ 52 valeurs prédéfinies insérées
- [ ] ✅ Foreign Keys vérifiées (30+)
- [ ] ✅ Imports Prisma mis à jour dans les services
- [ ] ✅ `package.json` des services mis à jour
- [ ] ✅ Dossiers `prisma/` locaux supprimés
- [ ] ✅ Docker rebuild effectué
- [ ] ✅ Services démarrés avec `--profile full`
- [ ] ✅ Tests de validation passés
- [ ] ✅ API Gateway répond
- [ ] ✅ Prisma Studio fonctionne
- [ ] ✅ Tests Playwright mis à jour (si nécessaire)
- [ ] ✅ Dashboard admin fonctionne
- [ ] ✅ Commit effectué
- [ ] ✅ Push vers le dépôt

---

## 📚 Documentation

### Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `backend/prisma/schema.prisma` | Schéma Prisma complet (786 lignes) |
| `backend/prisma/seed.js` | Seed des valeurs prédéfinies |
| `backend/prisma/package.json` | Configuration du package |
| `backend/prisma/index.js` | Export du client Prisma |
| `scripts/run-prisma-migrations.sh` | Script de migration Docker |
| `scripts/deploy-new-database-architecture.sh` | Script de déploiement complet |
| `scripts/update-prisma-imports.sh` | Mise à jour des imports |
| `scripts/validate-new-architecture.sh` | Tests de validation |
| `MIGRATION_GUIDE.md` | Ce fichier |

### Documentation Complète

- **Schéma détaillé** : `docs/DATABASE_SCHEMA_COMPLETE.md`
- **Guide de migration** : `docs/DATABASE_MIGRATION_GUIDE.md`
- **Récapitulatif** : `docs/NOUVELLE_ARCHITECTURE_DB_RECAP.md`
- **Architecture** : `docs/DATABASE_ARCHITECTURE_SOLUTION.md`

---

## 🎉 Après la Migration

### Tests à Exécuter

```bash
# Tests unitaires
npm run test

# Tests E2E Playwright
npm run test:e2e

# Tests API
npm run test:api
```

### Développement

```bash
# Ajouter une nouvelle migration
cd backend/prisma
npx prisma migrate dev --name add_new_field

# Générer le client après modification du schéma
npx prisma generate

# Ouvrir Prisma Studio pour explorer la DB
npm run studio
```

### Commit Final

```bash
# Ajouter tous les fichiers
git add .

# Commit
git commit -m "feat: migration vers schéma Prisma partagé unique

- 19 modèles créés avec relations réelles
- 52 valeurs prédéfinies (plateformes, types, etc.)
- Scripts de migration automatisés
- Tests de validation
- Documentation complète"

# Push
git push origin tech/monitoring-system
```

---

## 🆘 Support

En cas de problème :

1. **Vérifier les logs** : `docker-compose logs`
2. **Valider le schéma** : `npx prisma validate`
3. **Exécuter les tests** : `bash scripts/validate-new-architecture.sh`
4. **Consulter la doc** : `docs/DATABASE_SCHEMA_COMPLETE.md`

---

## ✨ Résumé

**Nouvelle architecture** :
- ✅ 1 seul schéma Prisma
- ✅ 19 modèles (12 principaux + 7 listes personnalisables)
- ✅ 52 valeurs prédéfinies
- ✅ Foreign Keys PostgreSQL réelles
- ✅ Pas de duplication
- ✅ Scripts automatisés
- ✅ Tests de validation
- ✅ Documentation complète

**Tout est prêt pour le développement ! 🚀**
