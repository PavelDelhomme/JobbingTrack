FROM node:20.18.0

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY src/ ./src/

# Créer un utilisateur non-root pour la sécurité
RUN groupadd -r nodejs -g 1001 && \
    useradd -r -u 1001 -g nodejs -s /sbin/nologin -c "Metrics user" metrics

# Changer la propriété des fichiers
RUN chown -R metrics:nodejs /app
USER metrics

# Exposer le port
EXPOSE 3014

# Démarrer l'application
CMD ["npm", "start"]
