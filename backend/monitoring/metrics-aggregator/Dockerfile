FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY index.js ./

# Exposer le port
EXPOSE 3015

# Santé du conteneur
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3015/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Démarrer l'application
CMD ["node", "index.js"]
