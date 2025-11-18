# 🚀 DÉMARRAGE RAPIDE - JOBBINGTRACK

> **⚠️ IMPORTANT** : Ce projet utilise **uniquement Docker** et les **commandes Makefile**.  
> Aucune installation manuelle de Node.js, npm, ou dépendances n'est nécessaire.

---

## ⚡ INSTALLATION COMPLÈTE (Première fois)

### Option 1 : Setup Automatique (Recommandé)

```bash
# Depuis la racine du projet
make setup
```

Cette commande va automatiquement :
- ✅ Vérifier/installer Docker si nécessaire
- ✅ Proposer d'installer les polices d'emojis (recommandé)
- ✅ Démarrer tous les services Docker
- ✅ Appliquer les migrations Prisma
- ✅ Créer l'utilisateur administrateur

**Identifiants par défaut** :
- 📧 Email : `admin@jobbingtrack.com`
- 🔑 Password : `password123`

### Option 2 : Installation Manuelle (Étape par étape)

```bash
# 1. Installer Docker (si nécessaire)
make install-docker

# 2. Installer les emojis (optionnel mais recommandé)
make install-emojis

# 3. Démarrer tous les services
make up-full

# 4. Attendre 30 secondes pour l'initialisation
# (les services démarrent automatiquement)

# 5. Appliquer les migrations Prisma
make db-push-all

# 6. Créer l'utilisateur admin
make create-admin-user
```

---

## 🚀 DÉMARRER L'APPLICATION

### Démarrer tous les services

```bash
# Depuis la racine du projet
make up-full
```

**Services démarrés** :
- ✅ PostgreSQL (base de données)
- ✅ Redis (cache)
- ✅ API Gateway (port 3000)
- ✅ Tous les microservices backend
- ✅ Frontend Next.js (port 8080)
- ✅ Monitoring (Prometheus, Grafana, etc.)

### Accéder à l'application

**Frontend Web** :
- 🌐 URL : http://localhost:8080
- 🔐 Admin : `admin@jobbingtrack.com` / `password123`

**API Gateway** :
- 🌐 URL : http://localhost:3000
- 📡 Health : http://localhost:3000/health

**Monitoring** :
- 📊 Prometheus : http://localhost:9090
- 📈 Grafana : http://localhost:3013 (admin/admin123)
- 📊 Metrics Aggregator : http://localhost:8014

---

## 🛑 ARRÊTER L'APPLICATION

```bash
# Arrêter tous les services
make down
```

---

## 🔄 REDÉMARRER L'APPLICATION

```bash
# Redémarrer tous les services
make restart
```

---

## 📱 APPLICATION MOBILE FLUTTER

### Prérequis

```bash
# Vérifier que Flutter est installé
flutter doctor

# Installer les dépendances
cd mobile
flutter pub get
```

### Lancer l'application

```bash
# Depuis le dossier mobile/
flutter run
```

**⚠️ Important** : Le backend doit être démarré (`make up-full`) pour que l'application mobile fonctionne.

**Configuration API** :
- Pour Android Emulator : `http://10.0.2.2:3000`
- Pour iOS Simulator : `http://localhost:3000`
- Pour appareil physique : `http://<IP_LOCALE>:3000`

---

## 🧪 EXÉCUTER LES TESTS

### Tests de Parcours Utilisateur

```bash
# Depuis la racine du projet
make tests-user-journey
```

### Interface Web de Tests

```bash
# Démarrer les services pour tests
make up-for-tests

# Ouvrir dans le navigateur
# http://localhost:8080/backoffice/user-journey
```

### Tests Automatisés (Playwright)

```bash
# Voir l'aide complète des tests
make tests-help

# Reset complet pour tests
make tests-reset

# Lancer les tests
make tests-user-journey
```

---

## 🗄️ GESTION BASE DE DONNÉES

### Migrations Prisma

```bash
# Synchroniser tous les schémas Prisma
make db-push-all

# Appliquer les migrations
make db-migrate

# Migrations + redémarrage services
make migrate-restart
```

### Reset Base de Données

```bash
# ⚠️ ATTENTION : Efface toutes les données
make db-reset
```

### Sauvegarder la Base de Données

```bash
# Créer une sauvegarde
make db-backup
```

---

## 🔍 DIAGNOSTIC ET SANTÉ

### Vérifier l'état des services

```bash
# Statut détaillé de tous les services
make status

# Vérifier la santé des services
make health

# Diagnostic complet
make diagnostic
```

### Voir les logs

```bash
# Tous les logs
make logs

# Logs d'un service spécifique
make logs-service SERVICE=frontend
make logs-service SERVICE=auth-service
```

---

## 📊 COMMANDES ESSENTIELLES

### Démarrage
```bash
make up              # Services essentiels
make up-full         # Tous les services
make up-for-tests    # Services pour tests
```

### Arrêt
```bash
make down            # Arrêter tous les services
make stop-service SERVICE=x  # Arrêter un service
```

### Redémarrage
```bash
make restart         # Redémarrer services actifs
make restart-service SERVICE=x  # Redémarrer un service
```

### Base de Données
```bash
make db-push-all     # Synchroniser schémas Prisma
make db-migrate      # Appliquer migrations
make db-seed         # Insérer données test
```

### Tests
```bash
make tests-help      # Aide complète
make tests-reset     # Reset pour tests
make tests-user-journey  # Tests parcours utilisateur
```

### Aide
```bash
make help            # Aide générale
make help-services   # Aide services
make help-database   # Aide base de données
make help-tests      # Aide tests
```

---

## 🆘 PROBLÈMES COURANTS

### Les services ne démarrent pas ?

```bash
# Vérifier Docker
docker ps

# Vérifier les logs
make logs

# Diagnostic complet
make diagnostic
```

### Erreur de base de données ?

```bash
# Réinitialiser la base de données
make db-reset
make db-push-all
```

### Le frontend ne s'affiche pas ?

```bash
# Vérifier que le service frontend est démarré
make status

# Voir les logs du frontend
make logs-service SERVICE=frontend

# Redémarrer le frontend
make restart-service SERVICE=frontend
```

### L'application mobile ne se connecte pas ?

```bash
# Vérifier que le backend est démarré
make up-full

# Vérifier l'URL dans mobile/lib/services/api_service.dart
# Pour Android Emulator: http://10.0.2.2:3000
# Pour iOS Simulator: http://localhost:3000
# Pour appareil physique: http://<IP_LOCALE>:3000
```

---

## 📚 DOCUMENTATION COMPLÈTE

- 📖 **[README.md](../../README.md)** - Documentation principale
- 📊 **[STATUS.md](../../STATUS.md)** - État du projet et priorités
- 📜 **[HISTORIQUE.md](../../HISTORIQUE.md)** - Historique des réalisations
- 🧭 **[Navigation Documentation](../navigation.md)** - Navigation complète
- 📋 **[Index Documentation](../INDEX_DOCUMENTATION.md)** - Index de la documentation

---

## 🎉 C'EST TOUT !

**L'application est maintenant prête à être utilisée !**

Tout fonctionne via Docker et les commandes Makefile. Aucune installation manuelle nécessaire.

**Bon développement ! 🚀**

---

**Date** : 2025-11-17  
**Version** : 1.0.1  
**Statut** : ✅ Production Ready
