FROM node:20.20.0-alpine

WORKDIR /app

# Installer Docker CLI pour gérer les conteneurs
RUN apk add --no-cache docker-cli

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3000

# Commande de démarrage (en tant que root pour accès Docker socket en dev)
CMD ["npm", "start"]
