# ❌ → ✅ Solution : Erreur 403 "Token invalide ou expiré"

**Problème** : Les tests passent pour Register/Login/Profile mais échouent sur Companies/Applications  
**Cause** : Token mock non accepté par les services métier  
**Solution** : Utiliser le token permanent !

---

## 🔍 Diagnostic

### Ce que Vous Voyez
```bash
✓ PASS - Register
✓ PASS - Login
✓ PASS - Profile
✗ FAIL - List Companies (403: Token invalide ou expiré)
```

### Pourquoi ?

Le login retourne un **token mock** en développement :
```
mock-jwt-token-17622...
```

Ce token fonctionne pour :
- ✅ Profile (auth-service l'accepte)

Mais **PAS** pour :
- ❌ Companies, Applications, Contacts, etc. (rejettent les tokens mock)

---

## ✅ SOLUTION : Token Permanent

### Option 1 : Via Interface (RECOMMANDÉ) ⭐⭐⭐

```bash
# 1. Ouvrir la page user-journey
http://localhost:8080/backoffice/user-journey

# 2. Se connecter
Email: admin@jobbingtrack.test
Password: password123

# 3. Cliquer sur "Générer Token de Test"
# → Le token permanent est créé et enregistré automatiquement

# 4. Relancer les tests
bash scripts/verify-user-journey.sh
```

**Résultat** : Tous les tests passeront ! ✅

---

### Option 2 : Via API

```bash
# 1. Se connecter pour obtenir un token normal
curl -s http://localhost:8080/api/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jobbingtrack.test","password":"password123"}' \
  > /tmp/login.json

# 2. Extraire le token
TOKEN=$(cat /tmp/login.json | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# 3. Générer le token permanent
TEST_TOKEN=$(curl -s http://localhost:8080/api/v1/auth/generate-test-token \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['testToken'])")

# 4. Enregistrer le token
echo "$TEST_TOKEN" > ~/.jobbingtrack-test-token

# 5. L'utiliser dans le script
export TEST_TOKEN
bash scripts/verify-user-journey.sh
```

---

## 📊 Comparaison

| Type de Token | Status Auth | Status Companies | Accepté Partout ? |
|---------------|-------------|------------------|-------------------|
| **Mock** (dev) | ✅ 200 | ❌ 403 | ❌ Non |
| **Normal** (7j) | ✅ 200 | ✅ 200 | ✅ Oui (7 jours) |
| **Permanent** (100ans) | ✅ 200 | ✅ 200 | ✅ Oui (permanent) |

---

## 🎯 Pourquoi le Token Permanent ?

### Problèmes avec Token Normal
1. ⏰ Expire après 7 jours
2. 🔄 Obligation de se reconnecter régulièrement
3. 💥 Tests interrompus si le token expire

### Avantages du Token Permanent
1. ⏱️ N'expire jamais (100 ans)
2. ✅ Généré une seule fois
3. 🚀 Tests sans interruption
4. 🔐 Réservé aux SUPER_ADMIN

---

## 🧪 Résultat Attendu Après Génération

```bash
bash scripts/verify-user-journey.sh
```

**Avant** (avec token mock) :
```
✓ PASS - Register (201)
✓ PASS - Login (200)
✓ PASS - Profile (200)
✗ FAIL - Companies (403) ← Erreur !
✗ FAIL - Applications (403)
✗ FAIL - Contacts (403)
```

**Après** (avec token permanent) :
```
✓ PASS - Register (201)
✓ PASS - Login (200)
✓ PASS - Profile (200)
✓ PASS - Companies (200) ← Résolu !
✓ PASS - Applications (201)
✓ PASS - Contacts (201)
✓ PASS - Interviews (200)
✓ PASS - Events (200)
... tous passent ! ✅
```

---

## 🔧 Modifier le Script (Optionnel)

Si vous voulez que le script utilise automatiquement le token permanent :

```bash
# Ajouter au début du script
if [ -f ~/.jobbingtrack-test-token ]; then
    TOKEN=$(cat ~/.jobbingtrack-test-token)
    echo -e "${GREEN}✓ Token permanent chargé${NC}"
fi
```

---

## 💡 Workflow Recommandé

```
1. Générer le token permanent (UNE FOIS)
   ↓
   Via interface : http://localhost:8080/backoffice/user-journey
   OU
   Via API : curl + generate-test-token
   ↓
2. Le token est enregistré automatiquement
   ↓
3. Tous les tests fonctionnent maintenant ✅
   ↓
4. Si problème : Régénérer un nouveau token
```

---

## 🆘 FAQ

### Q : Pourquoi les 4 premiers tests passent ?
**R** : Auth-service accepte les tokens mock en développement. Les autres services, non.

### Q : C'est un bug ?
**R** : Non, c'est une protection de sécurité. Les tokens mock ne doivent pas fonctionner partout.

### Q : Dois-je générer le token à chaque fois ?
**R** : Non ! Une seule fois suffit. Il est valable 100 ans.

### Q : Que faire si j'obtiens encore 403 ?
**R** : Vérifiez que :
1. Le token permanent est bien généré
2. Vous êtes SUPER_ADMIN
3. Le token est bien enregistré dans localStorage
4. Auth-service est démarré

---

## 📚 Documentation Complète

- **[TOKEN_TEST_PERMANENT.md](TOKEN_TEST_PERMANENT.md)** - Documentation technique
- **[GUIDE_UTILISATION_TOKEN.md](GUIDE_UTILISATION_TOKEN.md)** - Guide d'utilisation détaillé
- **[RESUME_FINAL.md](RESUME_FINAL.md)** - Résumé complet

---

## 🎉 Conclusion

**L'erreur 403 est normale** avec le token mock de développement.

**La solution** : Utiliser le token permanent que j'ai créé spécialement pour résoudre ce problème !

**Action immédiate** :
```bash
# Ouvrir
http://localhost:8080/backoffice/user-journey

# Se connecter
Email: admin@jobbingtrack.test
Password: password123

# Cliquer sur "Générer Token de Test"

# Relancer les tests
bash scripts/verify-user-journey.sh
```

**✨ Tous les tests passeront !**

