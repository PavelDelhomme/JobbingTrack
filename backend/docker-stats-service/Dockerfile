FROM node:20.19.5-alpine

WORKDIR /app

# Installer Docker CLI pour accéder aux statistiques
RUN apk add --no-cache docker-cli

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3015

# Commande de démarrage
CMD ["npm", "start"]
