# 🏗️ Solution Architecture Base de Données - JobbingTrack

## 🤔 Votre Question

> "Normalement Application, Company, Contact, Call, Interview, etc. tous ces services doivent être reliés. Mais si je recr ée le modèle utilisateur dans chaque schéma prisma, comment les données communiquent-elles entre elles ? Comment lier un contact à une entreprise, à une candidature, etc. sans recréer les données plusieurs fois ?"

## ✅ Réponse : Architecture Hybride Recommandée

### Option 1 : **Base de Données Unique avec Relations Réelles** (RECOMMANDÉ)

Tous les services utilisent **la même base de données PostgreSQL** avec des schémas Prisma qui définissent les relations réelles.

```
┌──────────────────────────────────────────────────────┐
│         PostgreSQL (jobbingtrack)                    │
│                                                      │
│  Tables:                                             │
│    - users                    (ONE source of truth) │
│    - companies                (ONE source of truth) │
│    - applications             (ONE source of truth) │
│    - contacts                 (ONE source of truth) │
│    - calls, interviews, etc.  (ONE source of truth) │
│                                                      │
│  Relations PostgreSQL réelles avec Foreign Keys     │
└──────────────────────────────────────────────────────┘
              ↑      ↑      ↑      ↑      ↑
              │      │      │      │      │
         ┌────┴──────┴──────┴──────┴──────┴────┐
         │    Prisma Client (tous les modèles) │
         └─────────────────────────────────────┘
              ↑      ↑      ↑      ↑      ↑
              │      │      │      │      │
         auth- app-  company- contact- call-
         svc   svc   service  service  svc
```

**Comment ça marche ?**

1. **Un seul schéma Prisma partagé** (ou schémas qui référencent les mêmes tables)
2. **Relations réelles PostgreSQL** avec Foreign Keys
3. **Chaque service accède à SA table principale** mais peut lire les autres
4. **Cohérence garantie par la DB**

### Exemple Concret

#### Schéma Prisma Complet (partagé)

```prisma
// backend/shared/prisma/schema.prisma

model User {
  id             String  @id @default(cuid())
  email          String  @unique
  firstName      String
  lastName       String
  
  // Relations (ONE source of truth)
  applications   Application[]
  contacts       Contact[]
  companies      Company[]
  calls          Call[]
  interviews     Interview[]
}

model Company {
  id          String   @id @default(cuid())
  userId      String
  name        String
  
  // Relations réelles
  user          User          @relation(fields: [userId], references: [id])
  applications  Application[]
  contacts      Contact[]
  calls         Call[]
}

model Application {
  id              String   @id @default(cuid())
  userId          String
  companyId       String
  position        String
  
  // Relations réelles
  user            User     @relation(fields: [userId], references: [id])
  company         Company  @relation(fields: [companyId], references: [id])
  contacts        ContactApplication[]  // Many-to-many
  calls           Call[]
  interviews      Interview[]
}

model Contact {
  id              String   @id @default(cuid())
  userId          String
  companyId       String?
  firstName       String
  lastName        String
  
  // Relations réelles
  user            User     @relation(fields: [userId], references: [id])
  company         Company? @relation(fields: [companyId], references: [id])
  applications    ContactApplication[]  // Many-to-many
}

// Table de jonction (many-to-many)
model ContactApplication {
  id            String   @id @default(cuid())
  contactId     String
  applicationId String
  
  contact       Contact     @relation(fields: [contactId], references: [id])
  application   Application @relation(fields: [applicationId], references: [id])
  
  @@unique([contactId, applicationId])
}

model Call {
  id             String   @id @default(cuid())
  userId         String
  applicationId  String
  contactId      String?
  
  // Relations réelles
  user           User        @relation(fields: [userId], references: [id])
  application    Application @relation(fields: [applicationId], references: [id])
  contact        Contact?    @relation(fields: [contactId], references: [id])
}

model Interview {
  id             String   @id @default(cuid())
  userId         String
  applicationId  String
  companyId      String
  
  // Relations réelles
  user           User        @relation(fields: [userId], references: [id])
  application    Application @relation(fields: [applicationId], references: [id])
  company        Company     @relation(fields: [companyId], references: [id])
}
```

#### Utilisation dans les Services

**auth-service** :
```javascript
// Accède principalement à User
const user = await prisma.user.create({
  data: { email: '...', firstName: '...' }
});
```

**contact-service** :
```javascript
// Crée un contact lié à un User et une Company EXISTANTS
const contact = await prisma.contact.create({
  data: {
    userId: 'user_123',      // Référence User existant
    companyId: 'company_456', // Référence Company existante
    firstName: 'Jean',
    lastName: 'Dupont'
  },
  include: {
    user: true,    // Peut récupérer les infos du user
    company: true  // Peut récupérer les infos de la company
  }
});
```

**application-service** :
```javascript
// Lie un contact à une candidature
await prisma.contactApplication.create({
  data: {
    contactId: 'contact_789',       // Référence Contact existant
    applicationId: 'application_123' // Référence Application existante
  }
});

// Récupère une candidature avec ses contacts
const app = await prisma.application.findUnique({
  where: { id: 'application_123' },
  include: {
    contacts: {
      include: {
        contact: true  // Les données du contact
      }
    },
    company: true,     // Les données de l'entreprise
    user: true,        // Les données de l'utilisateur
    calls: true,       // Tous les appels liés
    interviews: true   // Tous les entretiens liés
  }
});
```

### ✅ Avantages

1. **Pas de duplication** - Une seule source de vérité pour chaque donnée
2. **Cohérence garantie** - Les Foreign Keys PostgreSQL empêchent les incohérences
3. **Relations réelles** - `JOIN` SQL natifs = performance
4. **Simplicité** - Pas de synchronisation à gérer
5. **Transactions** - Possibilité de transactions atomiques entre services

### ⚠️ Désavantages

1. **Couplage DB** - Tous les services dépendent de la même DB
2. **Scalabilité limitée** - Difficile de sharding horizontal
3. **Déploiement couplé** - Migrations doivent être coordonnées

---

## 🔄 Option 2 : Services Vraiment Indépendants (Future)

Si vous voulez une vraie indépendance (pour scalabilité extrême), il faut :

### Event-Driven Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ auth-service│     │ app-service  │     │contact-svc  │
│   (DB 1)    │     │    (DB 2)    │     │   (DB 3)    │
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                    │
       │  UserCreated      │  AppCreated        │  ContactCreated
       └──────────┬────────┴──────────┬─────────┘
                  ↓                   ↓
           ┌──────────────────────────────┐
           │    Kafka / RabbitMQ          │
           │    (Event Bus)               │
           └──────────────────────────────┘
                  ↓                   ↓
       ┌──────────┴────────┬─────────┴─────────┐
       │                   │                   │
   app-service        contact-service    notification-svc
   (écoute User)      (écoute User+App)   (écoute tout)
```

**Chaque service** :
- A sa propre DB
- Publie des événements quand ses données changent
- Écoute les événements des autres services
- Maintient une **copie locale** des données dont il a besoin

**Exemple** :
```javascript
// auth-service publie
kafka.publish('UserCreated', { id: 'user_123', email: '...' });

// contact-service écoute et stocke localement
kafka.on('UserCreated', async (event) => {
  await prisma.userCache.create({
    data: { id: event.id, email: event.email }
  });
});
```

**Avantages** :
- Services totalement indépendants
- Scalabilité horizontale
- Résilience (un service down ≠ tout down)

**Désavantages** :
- Complexité élevée
- Eventual consistency (pas de cohérence immédiate)
- Overhead de synchronisation
- Nécessite Kafka/RabbitMQ

---

## 📊 Notre Recommandation pour JobbingTrack

### Phase 1 (Maintenant) : **DB Unique avec Relations Réelles**

**Pourquoi ?**
- Simplicité de développement
- Cohérence garantie
- Performance excellente (tout local)
- Pas de synchronisation complexe
- Vous avez **moins de 10 000 utilisateurs** (estimation)

**Structure actuelle :**
```
backend/
├── shared/
│   └── prisma/
│       └── schema.prisma     # TOUS les modèles
├── auth-service/
│   └── src/
│       └── index.js          # Utilise prisma.user.*
├── application-service/
│   └── src/
│       └── index.js          # Utilise prisma.application.*
├── contact-service/
│   └── src/
│       └── index.js          # Utilise prisma.contact.*
└── ...
```

### Phase 2 (Si scalabilité nécessaire) : **Migration vers Event Sourcing**

**Quand ?**
- Plus de 100 000 utilisateurs
- Plus de 1 million de candidatures
- Besoin de déploiements indépendants
- Besoin de réplication géographique

**Migration progressive :**
1. Garder DB unique
2. Ajouter Kafka entre services
3. Commencer à publier des événements
4. Migrer service par service vers DB séparées
5. Utiliser CQRS (Command Query Responsibility Segregation)

---

## 🎯 Configuration Actuelle JobbingTrack

### Ce qui a été fait :

✅ **Chaque service a son propre schéma Prisma**
✅ **Tous pointent vers la même DB PostgreSQL**
✅ **Relations définies avec Foreign Keys**
✅ **15 services avec Prisma**

### Ce qu'il faut comprendre :

**Les "modèles simplifiés" dans chaque service** ne sont PAS des duplications !

Par exemple dans `contact-service/prisma/schema.prisma` :

```prisma
// Modèle User (simplifié)
model User {
  id       String @id
  email    String @unique
  contacts Contact[]
}
```

Ce n'est PAS une table séparée ! C'est juste la **définition Prisma** qui pointe vers la **même table `users`** dans PostgreSQL.

**Tous les services lisent/écrivent dans les MÊMES tables PostgreSQL.**

---

## 🔧 Implémentation Concrète

### 1. Créer un Contact lié à une Company

```javascript
// Dans contact-service
const contact = await prisma.contact.create({
  data: {
    userId: req.user.id,          // User existant (créé par auth-service)
    companyId: req.body.companyId, // Company existante (créée par company-service)
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'redacted@example.invalid'
  }
});
```

**Résultat** : Un seul enregistrement dans la table `contacts` de PostgreSQL avec des FK vers `users` et `companies`.

### 2. Lier un Contact à une Candidature

```javascript
// Dans application-service ou contact-service
await prisma.contactApplication.create({
  data: {
    contactId: 'contact_abc',
    applicationId: 'app_xyz'
  }
});
```

**Résultat** : Un enregistrement dans `contact_application` (table de jonction).

### 3. Récupérer une Candidature avec tout son contexte

```javascript
// Dans application-service
const app = await prisma.application.findUnique({
  where: { id: 'app_xyz' },
  include: {
    user: true,              // Infos utilisateur
    company: true,           // Infos entreprise
    contacts: {              // Tous les contacts liés
      include: {
        contact: {
          include: {
            company: true    // Entreprise du contact
          }
        }
      }
    },
    calls: {                 // Tous les appels
      include: {
        contact: true
      }
    },
    interviews: true,        // Tous les entretiens
    followUps: true          // Toutes les relances
  }
});
```

**Résultat** : Un objet JavaScript complet avec TOUTES les données liées grâce aux JOINs SQL.

---

## 📦 Checklist Migration

- [ ] Valider que tous les schémas Prisma sont cohérents
- [ ] S'assurer que les relations sont bidirectionnelles
- [ ] Tester `make rebuild && make up-full && make db-migrate`
- [ ] Vérifier les Foreign Keys dans PostgreSQL
- [ ] Tester la création de données liées
- [ ] Implémenter les endpoints API qui utilisent les relations
- [ ] Documenter les patterns d'accès aux données

---

## 🚀 Prochaines Étapes

1. **Valider les schémas** : `./scripts/validate-all-schemas.sh`
2. **Rebuild** : `make rebuild`
3. **Démarrer** : `make up-full`
4. **Migrer** : `make db-migrate`
5. **Tester** les relations dans `psql` :
   ```sql
   -- Vérifier les FK
   SELECT constraint_name, table_name 
   FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY';
   
   -- Tester un JOIN
   SELECT a.*, u.email, c.name 
   FROM applications a
   JOIN users u ON a."userId" = u.id
   JOIN companies c ON a."companyId" = c.id
   LIMIT 5;
   ```

---

## 📚 Ressources

- [Prisma Multi-Schema](https://www.prisma.io/docs/guides/database/multi-schema)
- [Database per Service Pattern](https://microservices.io/patterns/data/database-per-service.html)
- [Shared Database Pattern](https://microservices.io/patterns/data/shared-database.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
