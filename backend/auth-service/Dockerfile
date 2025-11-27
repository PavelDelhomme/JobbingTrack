FROM node:20.18.0-alpine

WORKDIR /app

# Installer les dépendances système nécessaires pour Prisma et DNS
# Ajouter Python 3 pour le service d'envoi d'emails
RUN apk add --no-cache openssl bind-tools python3 py3-pip

# Installer Prisma CLI
RUN npm install -g prisma

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (inclure dev pour nodemon en développement)
RUN npm install

# Copier le schéma Prisma
COPY prisma ./prisma/

# Générer le client Prisma
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy?schema=public"
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
EXPOSE 3001

# Commande de démarrage
CMD ["npm", "start"]
