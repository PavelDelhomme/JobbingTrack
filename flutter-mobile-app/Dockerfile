# Utilise l'image Flutter officielle
FROM cirrusci/flutter:stable

# Définit le répertoire de travail
WORKDIR /app

# Copie les fichiers pubspec.yaml et pubspec.lock
COPY pubspec.yaml pubspec.lock ./

# Télécharge les dépendances Flutter
RUN flutter pub get

# Copie le reste du code source
COPY . .

# Crée le répertoire web pour Flutter
RUN mkdir -p web

# Crée un fichier index.html basique pour Flutter web
RUN echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>JobbingTrack Flutter</title></head><body><div id="flutter_app">Loading...</div><script src="main.dart.js" type="application/javascript"></script></body></html>' > web/index.html

# Construit l'application Flutter pour le web
RUN flutter build web

# Expose le port pour le serveur web
EXPOSE 8080

# Démarre un serveur HTTP pour servir l'application web Flutter
CMD ["python3", "-m", "http.server", "8080", "-d", "build/web"]
