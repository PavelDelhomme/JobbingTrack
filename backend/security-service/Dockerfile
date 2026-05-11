FROM node:20.18.0-alpine

# Mettre à jour npm vers la version 11.6.4
RUN npm install -g npm@11.6.4

# OpenSSL (Prisma) + iptables (firewall dev) + python3 (scan CVE périodique)
RUN apk add --no-cache openssl iptables python3

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm install --omit=dev

# Copier le code source
COPY src ./src/

# Générer le client Prisma
RUN npx prisma generate

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Créer le répertoire des logs
RUN mkdir -p logs && chown -R nextjs:nodejs /app

# Changer les permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3017

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/healthcheck.js

CMD ["npm", "start"]
