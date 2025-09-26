#!/bin/bash

echo "🗂️ Réorganisation des fichiers JobbingTrack..."

# Créer la structure si elle n'existe pas
mkdir -p backend/src/{controllers,routes,middlewares,utils,config}
mkdir -p backend/prisma
mkdir -p uploads
touch uploads/.gitkeep

# Déplacer Dockerfile dans backend/
if [ -f "Dockerfile" ]; then
    mv Dockerfile backend/
    echo "✅ Dockerfile déplacé dans backend/"
fi

# Déplacer server.js
if [ -f "server.js" ]; then
    mv server.js backend/src/
    echo "✅ server.js déplacé dans backend/src/"
fi

# Déplacer les contrôleurs
if [ -f "auth.controller.js" ]; then
    mv auth.controller.js backend/src/controllers/
    echo "✅ auth.controller.js déplacé"
fi

if [ -f "application.controller.js" ]; then
    mv application.controller.js backend/src/controllers/
    echo "✅ application.controller.js déplacé"
fi

# Déplacer les routes
if [ -f "auth.routes.js" ]; then
    mv auth.routes.js backend/src/routes/
    echo "✅ auth.routes.js déplacé"
fi

if [ -f "application.routes.js" ]; then
    mv application.routes.js backend/src/routes/
    echo "✅ application.routes.js déplacé"
fi

# Déplacer les middlewares
if [ -f "auth.middleware.js" ]; then
    mv auth.middleware.js backend/src/middlewares/
    echo "✅ auth.middleware.js déplacé"
fi

if [ -f "errorHandler.js" ]; then
    mv errorHandler.js backend/src/middlewares/
    echo "✅ errorHandler.js déplacé"
fi

if [ -f "notFound.js" ]; then
    mv notFound.js backend/src/middlewares/
    echo "✅ notFound.js déplacé"
fi

# Déplacer les utilitaires
if [ -f "logger.js" ]; then
    mv logger.js backend/src/utils/
    echo "✅ logger.js déplacé"
fi

# Déplacer la config
if [ -f "swagger.js" ]; then
    mv swagger.js backend/src/config/
    echo "✅ swagger.js déplacé"
fi

# Déplacer Prisma
if [ -f "prisma-schema.prisma" ]; then
    mv prisma-schema.prisma backend/prisma/schema.prisma
    echo "✅ schema.prisma déplacé"
fi

if [ -f "seed.js" ]; then
    mv seed.js backend/prisma/
    echo "✅ seed.js déplacé"
fi

# Corriger nodemon
if [ -f "nodemon.js" ]; then
    # Créer le bon nodemon.json
    cat > backend/nodemon.json << 'EOF'
{
  "watch": ["src"],
  "ext": "js,json",
  "ignore": ["src/**/*.test.js", "node_modules"],
  "exec": "node src/server.js",
  "env": {
    "NODE_ENV": "development"
  },
  "delay": "2000"
}
EOF
    rm nodemon.js
    echo "✅ nodemon.json créé correctement"
fi

# Gérer les fichiers .env et .gitignore
if [ -f "file.env" ]; then
    mv file.env backend/.env
    echo "✅ .env déplacé dans backend/"
fi

if [ -f "file.gitignore" ]; then
    mv file.gitignore .gitignore
    echo "✅ .gitignore déplacé à la racine"
fi

# Vérifier et corriger package.json
if [ -f "backend/package.json" ]; then
    # Vérifier si le package.json est valide
    if ! node -e "JSON.parse(require('fs').readFileSync('backend/package.json', 'utf8'))" 2>/dev/null; then
        echo "⚠️  package.json invalide, création d'un nouveau..."
        cat > backend/package.json << 'EOF'
{
  "name": "jobbingtrack-api",
  "version": "1.0.0",
  "description": "API REST pour le suivi de candidatures JobbingTrack",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "migrate": "npx prisma migrate dev",
    "migrate:reset": "npx prisma migrate reset --force",
    "migrate:deploy": "npx prisma migrate deploy",
    "generate": "npx prisma generate",
    "studio": "npx prisma studio",
    "seed": "node prisma/seed.js",
    "docker:build": "docker build -t jobbingtrack-api .",
    "docker:run": "docker run -p 3000:3000 jobbingtrack-api",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write \"src/**/*.js\"",
    "logs": "docker-compose logs -f api",
    "clean": "rm -rf node_modules package-lock.json"
  },
  "keywords": ["job", "tracking", "api", "rest", "nodejs", "prisma"],
  "author": "Pavel Delhomme",
  "license": "MIT",
  "dependencies": {
    "@prisma/client": "^5.5.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.1",
    "express-validator": "^7.0.1",
    "helmet": "^7.0.0",
    "joi": "^17.11.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.7",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "eslint": "^8.52.0",
    "jest": "^29.7.0",
    "nodemon": "^3.0.1",
    "prettier": "^3.0.3",
    "prisma": "^5.5.0",
    "supertest": "^6.3.3"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
EOF
        echo "✅ Nouveau package.json créé"
    fi
fi

# Supprimer package-lock.json s'il est cassé
if [ -f "backend/package-lock.json" ]; then
    rm backend/package-lock.json
    echo "✅ package-lock.json supprimé (sera régénéré)"
fi

echo ""
echo "🎉 Réorganisation terminée!"
echo ""
echo "📁 Structure finale:"
echo "JobbingTrack/"
echo "├── backend/"
echo "│   ├── Dockerfile ✅"
echo "│   ├── package.json ✅"
echo "│   ├── nodemon.json ✅"
echo "│   ├── .env ✅"
echo "│   ├── src/"
echo "│   │   ├── server.js ✅"
echo "│   │   ├── controllers/ ✅"
echo "│   │   ├── routes/ ✅"
echo "│   │   ├── middlewares/ ✅"
echo "│   │   ├── utils/ ✅"
echo "│   │   └── config/ ✅"
echo "│   └── prisma/"
echo "│       ├── schema.prisma ✅"
echo "│       └── seed.js ✅"
echo "├── docker-compose.yml ✅"
echo "├── Makefile ✅"
echo "├── .gitignore ✅"
echo "└── uploads/ ✅"
echo ""
echo "🚀 Vous pouvez maintenant lancer:"
echo "   make install"
echo "   make up"