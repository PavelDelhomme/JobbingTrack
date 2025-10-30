# 📦 @jobbingtrack/database

Package Prisma partagé pour l'application JobbingTrack.

## 🎯 Principe

Ce package contient **LE** schéma Prisma unique utilisé par **TOUS** les services backend.

**Architecture** : Base de données PostgreSQL unique avec relations réelles (Foreign Keys).

**Pas de duplication** : Chaque modèle (User, Application, Contact, etc.) n'existe qu'**une seule fois** dans PostgreSQL.

## 📁 Structure

```
backend/shared/
├── prisma/
│   ├── schema.prisma      # Schéma complet (19 modèles)
│   ├── seed.js           # Données prédéfinies (plateformes, types, etc.)
│   └── migrations/       # Historique des migrations
├── index.js              # Export du client Prisma (singleton)
├── package.json          # Dépendances (@prisma/client)
└── README.md            # Ce fichier
```

## 📊 Modèles Disponibles

### Modèles Principaux (12)
1. **User** - Utilisateurs
2. **Company** - Entreprises
3. **Application** - Candidatures
4. **Contact** - Contacts
5. **FollowUp** - Relances
6. **Call** - Appels
7. **Interview** - Entretiens
8. **Event** - Événements calendrier
9. **Document** - Documents (CV, lettres, etc.)
10. **Notification** - Notifications
11. **ApplicationStatusHistory** - Historique des changements de statut
12. **SyncQueue** - Queue de synchronisation offline

### Listes Personnalisables (7)
1. **Platform** - Plateformes de candidature (LinkedIn, Indeed, etc.)
2. **FollowUpType** - Types de relance (1ère relance, 2ème relance, etc.)
3. **FollowUpMethod** - Moyens de relance (Email, Téléphone, LinkedIn, etc.)
4. **InterviewType** - Types d'entretien (RH, Technique, Manager, etc.)
5. **InterviewStyle** - Styles d'entretien (Présentiel, Visio, Téléphone, etc.)
6. **EventType** - Types d'événement (Entretien, Relance, Deadline, etc.)
7. **CallType** - Types d'appel (Sortant, Entrant, Manqué, etc.)

### Tables de Jonction (4)
1. **ContactCompany** - Lien Contact ↔ Company (many-to-many)
2. **ContactApplication** - Lien Contact ↔ Application (many-to-many)
3. **FollowUpContact** - Lien FollowUp ↔ Contact (many-to-many)
4. **InterviewContact** - Lien Interview ↔ Contact (many-to-many)

## 🚀 Installation

```bash
cd backend/shared
npm install
```

## ⚙️ Commandes

### Générer le client Prisma
```bash
npm run generate
```

### Créer une migration
```bash
npm run migrate
# Ou avec un nom spécifique
npx prisma migrate dev --name add_new_field
```

### Appliquer les migrations (production)
```bash
npm run migrate:deploy
```

### Seed des données prédéfinies
```bash
npm run seed
```

### Ouvrir Prisma Studio (interface graphique)
```bash
npm run studio
# Ouvre http://localhost:5555
```

### Formater le schéma
```bash
npm run format
```

### Valider le schéma
```bash
npm run validate
```

### Reset complet (⚠️ DANGER - supprime tout)
```bash
npm run migrate:reset
```

## 💻 Utilisation dans les Services

### 1. Ajouter la dépendance

Dans le `package.json` du service :
```json
{
  "dependencies": {
    "@jobbingtrack/database": "file:../shared"
  }
}
```

### 2. Installer
```bash
cd backend/auth-service  # ou n'importe quel service
npm install
```

### 3. Importer et utiliser

```javascript
// Import du client Prisma partagé
const { prisma } = require('@jobbingtrack/database');

// Utilisation directe
const users = await prisma.user.findMany();

const newApplication = await prisma.application.create({
  data: {
    userId: 'user_123',
    companyId: 'company_456',
    position: 'Développeur Full Stack',
    contractType: 'CDI',
    status: 'CANDIDATE_PENDING'
  }
});

// Avec relations
const fullApplication = await prisma.application.findUnique({
  where: { id: 'app_xyz' },
  include: {
    user: true,
    company: true,
    contacts: {
      include: { contact: true }
    },
    interviews: true,
    followUps: true
  }
});
```

## 🗄️ Configuration PostgreSQL

Variable d'environnement requise :
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/jobbingtrack"
```

Format :
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

## 📝 Exemples de Requêtes

### Créer une candidature complète

```javascript
const application = await prisma.application.create({
  data: {
    userId: 'user_123',
    companyId: 'company_456',
    platformId: 'platform_linkedin',
    position: 'Senior Developer',
    contractType: 'CDI',
    workMode: 'HYBRID',
    applicationType: 'OFFRE',
    status: 'CANDIDATE_PENDING',
    salaryMin: 50000,
    salaryMax: 60000,
    // Créer automatiquement un événement
    events: {
      create: {
        userId: 'user_123',
        title: 'Candidature envoyée',
        startDate: new Date(),
        reminderEnabled: true,
        reminderMinutes: 2880 // 2 jours
      }
    }
  },
  include: {
    company: true,
    platform: true,
    events: true
  }
});
```

### Lier un contact à une candidature

```javascript
await prisma.contactApplication.create({
  data: {
    contactId: 'contact_789',
    applicationId: 'app_xyz'
  }
});
```

### Programmer un entretien avec contacts

```javascript
const interview = await prisma.interview.create({
  data: {
    userId: 'user_123',
    applicationId: 'app_xyz',
    companyId: 'company_456',
    interviewTypeId: 'type_rh',
    interviewDate: new Date('2025-11-05T14:00:00'),
    estimatedDuration: 60,
    videoLink: 'https://meet.google.com/...',
    status: 'SCHEDULED',
    contacts: {
      create: [
        { contactId: 'contact_789' },
        { contactId: 'contact_abc' }
      ]
    }
  },
  include: {
    contacts: {
      include: { contact: true }
    }
  }
});
```

### Récupérer tout le contexte d'une candidature

```javascript
const fullApp = await prisma.application.findUnique({
  where: { id: 'app_xyz' },
  include: {
    user: true,
    company: true,
    platform: true,
    contacts: {
      include: {
        contact: {
          include: {
            companies: {
              include: { company: true }
            }
          }
        }
      }
    },
    followUps: {
      include: {
        followUpType: true,
        followUpMethod: true,
        contacts: { include: { contact: true } }
      }
    },
    interviews: {
      include: {
        interviewType: true,
        interviewStyle: true,
        contacts: { include: { contact: true } }
      }
    },
    calls: {
      include: {
        contact: true,
        callType: true
      }
    },
    events: true,
    documents: true,
    statusHistory: {
      orderBy: { changedAt: 'desc' }
    }
  }
});
```

## 🔗 Relations

Toutes les relations sont **réelles** (Foreign Keys PostgreSQL).

**Exemple** :
```javascript
// Créer un contact lié à une company existante
const contact = await prisma.contact.create({
  data: {
    userId: 'user_123',
    firstName: 'Jean',
    lastName: 'Dupont',
    companies: {
      create: {
        companyId: 'company_456'  // FK vers Company existante
      }
    }
  }
});
```

PostgreSQL **garantit** que :
- ✅ `user_123` existe dans la table `User`
- ✅ `company_456` existe dans la table `Company`
- ❌ Impossible de créer un contact avec un `userId` inexistant
- ❌ Impossible de supprimer un `User` qui a des candidatures (onDelete: Cascade)

## 🎨 Listes Personnalisables

Les utilisateurs peuvent **ajouter leurs propres valeurs** en plus des valeurs prédéfinies.

### Exemple : Ajouter une plateforme personnalisée

```javascript
const customPlatform = await prisma.platform.create({
  data: {
    userId: 'user_123',          // userId = propre à l'utilisateur
    name: 'Mon réseau perso',
    icon: '🤝',
    isPredefined: false          // créé par l'utilisateur
  }
});

// Utiliser ensuite
await prisma.application.create({
  data: {
    platformId: customPlatform.id,
    // ...
  }
});
```

### Récupérer toutes les plateformes (système + utilisateur)

```javascript
const allPlatforms = await prisma.platform.findMany({
  where: {
    OR: [
      { isPredefined: true },           // Plateformes système
      { userId: currentUserId }         // Plateformes de l'utilisateur
    ]
  },
  orderBy: [
    { isPredefined: 'desc' },  // Prédéfinies en premier
    { name: 'asc' }
  ]
});
```

## 📚 Documentation Complète

- **Schéma détaillé** : `docs/DATABASE_SCHEMA_COMPLETE.md`
- **Guide de migration** : `docs/DATABASE_MIGRATION_GUIDE.md`
- **Architecture** : `docs/DATABASE_ARCHITECTURE_SOLUTION.md`

## 🛠️ Maintenance

### Ajouter un nouveau champ

1. Modifier `prisma/schema.prisma`
2. Créer la migration :
   ```bash
   npx prisma migrate dev --name add_field_xyz
   ```
3. Vérifier le fichier SQL généré
4. Appliquer la migration
5. Regénérer le client :
   ```bash
   npm run generate
   ```

### Ajouter un nouveau modèle

1. Ajouter le modèle dans `prisma/schema.prisma`
2. Définir les relations
3. Créer la migration
4. Mettre à jour le seed si nécessaire
5. Documenter dans `DATABASE_SCHEMA_COMPLETE.md`

## ⚠️ Bonnes Pratiques

1. **Toujours utiliser des transactions** pour les opérations multi-tables
   ```javascript
   await prisma.$transaction([
     prisma.application.create({ ... }),
     prisma.event.create({ ... })
   ]);
   ```

2. **Utiliser `include` avec parcimonie** (peut ralentir les requêtes)
   ```javascript
   // ❌ Mauvais - charge TOUT
   const app = await prisma.application.findMany({
     include: {
       user: true,
       company: true,
       contacts: { include: { contact: true } },
       interviews: true,
       // ...
     }
   });

   // ✅ Bon - charge uniquement ce qui est nécessaire
   const app = await prisma.application.findMany({
     select: {
       id: true,
       position: true,
       company: { select: { name: true } }
     }
   });
   ```

3. **Toujours valider les données** avant insertion
4. **Utiliser les enums** plutôt que des strings libres
5. **Penser aux index** pour les champs fréquemment recherchés

## 🐛 Debug

### Activer les logs SQL

```javascript
const { PrismaClient } = require('@jobbingtrack/database');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Prisma Studio

Interface graphique pour explorer/modifier la DB :
```bash
npm run studio
```

### Inspecter le schéma généré

```bash
cat node_modules/.prisma/client/schema.prisma
```

## 📞 Support

- **Issues** : GitHub Issues
- **Documentation** : `docs/` folder
- **Prisma Docs** : https://www.prisma.io/docs/
