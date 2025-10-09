FROM node:20-slim

WORKDIR /app

# Installation des dépendances Prisma
RUN apt-get update -y && apt-get install -y openssl

# Copie des fichiers de package
COPY package*.json ./
RUN npm ci --only=production

# Copie du code source
COPY . .

# Génération du client Prisma
RUN npx prisma generate

EXPOSE 3013

CMD ["npm", "start"]
