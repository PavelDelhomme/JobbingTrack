# Version finale qui marche
FROM node:18-alpine

# Installer les dépendances système
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Copier le schéma Prisma
COPY prisma ./prisma/

# Installer les dépendances
RUN npm install

# Générer le client Prisma
RUN npx prisma generate

# Copier le reste de l'application
COPY . .

# Créer le dossier uploads
RUN mkdir -p uploads && chmod 755 uploads

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "run", "dev"]