FROM node:20.18.0

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le code source
COPY src/ ./src/

# Note: Le service tourne en root pour accéder au Docker socket et /proc
# C'est nécessaire pour un service de monitoring système

# Exposer le port
EXPOSE 3014

# Démarrer l'application
CMD ["npm", "start"]
