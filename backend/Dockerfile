# Multi-stage Dockerfile optimisé pour vitesse
FROM node:18-alpine as base

# Installer OpenSSL pour corriger Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# =============================
# Stage de dépendances (cacheable)
FROM base as deps

# Copier seulement les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances avec cache npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production && npm cache clean --force

# Installer Prisma globalement 
RUN npm install -g prisma

# Générer le client Prisma
RUN npx prisma generate

# =============================
# Stage de développement
FROM base as dev

# Copier les node_modules du stage deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /usr/local/lib/node_modules ./node_modules
COPY --from=deps /root/.npm /root/.npm

# Copier le code source
COPY . .

# Créer dossier uploads
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

# Créer utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Commande pour développement
CMD ["npm", "run", "dev"]