FROM node:20.18.0-alpine

WORKDIR /app

# Mettre à jour npm vers la version 11.6.4
RUN npm install -g npm@11.6.4

# Installer Docker CLI et outils de diagnostic
RUN apk add --no-cache docker-cli curl netcat-openbsd wget

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
