# 🎯 Système de Parcours Utilisateur Personnalisé

Système modulaire permettant de créer et exécuter des parcours utilisateur personnalisés étape par étape.

## 📋 Vue d'ensemble

Ce système permet de :
- ✅ Créer des parcours personnalisés en sélectionnant des étapes individuelles
- ✅ Exécuter chaque étape de manière isolée ou en séquence
- ✅ Vérifier automatiquement les effets de chaque étape (création événements, mise à jour statuts, etc.)
- ✅ Tester tous les cas de figure possibles (succès, échec, cas limites)

## 🎯 Étapes Disponibles

### 1. **Inscription** (`register`)
- Inscription d'un nouvel utilisateur
- Options : email, password, firstName, lastName, phone

### 2. **Validation Email** (`email_validation`)
- Validation de l'email après inscription
- Vérifie si l'email est déjà validé
- Options : email, token

### 3. **Connexion** (`login`)
- Connexion utilisateur
- Retourne un token d'authentification
- Options : email, password

### 4. **Profil Utilisateur** (`profile`)
- Mise à jour du profil utilisateur
- Options : token, profileData (firstName, lastName, phone, profilePicture)

### 5. **Candidature avec Entreprise** (`application_with_company`)
- Création d'une candidature avec création d'entreprise simultanée
- Options : token, companyData, applicationData

### 6. **Contact à Candidature** (`contact_to_application`)
- Ajout d'un contact à une candidature existante
- Crée le contact et le lie à la candidature
- Options : token, applicationId, contactData

### 7. **Relance** (`followup`)
- Ajout d'une relance à une candidature
- Options : token, applicationId, followupData (type, date, notes, nextAction)

### 8. **Entretien** (`interview`)
- Ajout d'un entretien à une candidature
- **Vérifications automatiques** :
  - Création d'événement associé
  - Mise à jour du statut de la candidature
- Options : token, applicationId, interviewData, verifyEventCreation

### 9. **Appel Entreprise** (`call_company`)
- Enregistrement d'un appel avec l'entreprise
- Options : token, applicationId, callData

### 10. **Appel Contact** (`call_contact`)
- Enregistrement d'un appel avec un contact
- Options : token, applicationId, callData

### 11. **Statut Candidature** (`application_status`)
- Vérification et/ou mise à jour du statut d'une candidature
- Vérifie l'historique des statuts
- Options : token, applicationId, newStatus, verifyStatus

### 12. **Candidature Rejetée** (`application_rejected`)
- Marque une candidature comme rejetée après entretien
- Vérifie la présence d'entretiens
- Enregistre le rejet dans l'historique
- Options : token, applicationId, rejectionReason

## 🚀 Utilisation

### Via l'Interface Web

1. Accéder à : `http://localhost:5003/backoffice/user-journey/custom`
2. Sélectionner les étapes depuis la colonne de gauche
3. Réorganiser les étapes (flèches haut/bas)
4. Cliquer sur "Lancer le Parcours"
5. Consulter les résultats en temps réel

### Via la Ligne de Commande

```bash
# Exécuter un parcours prédéfini
node tests/user-journey/test-custom-journey.js complete

# Exécuter un parcours personnalisé
node tests/user-journey/test-custom-journey.js custom '[{"step":"login"},{"step":"application_with_company"}]'

# Avec variables d'environnement
API_URL=http://localhost:5002 \
TEST_EMAIL=redacted@example.invalid \
TEST_PASSWORD=password123 \
node tests/user-journey/test-custom-journey.js complete
```

## 📦 Parcours Prédéfinis

### `complete`
Parcours complet de l'inscription à la gestion complète :
- Inscription → Validation Email → Connexion → Profil
- Candidature avec Entreprise → Contact → Relance → Entretien
- Appels → Mise à jour statuts

### `registration_flow`
Parcours d'inscription :
- Inscription → Validation Email → Connexion → Profil

### `application_flow`
Parcours de candidature :
- Connexion → Candidature → Contact → Relance → Entretien → Statut

### `rejection_flow`
Parcours de rejet :
- Connexion → Candidature → Entretien → Rejet

### `call_flow`
Parcours d'appels :
- Connexion → Candidature → Contact → Appel Entreprise → Appel Contact

## 🔧 Structure des Modules

Chaque module d'étape suit cette structure :

```javascript
async function stepXxx(options = {}) {
  const startTime = Date.now();
  let result = {
    step: 'xxx',
    name: 'Nom de l\'étape',
    status: 'pending',
    duration: 0,
    data: null,
    error: null,
    verifications: [] // Optionnel : vérifications automatiques
  };

  try {
    // Logique de l'étape
    // ...
    
    result.status = 'success';
    result.message = '✅ Message de succès';
  } catch (error) {
    result.status = 'error';
    result.error = error.message;
  }

  return result;
}
```

## 📊 Format des Résultats

Chaque étape retourne un objet avec :

```javascript
{
  step: 'step_id',
  name: 'Nom de l\'étape',
  status: 'success' | 'error' | 'warning' | 'skipped',
  duration: 123, // en millisecondes
  message: 'Message descriptif',
  data: {
    // Données spécifiques à l'étape
  },
  error: 'Message d\'erreur si applicable',
  verifications: [
    {
      check: 'Nom de la vérification',
      status: 'success' | 'error' | 'warning',
      message: 'Message de vérification'
    }
  ]
}
```

## 🔄 Contexte Partagé

Le système maintient un contexte partagé entre les étapes :

```javascript
{
  token: 'token_d_authentification',
  email: 'redacted@example.invalid',
  password: 'password',
  userId: 'user_id',
  applicationId: 'application_id',
  companyId: 'company_id',
  contactId: 'contact_id',
  interviewId: 'interview_id'
}
```

Chaque étape peut utiliser les données des étapes précédentes via ce contexte.

## 🧪 Tests de Cas de Figure

### Cas de Succès
- Toutes les étapes avec données valides
- Parcours complets sans erreur

### Cas d'Échec
- Étapes avec données invalides
- Étapes sans token (skipped)
- Étapes avec IDs manquants

### Cas Limites
- Validation email sans token
- Appel contact sans contact existant
- Rejet sans entretien

## 📝 Exemples

### Exemple 1 : Parcours Simple
```javascript
const steps = [
  { step: 'login' },
  { step: 'application_with_company' },
  { step: 'application_status', options: { newStatus: 'INTERVIEW_SCHEDULED' } }
];
```

### Exemple 2 : Parcours avec Vérifications
```javascript
const steps = [
  { step: 'login' },
  { step: 'application_with_company' },
  { step: 'interview', options: { verifyEventCreation: true } },
  { step: 'application_status', options: { verifyStatus: true } }
];
```

### Exemple 3 : Parcours de Rejet
```javascript
const steps = [
  { step: 'login' },
  { step: 'application_with_company' },
  { step: 'interview' },
  { step: 'application_rejected', options: { rejectionReason: 'Profil non adapté' } }
];
```

## 🔗 Intégration

Le système est intégré dans :
- **Frontend** : `/backoffice/user-journey/custom`
- **API** : `/api/user-journey/custom`
- **Scripts** : `tests/user-journey/test-custom-journey.js`

## 📚 Documentation Complémentaire

- [Guide Tests Parcours](../../docs/development/GUIDE_TESTS_PARCOURS.md)
- [User Journey README](../../docs/user-journey/README.md)

