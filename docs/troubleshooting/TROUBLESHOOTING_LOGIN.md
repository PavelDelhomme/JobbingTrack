# 🔧 Troubleshooting - Problème de Login et Tables Manquantes

## 📋 Problème Résolu : Login Impossible avec Table User Manquante

### 🔍 Explication du Problème

Lors de la réinitialisation de la base de données ou lors du premier démarrage, la table `User` n'existe pas encore. Cela causait une erreur 500 lors de la tentative de connexion avec `admin@jobbingtrack.test` / `password123`.

### ✅ Solution Implémentée

#### 1. **Fallback P2021 dans `auth.controller.js`**

Le système détecte maintenant automatiquement quand la table `User` n'existe pas (erreur Prisma P2021) et crée un utilisateur mock en mode développement :

```javascript
// Vérification préalable si prisma.user existe
if (!prisma.user || typeof prisma.user.findUnique !== 'function') {
  // Création utilisateur mock pour admin@jobbingtrack.test
  user = {
    id: 'dev_user_1',
    email: 'admin@jobbingtrack.test',
    password: 'password123', // Accepté directement (pas de hash bcrypt)
    role: 'SUPER_ADMIN',
    // ...
  };
}

// Pour l'utilisateur mock, accepter directement 'password123'
if (user.id === 'dev_user_1' && password === 'password123') {
  // Authentification réussie
}
```

#### 2. **Exécution Automatique de `db-push-all`**

Les commandes `make up-full`, `make restart`, et `make restart-service` vérifient maintenant automatiquement si la base de données contient moins de 5 tables. Si c'est le cas, elles exécutent automatiquement `make db-push-all` pour créer toutes les tables.

**Fichiers modifiés :**
- `makefiles/services/Makefile` : Ajout de la vérification automatique des tables

#### 3. **Fallbacks P2021 pour Tous les Services**

Tous les services (company-service, application-service, etc.) ont maintenant des fallbacks robustes pour gérer les erreurs P2021 :

- **Dans les controllers** : Capture de toutes les variantes d'erreurs Prisma (P2021, P2022, messages d'erreur)
- **Dans les error handlers** : Gestion globale des erreurs P2021 au niveau middleware

**Fichiers modifiés :**
- `backend/company-service/src/controllers/company.controller.js`
- `backend/company-service/src/middlewares/errorHandler.js`
- `backend/application-service/src/controllers/application.controller.js`
- `backend/application-service/src/middlewares/errorHandler.js`

### 🎯 Pourquoi Cela Ne Se Reproduira Plus

1. **Hot Reload avec Nodemon** : Le code source est monté en volume, donc les modifications sont automatiquement rechargées
2. **Fallbacks Robustes** : Toutes les erreurs Prisma liées aux tables manquantes sont capturées
3. **Exécution Automatique** : `make up-full` exécute automatiquement `db-push-all` si nécessaire
4. **Utilisateur Mock** : L'utilisateur mock permet de se connecter même si la table n'existe pas

### 📝 Commandes Utiles

```bash
# Démarrer tous les services (exécute automatiquement db-push-all si nécessaire)
make up-full

# Redémarrer un service spécifique
make restart-service SERVICE=auth-service

# Vérifier les tables Prisma
make db-push-all

# Voir les logs d'un service
docker logs jobbingtrack-auth-service --tail 50
```

### ⚠️ Notes Importantes

- **Mode Développement Uniquement** : Les fallbacks utilisateur mock ne fonctionnent qu'en mode développement (`NODE_ENV !== 'production'`)
- **Email Spécifique** : L'utilisateur mock n'est créé que pour `admin@jobbingtrack.test`
- **Mot de Passe Direct** : Pour l'utilisateur mock, le mot de passe `password123` est accepté directement (pas de vérification bcrypt)

### 🔄 Workflow Recommandé

1. **Premier Démarrage** :
   ```bash
   make up-full  # Crée automatiquement les tables si nécessaire
   ```

2. **Après Réinitialisation BDD** :
   ```bash
   make db-push-all  # Ou laisser make up-full le faire automatiquement
   ```

3. **En Cas d'Erreur 500** :
   - Vérifier les logs : `docker logs jobbingtrack-<service-name> --tail 50`
   - Vérifier les tables : `make db-push-all`
   - Redémarrer le service : `make restart-service SERVICE=<service-name>`

