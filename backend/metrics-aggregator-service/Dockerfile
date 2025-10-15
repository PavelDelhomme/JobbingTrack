FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY src/ ./src/

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S metrics -u 1001

# Changer la propriété des fichiers
RUN chown -R metrics:nodejs /app
USER metrics

# Exposer le port
EXPOSE 3014

# Démarrer l'application
CMD ["npm", "start"]
