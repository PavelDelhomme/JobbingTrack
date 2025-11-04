# Utilise l'image Node.js officielle avec les outils de développement
FROM node:18-alpine

# Définit le répertoire de travail
WORKDIR /app

# Installe les dépendances système nécessaires pour React Native
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Installe React Native CLI globalement
RUN npm install -g @react-native-community/cli

# Copie les fichiers package.json et package-lock.json
COPY package*.json ./

# Installe les dépendances npm
RUN npm ci

# Copie le reste du code source
COPY . .

# Configure les variables d'environnement pour Metro bundler
ENV REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

# Expose le port pour Metro bundler
EXPOSE 8081

# Démarre les deux processus: Metro bundler et serveur web
CMD ["sh", "-c", "node server.js & npx react-native start --host 0.0.0.0 --port 8081"]
