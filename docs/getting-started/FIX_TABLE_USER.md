# 🔧 Fix : Table User n'existe pas

**Problème** : `The table public.User does not exist in the current database`

## ⚡ Solution Rapide

```bash
# Appliquer les migrations Prisma
make db-push-all

# Attendre 5 secondes
sleep 5

# Redémarrer le service auth
make restart-service SERVICE=auth-service

# Vérifier que les tables existent
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "\dt" | grep User
```

## 🔍 Vérification

```bash
# Vérifier que la table User existe
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "\dt \"User\""

# Devrait afficher quelque chose comme:
#  Schema | Name | Type  | Owner
# --------+------+-------+----------
#  public | User | table | jobbingtrack
```

## 📋 Si ça ne fonctionne pas

```bash
# 1. Arrêter les services
make down

# 2. Nettoyer les volumes (ATTENTION: supprime les données)
make db-clean

# 3. Redémarrer
make up-full

# 4. Appliquer migrations
make db-push-all

# 5. Créer admin
make create-admin-user
```

