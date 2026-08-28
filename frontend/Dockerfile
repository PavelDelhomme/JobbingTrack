# frontend/Dockerfile - VERSION FINALE SANS AUTO-INIT
FROM node:20.18.0-alpine AS base
# Mettre à jour npm vers la version 11.6.4
RUN npm install -g npm@11.6.4
# Installer les dépendances système nécessaires pour Playwright et health checks
RUN apk add --no-cache \
    libc6-compat \
    curl \
    wget \
    jq \
    python3 \
    dumb-init \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*
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

# ✅ Installation Playwright et navigateurs pour les tests (si @playwright/test est dans package.json)
RUN if grep -q "@playwright/test" package.json; then \
		npx playwright install --with-deps chromium || \
		(npx playwright install chromium || echo "⚠️ Playwright browsers installation skipped"); \
	fi || echo "⚠️ Playwright not in dependencies"

# Stage development (pour docker-compose)
FROM base AS development
WORKDIR /app

# Création utilisateur et dossiers avant de copier les fichiers
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Créer les dossiers nécessaires avec bonnes permissions
RUN mkdir -p /app/.next /app/src /app/public /app/node_modules
RUN chown -R nextjs:nodejs /app

# Copier node_modules en tant que root AVEC socket.io-client et Playwright
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=deps --chown=nextjs:nodejs /app/package-lock.json* ./package-lock.json
# Note: Le cache Playwright sera créé automatiquement au premier run des tests
# Les navigateurs sont déjà installés dans le stage deps et disponibles via node_modules


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
ENV NEXT_PUBLIC_METRICS_URL=http://localhost:5004

# Changer vers utilisateur nextjs
USER nextjs

EXPOSE 3000

# Utiliser dumb-init pour une meilleure gestion des processus
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "dev"]

# Stage production (Portainer / GHCR)
FROM base AS production
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_GATEWAY_URL
ARG NEXT_PUBLIC_AUTH_SERVICE_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_BACKOFFICE_URL
ARG NEXT_PUBLIC_APP_NAME=JobbingTrack
ARG NEXT_PUBLIC_APP_VERSION=1.0.0
ARG NEXT_PUBLIC_METRICS_URL=/api/metrics-aggregator
ARG NEXT_PUBLIC_METRICS_AGGREGATOR_URL=/api/metrics-aggregator
ARG NEXT_PUBLIC_METRICS_VIA_FRONTEND=true
ARG NEXT_PUBLIC_TZ=Europe/Paris

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_API_GATEWAY_URL=${NEXT_PUBLIC_API_GATEWAY_URL}
ENV NEXT_PUBLIC_AUTH_SERVICE_URL=${NEXT_PUBLIC_AUTH_SERVICE_URL}
ENV NEXT_PUBLIC_FRONTEND_URL=${NEXT_PUBLIC_FRONTEND_URL}
ENV NEXT_PUBLIC_BACKOFFICE_URL=${NEXT_PUBLIC_BACKOFFICE_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
ENV NEXT_PUBLIC_METRICS_URL=${NEXT_PUBLIC_METRICS_URL}
ENV NEXT_PUBLIC_METRICS_AGGREGATOR_URL=${NEXT_PUBLIC_METRICS_AGGREGATOR_URL}
ENV NEXT_PUBLIC_METRICS_VIA_FRONTEND=${NEXT_PUBLIC_METRICS_VIA_FRONTEND}
ENV NEXT_PUBLIC_TZ=${NEXT_PUBLIC_TZ}

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=deps --chown=nextjs:nodejs /app/package-lock.json* ./package-lock.json
COPY --chown=nextjs:nodejs . .

RUN npm run build

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "start"]