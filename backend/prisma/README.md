# Prisma - ORM Configuration

[← Backend](../README.md) | [← README principal](../../README.md) | [📚 Documentation](../../docs/README.md) | [🧭 Navigation](../../docs/navigation.md)

Configuration Prisma ORM pour l'accès à la base de données PostgreSQL. Schémas, migrations et client TypeScript.

## 📖 Documentation

- **[Base de Données](../../docs/database/README.md)** - Documentation complète BDD
- **[Architecture Database](../../docs/database/architecture/database/README.md)** - Architecture PostgreSQL
- **[Guide Développement](../../docs/development/setup/README.md)** - Configuration environnement

## 🚀 Commandes Prisma

```bash
# Depuis la racine du projet
npx prisma generate       # Générer client Prisma
npx prisma migrate dev    # Créer migration développement
npx prisma studio         # Interface graphique BDD
npx prisma db seed        # Seed données de test
```

## 📁 Structure

```
prisma/
├── schema.prisma         # Schéma principal
├── migrations/           # Migrations historiques
└── seed.ts              # Données de seed
```

Pour plus d'informations, consultez la [documentation base de données](../../docs/database/README.md).
