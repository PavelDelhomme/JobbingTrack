# Version finale qui marche
FROM node:20-slim

# Installer les dépendances système minimales
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

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