FROM node:20-alpine

# Installer les dépendances système nécessaires pour Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Installer Prisma CLI
RUN npm install -g prisma

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le code source complet
COPY . .

# Générer le client Prisma APRÈS avoir copié tout le code
RUN npx prisma generate

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Changer les permissions
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exposer le port
EXPOSE 3001

# Commande de démarrage
CMD ["npm", "start"]
