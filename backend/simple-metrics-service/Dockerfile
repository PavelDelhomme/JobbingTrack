# Simple Metrics Service Dockerfile
FROM node:20.19.5-alpine

# Créer le répertoire de l'application
WORKDIR /app

# Installer les dépendances système nécessaires
RUN apk add --no-cache curl

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY src/ ./src/

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Changer les permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Exposer le port
EXPOSE 3014

# Démarrer le serveur
CMD ["npm", "start"]
