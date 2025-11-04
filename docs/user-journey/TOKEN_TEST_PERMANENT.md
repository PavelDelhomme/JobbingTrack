# 🔑 Système de Token de Test Permanent - User Journey

**Date** : 2025-11-04  
**Statut** : ✅ Implémenté

---

## 🎯 Objectif

Créer un système de token permanent dédié aux tests user-journey, séparé du token d'authentification normal, pour éviter les problèmes d'expiration lors des tests.

---

## 🔧 Fonctionnement

### Token Normal (7 jours)
- Utilisé pour la navigation normale dans le backoffice
- Expire après 7 jours
- Stocké dans localStorage
- Utilisé pour toutes les pages administratives

### Token de Test (Permanent - 100 ans)
- **Réservé exclusivement aux tests user-journey**
- N'expire pratiquement jamais (100 ans)
- Généré uniquement par les SUPER_ADMIN
- Stocké séparément dans localStorage (`test_token`)
- Identifié par le flag `testToken: true` dans le payload JWT

---

## 🚀 Utilisation

### 1. Générer un Token de Test

#### Via API (Requête HTTP)
```bash
# D'abord, connectez-vous pour obtenir un token normal
curl http://localhost:8080/api/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@jobbingtrack.test",
    "password": "password123"
  }'

# Utilisez le token reçu pour générer un token de test permanent
curl http://localhost:8080/api/v1/auth/generate-test-token \
  -X POST \
  -H "Authorization: Bearer VOTRE_TOKEN_NORMAL"
```

#### Via Interface User-Journey
1. Ouvrez `http://localhost:8080/backoffice/user-journey`
2. Connectez-vous avec votre compte SUPER_ADMIN
3. Cliquez sur le bouton **"Générer Token de Test"**
4. Le token permanent sera automatiquement enregistré
5. Tous les tests utiliseront désormais ce token

---

## 📊 Différences Token Normal vs Token de Test

| Caractéristique | Token Normal | Token de Test |
|----------------|--------------|---------------|
| **Expiration** | 7 jours | 100 ans (permanent) |
| **Usage** | Navigation backoffice | Tests user-journey uniquement |
| **Stockage** | `localStorage.token` | `localStorage.test_token` |
| **Génération** | Login classique | Endpoint dédié `/generate-test-token` |
| **Accès** | Tous les utilisateurs | SUPER_ADMIN uniquement |
| **Flag JWT** | - | `testToken: true` |

---

## 🔐 Sécurité

### Restrictions
- ✅ Seuls les SUPER_ADMIN peuvent générer des tokens de test
- ✅ Le token de test est identifié dans le payload JWT
- ✅ Recommandation : Ne jamais utiliser en production
- ✅ Le token de test ne remplace pas le token normal dans le backoffice

### Vérification SUPER_ADMIN
```javascript
// Dans backend/auth-service/src/controllers/auth.controller.js
if (!user || user.role !== 'SUPER_ADMIN') {
  return res.status(403).json({
    success: false,
    error: 'Accès réservé aux super administrateurs'
  });
}
```

---

## 💻 Implémentation Technique

### Backend - Génération du Token

**Fichier** : `backend/auth-service/src/controllers/auth.controller.js`

```javascript
const generateTestToken = async (req, res) => {
  // Vérification SUPER_ADMIN
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Accès réservé aux super administrateurs'
    });
  }

  // Génération du token permanent
  const testToken = jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      role: user.role,
      testToken: true // ⭐ Marqueur important
    },
    process.env.JWT_SECRET,
    { expiresIn: '100y' } // ⭐ Permanent
  );

  res.json({
    success: true,
    testToken,
    expiresIn: '100 ans (permanent)'
  });
};
```

### Route API

**Fichier** : `backend/auth-service/src/routes/auth.routes.js`

```javascript
// ✅ SUPER_ADMIN - Générer un token de test permanent
router.post('/generate-test-token', authenticate, authController.generateTestToken);
```

### Frontend - Utilisation dans User-Journey

**Fichier** : `frontend/src/app/(admin)/backoffice/user-journey/page.tsx`

```typescript
// État pour le token de test
const [testToken, setTestToken] = useState<string | null>(null);

// Charger le token de test depuis localStorage
useEffect(() => {
  const savedTestToken = localStorage.getItem('test_token');
  if (savedTestToken) {
    setTestToken(savedTestToken);
  }
}, []);

// Générer un nouveau token de test
const generateTestToken = async () => {
  const normalToken = localStorage.getItem('token');
  const response = await fetch('/api/v1/auth/generate-test-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${normalToken}`
    }
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('test_token', data.testToken);
    setTestToken(data.testToken);
  }
};

// Utiliser le token de test dans les requêtes
const token = testToken || localStorage.getItem('token');
const response = await fetch('/api/v1/applications', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 🧪 Tests

### Test Manuel
```bash
# 1. Connectez-vous
TOKEN=$(curl -s http://localhost:8080/api/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jobbingtrack.test","password":"password123"}' \
  | jq -r '.token')

# 2. Générez un token de test
TEST_TOKEN=$(curl -s http://localhost:8080/api/v1/auth/generate-test-token \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.testToken')

# 3. Utilisez le token de test
curl http://localhost:8080/api/v1/applications \
  -H "Authorization: Bearer $TEST_TOKEN"
```

### Script de Vérification
Le script `scripts/verify-user-journey.sh` peut être modifié pour utiliser le token de test :

```bash
# Générer et utiliser le token de test
TEST_TOKEN=$(generate_test_token)
curl http://localhost:8080/api/v1/applications \
  -H "Authorization: Bearer $TEST_TOKEN"
```

---

## 📝 Avantages

### ✅ Avantages
1. **Plus d'erreurs "Token expiré"** durant les tests
2. **Token séparé** ne perturbe pas la session normale
3. **Sécurisé** - Réservé aux SUPER_ADMIN
4. **Pratique** - Généré une seule fois, utilisable indéfiniment
5. **Traçable** - Flag `testToken: true` dans le JWT

### ⚠️ Limitations
1. Ne doit **jamais** être utilisé en production
2. Doit être regénéré si la clé JWT change (`JWT_SECRET`)
3. Réservé aux SUPER_ADMIN uniquement

---

## 🔄 Workflow Recommandé

```
1. Super Admin se connecte normalement
   ↓
2. Super Admin génère un token de test (une seule fois)
   ↓
3. Token de test stocké dans localStorage.test_token
   ↓
4. Page user-journey utilise automatiquement le token de test
   ↓
5. Tests s'exécutent sans problème d'expiration ✅
```

---

## 🆘 Résolution de Problèmes

### Problème : "Token invalide ou expiré"
**Solution** : Régénérez le token de test depuis la page user-journey

### Problème : "Accès réservé aux super administrateurs"
**Solution** : Vérifiez que vous êtes connecté avec un compte SUPER_ADMIN

### Problème : Le token de test ne fonctionne pas
**Solution** : 
1. Vérifiez que le token est bien stocké : `localStorage.getItem('test_token')`
2. Vérifiez que le middleware accepte le token
3. Redémarrez auth-service : `docker restart jobbingtrack-auth-service`

---

## 📚 Fichiers Modifiés

1. `backend/auth-service/src/controllers/auth.controller.js` - Ajout de `generateTestToken`
2. `backend/auth-service/src/routes/auth.routes.js` - Ajout de la route `/generate-test-token`
3. `frontend/src/app/(admin)/backoffice/user-journey/page.tsx` - Gestion du token de test

---

## 🎉 Résultat

**Avant** : ❌ Erreurs "Token invalide ou expiré" pendant les tests  
**Après** : ✅ Tests s'exécutent sans interruption avec le token permanent

---

**Pour utiliser dès maintenant** :
1. Ouvrez http://localhost:8080/backoffice/user-journey
2. Cliquez sur "Générer Token de Test"
3. Lancez vos tests !

**✨ Fini les problèmes de token expiré !**

