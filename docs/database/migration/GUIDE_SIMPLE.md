# 🚀 Guide Simple - Migration Phase 1

> **Guide ultra-simple** pour exécuter la Phase 1 de migration.

---

## ✅ Phase 1 : Ce qu'il faut faire (4 étapes simples)

### Étape 1 : Créer les Modèles dans le Schéma Prisma

```bash
# Exécuter le script qui modifie le schéma Prisma
node scripts/legacy/database/migration-phase2-create-tables.js
```

**Résultat** : Le schéma Prisma est modifié avec les nouveaux modèles.

### Étape 2 : Formater et Générer Prisma

```bash
# Formater le schéma
npx prisma format

# Générer le client Prisma
npx prisma generate
```

**Résultat** : Le client Prisma est à jour.

### Étape 3 : Appliquer le Schéma à la Base de Données

```bash
# Appliquer les modifications (crée les tables dans Docker)
npx prisma db push
```

**Résultat** : Les tables `ApplicationStatus`, `InterviewStatus`, `FollowUpStatus` sont créées dans PostgreSQL (dans Docker).

### Étape 4 : Créer les Statuts Système

```bash
# Créer les statuts système par défaut
node scripts/database/seed-statuses.js
```

**Résultat** : 12 ApplicationStatus + 5 InterviewStatus + 5 FollowUpStatus sont créés.

---

## ✅ Vérification

```bash
# Vérifier que les tables existent
npx prisma studio
# Ouvrir http://localhost:5555 et vérifier les tables ApplicationStatus, InterviewStatus, FollowUpStatus
```

---

## 🎯 C'est tout !

Une fois ces 4 étapes terminées, la **Phase 1 est complète**.

Ensuite, on passera à la **Phase 2** : Modifier les modèles Application/Interview/FollowUp.

---

**Note** : Tout se fait automatiquement dans Docker. Prisma se connecte à PostgreSQL dans le conteneur Docker via `DATABASE_URL`.

