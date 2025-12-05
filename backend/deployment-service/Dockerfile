FROM node:20.18.0

WORKDIR /app

# Mettre à jour npm vers la version 11.6.4
RUN npm install -g npm@11.6.4

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
RUN groupadd -g 1001 nodejs || true
RUN useradd -u 1001 -g nodejs -s /bin/bash -m nextjs || true

# Changer les permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3016

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/healthcheck.js

CMD ["npm", "start"]
