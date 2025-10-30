# frontend/Dockerfile - VERSION FINALE SANS AUTO-INIT
FROM node:20.18.0-alpine AS base
RUN apk add --no-cache libc6-compat curl dumb-init
WORKDIR /app

# Stage dependencies
FROM base AS deps
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

#RUN \
#  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
#  else npm install; \
#  fi
RUN npm ci --legacy-peer-deps

# ✅ VÉRIFICATION: S'assurer que socket.io-client est bien installé
RUN npm list socket.io-client || echo "⚠️ socket.io-client non trouvé"

# Stage development (pour docker-compose)
FROM base AS development
WORKDIR /app

# Création utilisateur et dossiers avant de copier les fichiers
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Créer les dossiers nécessaires avec bonnes permissions
RUN mkdir -p /app/.next /app/src /app/public /app/node_modules
RUN chown -R nextjs:nodejs /app

# Copier node_modules en tant que root AVEC socket.io-client
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=deps --chown=nextjs:nodejs /app/package-lock.json* ./package-lock.json


# Copier tous les fichiers avec bonnes permissions
COPY --chown=nextjs:nodejs . .
# ⚠️ SUPPRIMER L'AUTO-INIT - Next.js est déjà configuré !

# S'assurer que .next a les bonnnes permissions
RUN chmod 755 /app/.next
RUN chown -R nextjs:nodejs /app/.next

# Variable d'environnement
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_METRICS_URL=http://localhost:8014

# Changer vers utilisateur nextjs
USER nextjs

EXPOSE 3000

# Utiliser dumb-init pour une meilleure gestion des processus
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "dev"]