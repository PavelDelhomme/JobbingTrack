# Dockerfile pour l'API Backend
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Installer Prisma CLI globalement pour les migrations
RUN npm install -g prisma

# Copier le reste du code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Créer le dossier pour les uploads
RUN mkdir -p /app/uploads

# Changer les permissions pour le dossier uploads
RUN chmod 755 /app/uploads

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Changer le propriétaire des fichiers
RUN chown -R nextjs:nodejs /app
USER nextjs

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "run", "dev"]