# 📡 Documentation API - JobbingTrack

Cette section contient toute la documentation relative à l'API REST de JobbingTrack.

## 📂 Structure de l'API

```
api/
├── README.md                      # ← Cette documentation
├── endpoints/                     # Documentation des endpoints
│   ├── authentication.md          # Authentification et autorisation
│   ├── applications.md            # Gestion des candidatures
│   ├── companies.md               # Gestion des entreprises
│   ├── contacts.md                # Gestion des contacts
│   ├── interviews.md              # Gestion des entretiens
│   └── notifications.md           # Notifications et emails
├── schemas/                       # Schémas de données
│   ├── user.json                  # Schéma utilisateur
│   ├── application.json           # Schéma candidature
│   └── company.json               # Schéma entreprise
├── examples/                      # Exemples d'utilisation
│   ├── curl/                      # Requêtes HTTP avec curl
│   ├── javascript/                # Intégration JavaScript
│   └── python/                    # Intégration Python
└── changelog/                     # Historique des changements API
```

## 🎯 Fonctionnalités de l'API

### 🔐 **Authentification**
- **JWT Tokens** pour authentification stateless
- **Refresh Tokens** pour gestion des sessions
- **Rôles et permissions** granulaires
- **Middleware d'autorisation** automatique

### 📝 **Gestion des Candidatures**
- **CRUD complet** des candidatures
- **Statuts avancés** avec workflow
- **Timeline** des activités
- **Recherche et filtres** avancés

### 🏢 **Gestion des Entreprises**
- **Base de données** complète des entreprises
- **Secteurs d'activité** et classifications
- **Liaison** avec candidatures et contacts

### 👥 **Gestion des Contacts**
- **Carnet d'adresses** professionnel
- **Rôles** multiples par contact
- **Historique** des interactions

### 📅 **Gestion des Entretiens**
- **Planning** et programmation
- **Types d'entretiens** multiples
- **Feedback** et notes
- **Notifications** automatiques

### 🔔 **Notifications**
- **Emails HTML** professionnels
- **Templates** personnalisables
- **Relances automatiques**
- **Rappels** programmés

## 🛠️ Standards de l'API

### **Format de Réponse**
```json
{
  "success": true,
  "data": { ... },
  "message": "Opération réussie",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **Gestion d'Erreurs**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données invalides",
    "details": { ... }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **Codes HTTP Standards**
- `200` : Succès
- `201` : Création réussie
- `400` : Requête invalide
- `401` : Non authentifié
- `403` : Non autorisé
- `404` : Ressource non trouvée
- `500` : Erreur serveur

## 🔒 Sécurité

### **Authentification**
- **Bearer Token** dans l'en-tête Authorization
- **Refresh Token** pour renouvellement
- **Expiration automatique** des tokens

### **Autorisation**
- **Rôles** : USER, ADMIN, SUPER_ADMIN
- **Permissions** granulaires par endpoint
- **Middleware** d'autorisation automatique

### **Rate Limiting**
- **Limitation** par utilisateur et IP
- **Seuils configurables** par endpoint
- **Protection** anti-abus

## 📚 Documentation des Endpoints

### **Base URL**
```
https://api.votre-domaine.com/api/v1/
```

### **Endpoints Principaux**

#### **Authentification**
- `POST /auth/register` - Inscription utilisateur
- `POST /auth/login` - Connexion utilisateur
- `POST /auth/refresh` - Renouvellement token
- `POST /auth/logout` - Déconnexion

#### **Candidatures**
- `GET /applications` - Liste des candidatures
- `POST /applications` - Créer une candidature
- `GET /applications/{id}` - Détail d'une candidature
- `PUT /applications/{id}` - Modifier une candidature
- `DELETE /applications/{id}` - Supprimer une candidature

#### **Entreprises**
- `GET /companies` - Liste des entreprises
- `POST /companies` - Créer une entreprise
- `GET /companies/{id}` - Détail d'une entreprise
- `PUT /companies/{id}` - Modifier une entreprise
- `DELETE /companies/{id}` - Supprimer une entreprise

#### **Contacts**
- `GET /contacts` - Liste des contacts
- `POST /contacts` - Créer un contact
- `GET /contacts/{id}` - Détail d'un contact
- `PUT /contacts/{id}` - Modifier un contact
- `DELETE /contacts/{id}` - Supprimer un contact

## 💻 Exemples d'Utilisation

### **Authentification**
```bash
# Inscription
curl -X POST https://api.votre-domaine.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Connexion
curl -X POST https://api.votre-domaine.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### **Candidatures**
```bash
# Créer une candidature
curl -X POST https://api.votre-domaine.com/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "companyName": "Google",
    "position": "Software Engineer",
    "type": "FULL_TIME",
    "status": "DRAFT"
  }'

# Lister les candidatures
curl -X GET https://api.votre-domaine.com/api/v1/applications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🧪 Tests de l'API

### **Outils de Test**
- **Postman** : Interface graphique
- **Insomnia** : Alternative moderne
- **curl** : Tests en ligne de commande
- **Jest/Supertest** : Tests automatisés

### **Tests Automatisés**
- **Tests unitaires** pour chaque endpoint
- **Tests d'intégration** avec la base de données
- **Tests de charge** avec Artillery
- **Tests de sécurité** avec OWASP ZAP

## 📊 Monitoring de l'API

### **Métriques**
- **Temps de réponse** par endpoint
- **Taux d'erreur** et codes HTTP
- **Utilisation** des ressources
- **Nombre de requêtes** par utilisateur

### **Logs**
- **Requêtes entrantes** avec contexte
- **Erreurs** avec stack trace
- **Actions utilisateur** importantes
- **Métriques de performance**

## 🔧 Développement

### **Ajout de Nouveaux Endpoints**
1. Définir le schéma dans le service approprié
2. Implémenter la logique métier
3. Ajouter les tests unitaires et d'intégration
4. Documenter l'endpoint
5. Mettre à jour les exemples

### **Modification d'Endpoints**
1. Évaluer l'impact sur les clients
2. Maintenir la compatibilité ascendante
3. Ajouter la dépréciation si nécessaire
4. Communiquer les changements

## 📞 Support

### **Questions Fréquentes**
- Comment authentifier les requêtes ?
- Comment gérer les erreurs ?
- Comment paginer les résultats ?
- Comment utiliser les filtres ?

### **Contact**
- **Issues GitHub** : Rapports de bugs et demandes
- **Documentation** : Questions d'utilisation
- **Équipe API** : Problèmes complexes

## 🔗 Références

- **Spécifications Techniques** : [`../project/specifications.md`](../project/specifications.md)
- **Code Source Backend** : [`../../../backend/README.md`](../../../backend/README.md)
- **Tests API** : [`../../../tests/README.md`](../../../tests/README.md)
- **Documentation Déploiement** : [`../deployment/README.md`](../deployment/README.md)

---

**📡 Cette documentation constitue la référence complète pour l'intégration avec l'API REST de JobbingTrack.**

