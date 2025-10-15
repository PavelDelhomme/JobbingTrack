# 🟢 Guide Version Node.js Spécifique - JobbingTrack

## 🎯 Version Node.js requise

**Version Node.js : `20.19.5`**  
**Version npm : `10.9.0` (recommandée)**

## 🔧 Installation de la version spécifique

### 1. **Avec nvm (recommandé)**

```bash
# Installer nvm si pas déjà fait
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recharger le terminal
source ~/.bashrc

# Installer Node.js 20.19.5
nvm install 20.19.5
nvm use 20.19.5
nvm alias default 20.19.5

# Vérifier l'installation
node --version  # Doit afficher v20.19.5
npm --version   # Doit afficher 10.9.0
```

### 2. **Installation directe**

```bash
# Télécharger Node.js 20.19.5
wget https://nodejs.org/dist/v20.19.5/node-v20.19.5-linux-x64.tar.xz

# Extraire et installer
tar -xf node-v20.19.5-linux-x64.tar.xz
sudo mv node-v20.19.5-linux-x64 /opt/nodejs
sudo ln -s /opt/nodejs/bin/node /usr/local/bin/node
sudo ln -s /opt/nodejs/bin/npm /usr/local/bin/npm

# Vérifier l'installation
node --version  # Doit afficher v20.19.5
npm --version   # Doit afficher 10.9.0
```

## 🧪 Tests de vérification

### 1. **Test local de la version**
```bash
# Vérifier que la version est correcte
./scripts/test-node-version.sh
```

### 2. **Test complet du projet**
```bash
# Tests avec la version spécifique
./scripts/run-all-tests.sh
```

### 3. **Test GitHub Actions**
Le workflow `.github/workflows/test-node-version.yml` vérifie automatiquement :
- ✅ Version Node.js 20.19.5
- ✅ Installation des dépendances
- ✅ Build du frontend

## 📋 Configuration du projet

### 1. **Fichier .nvmrc**
```bash
# Créer le fichier .nvmrc à la racine du projet
echo "20.19.5" > .nvmrc

# Utiliser la version spécifiée
nvm use
```

### 2. **Fichier package.json**
```json
{
  "engines": {
    "node": "20.19.5",
    "npm": ">=10.9.0"
  }
}
```

### 3. **Fichier .github/workflows/ci-cd.yml**
```yaml
env:
  NODE_VERSION: '20.19.5'

steps:
  - name: 🟢 Configuration Node.js (Version spécifique)
    uses: actions/setup-node@v4
    with:
      node-version: ${{ env.NODE_VERSION }}
```

## 🚀 Utilisation en développement

### 1. **Démarrage du projet**
```bash
# Vérifier la version
node --version  # Doit afficher v20.19.5

# Installer les dépendances
cd frontend && npm ci
cd ../backend && npm ci

# Démarrer le projet
make up
```

### 2. **Tests avec la version spécifique**
```bash
# Tests frontend
cd frontend
npm run test:ci

# Tests backend
cd ../backend
npm run test

# Tests complets
./scripts/run-all-tests.sh
```

## 🔍 Vérification de la version

### 1. **Vérification locale**
```bash
# Version Node.js
node --version

# Version npm
npm --version

# Vérification complète
./scripts/test-node-version.sh
```

### 2. **Vérification GitHub Actions**
- Onglet "Actions" → Workflow `🧪 Test Version Node.js Spécifique`
- Vérification automatique de la version 20.19.5

## 🚨 Résolution des problèmes

### Problème : Version Node.js incorrecte
```bash
# Vérifier la version actuelle
node --version

# Si incorrecte, installer la bonne version
nvm install 20.19.5
nvm use 20.19.5
nvm alias default 20.19.5
```

### Problème : npm non trouvé
```bash
# Vérifier l'installation
which node
which npm

# Réinstaller si nécessaire
nvm reinstall 20.19.5
```

### Problème : Dépendances non installées
```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm ci
```

## 📊 Avantages de la version spécifique

### 1. **Cohérence entre environnements**
- ✅ Même version en développement et production
- ✅ Même version sur GitHub Actions
- ✅ Même version pour tous les développeurs

### 2. **Stabilité**
- ✅ Version LTS stable
- ✅ Compatibilité garantie
- ✅ Pas de surprises de version

### 3. **Performance**
- ✅ Optimisations spécifiques à la version
- ✅ Cache npm optimisé
- ✅ Builds plus rapides

## 🎯 Workflow recommandé

### 1. **Avant de commencer**
```bash
# Vérifier la version
./scripts/test-node-version.sh

# Si OK, continuer
./scripts/run-all-tests.sh
```

### 2. **Avant un commit**
```bash
# Tests rapides
cd frontend && npm run test:ci
cd ../backend && npm run test

# Tests complets
./scripts/run-all-tests.sh
```

### 3. **Avant un push**
```bash
# Vérification finale
./scripts/test-node-version.sh

# Push vers GitHub
git push origin main
```

## 📞 Support

### Si la version n'est pas correcte
1. **Vérifier nvm** : `nvm --version`
2. **Réinstaller Node.js** : `nvm install 20.19.5`
3. **Utiliser la version** : `nvm use 20.19.5`
4. **Vérifier** : `node --version`

### Si les tests échouent
1. **Vérifier la version** : `./scripts/test-node-version.sh`
2. **Nettoyer** : `rm -rf node_modules package-lock.json`
3. **Réinstaller** : `npm ci`
4. **Relancer** : `./scripts/run-all-tests.sh`

---

**🎉 Avec Node.js 20.19.5, votre projet JobbingTrack est optimisé et prêt pour la production !**
