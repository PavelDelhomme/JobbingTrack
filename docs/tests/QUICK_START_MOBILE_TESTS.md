# 🚀 Démarrage Rapide - Tests Mobile

Guide pour lancer les tests E2E mobile (Playwright) depuis le frontend. Documentation centralisée : ce fichier est la référence ; une redirection existe dans `frontend/QUICK_START_MOBILE_TESTS.md`.

[← Retour aux tests](README.md) | [Index doc](../INDEX.md)

---

## ⚠️ Problème de Permissions npm

Si vous rencontrez une erreur `EACCES` lors de `npm install`, voici les solutions :

### Solution 1 : Corriger les permissions (Recommandé)

```bash
cd frontend
# Supprimer le dossier problématique
rm -rf node_modules/@adobe

# Réinstaller
npm install --legacy-peer-deps
```

### Solution 2 : Utiliser Docker

```bash
# Lancer les tests dans un conteneur Docker
docker-compose -f frontend/docker-compose.test.yml up --build
```

### Solution 3 : Installer Playwright globalement

```bash
npm install -g @playwright/test
npx playwright install chromium
```

---

## 🧪 Lancer les Tests

### Méthode 1 : Script Direct

```bash
cd frontend
npx playwright test tests/e2e/mobile --config=playwright.mobile.config.ts --project="iPhone 13 Pro"
```

### Méthode 2 : Interface CLI

```bash
cd frontend
node scripts/test-mobile-cli.js
```

### Méthode 3 : Script Bash

```bash
cd frontend
./scripts/test-mobile-interactive.sh
```

### Méthode 4 : NPM Script

```bash
cd frontend
npm run test:e2e:mobile:all
```

---

## ✅ Vérifications Préalables

1. **Services démarrés** :
   ```bash
   # Frontend
   curl http://localhost:5003
   
   # API Gateway
   curl http://localhost:5002/health
   ```

2. **Playwright installé** :
   ```bash
   cd frontend
   npm list @playwright/test
   npx playwright --version
   ```

3. **Navigateurs installés** :
   ```bash
   npx playwright install chromium
   ```

---

## 🐛 Dépannage

### Erreur "Cannot find module '@playwright/test'"

```bash
cd frontend
npm install @playwright/test --save-dev
```

### Erreur "playwright: commande introuvable"

Utilisez `npx playwright` au lieu de `playwright` directement.

### Erreur de permissions npm

```bash
# Vérifier les permissions
ls -la frontend/node_modules

# Corriger si nécessaire (avec prudence)
sudo chown -R $USER:$USER frontend/node_modules
```

---

## 📊 Voir les Rapports

```bash
cd frontend
npx playwright show-report playwright-report-mobile
```

---

**Note** : Si les problèmes persistent, utilisez Docker pour isoler l'environnement.
