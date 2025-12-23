FROM node:20.18.0-alpine

# Mettre à jour npm vers la version 11.6.4
RUN npm install -g npm@11.6.4

# Installer les dépendances système nécessaires pour Prisma et health checks
RUN apk add --no-cache openssl wget

WORKDIR /app

# Installer Prisma CLI
RUN npm install -g prisma

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le schéma Prisma
COPY prisma ./prisma/

# Générer le client Prisma
RUN npx prisma generate

# Copier le code source
COPY . .

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Changer les permissions
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exposer le port
EXPOSE 3013

# Commande de démarrage
CMD ["npm", "start"]
