FROM node:20.18.0

WORKDIR /app

# Installer Docker CLI pour accéder aux stats des conteneurs
RUN apt-get update && \
    apt-get install -y ca-certificates curl gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

# Copier les fichiers de dépendances
COPY package*.json ./

# Copier le schéma Prisma
COPY prisma ./prisma/

# Installer les dépendances
RUN npm install --omit=dev

# Générer le client Prisma
RUN npx prisma generate

# Copier le code source
COPY src/ ./src/

# Note: Le service tourne en root pour accéder au Docker socket et /proc
# C'est nécessaire pour un service de monitoring système

# Exposer le port
EXPOSE 3014

# Démarrer l'application
CMD ["npm", "start"]
