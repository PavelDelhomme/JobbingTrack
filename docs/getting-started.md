## 🧭 Navigation Centrale

### 📖 **Documentation du Projet**
- **[Accueil](/README.md)** | **[Documentation Centralisée](../README.md)**

### 🚀 **Démarrage Rapide**
- **[Guide Installation](/GUIDE-DEMARRAGE-RAPIDE.md)** | **[Guide Développement](/docs/guides/getting-started.md)**

### 📡 **API & Intégration**
- **[Documentation API](/docs/api/v1/endpoints.md)** | **[API Technique](/docs/technical/api.md)**

### 🚀 **Déploiement**
- **[Guide Déploiement](/docs/deployment/GUIDE-PORTAINER.md)** | **[Déploiement Technique](/docs/technical/deployment.md)**

### 🛠️ **Outils Développement**
- **[Scripts et Makefiles](/docs/scripts/makefiles.md)** | **[Documentation Technique](../technical/README.md)**

### 🔧 **Documentation Technique**
- **[Architecture](/docs/technical/architecture.md)** | **[Base de Données](/docs/technical/database.md)** | **[Sécurité](/docs/technical/security.md)** | **[Performance](/docs/technical/performance.md)**

---

# 🚀 Guide de Démarrage JobbingTrack

Guide complet pour bien démarrer avec JobbingTrack - votre plateforme de gestion de candidatures professionnelles.

## 🧭 Navigation Centrale

### 📖 **Documentation du Projet**
- **[Accueil](/README.md)** | **[Documentation Centralisée](../README.md)**

### 🚀 **Démarrage Rapide**
- **[Guide Installation](/GUIDE-DEMARRAGE-RAPIDE.md)** | **[Guide Administration](./administration.md)**

### 📡 **API & Intégration**
- **[Documentation API](/docs/api/v1/endpoints.md)** | **[Documentation Technique](/docs/technical/api.md)**

### 🚀 **Déploiement**
- **[Guide Déploiement](/docs/deployment/GUIDE-PORTAINER.md)** | **[Documentation Déploiement](/docs/technical/deployment.md)**

### 🛠️ **Outils Développement**
- **[Scripts et Makefiles](/docs/scripts/makefiles.md)** | **[Documentation Technique](../technical/README.md)**

---

## 📋 Prérequis

## 📋 Prérequis

### Configuration Système Requise

#### Matériel Minimum
- **Processeur** : 2 cœurs (Intel i3 ou équivalent)
- **Mémoire** : 4 GB RAM
- **Stockage** : 10 GB espace libre
- **Réseau** : Connexion internet stable

#### Logiciels Requis
```bash
# Docker et Docker Compose (obligatoire)
Docker >= 20.10
Docker Compose >= 2.0

# Node.js (optionnel, pour développement)
Node.js >= 20.0

# Git (pour cloner le repository)
Git >= 2.0
```

## 🛠️ Installation

### 1. Clonage du Repository

```bash
# Cloner le repository
git clone https://github.com/PavelDelhomme/JobbingTrack.git
cd JobbingTrack

# Vérifier que vous êtes sur la bonne branche
git branch -a
git checkout feat/frontend-dashboard  # Si nécessaire
```

### 2. Installation Automatique

```bash
# Installation complète en une commande
make install

# Cette commande :
# - Vérifie les dépendances (Docker, Node.js)
# - Crée le fichier .env
# - Configure les variables d'environnement
```

### 3. Démarrage du Projet

```bash
# Démarrer tous les services
make up

# Ou avec reconstruction si nécessaire
make start-all
```

**Attendre 2-3 minutes** que tous les services démarrent complètement.

## 🌐 Accès à l'Application

### Interfaces Disponibles

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:8080 | Interface utilisateur principale |
| **API Gateway** | http://localhost:3000 | API REST complète |
| **API Documentation** | http://localhost:3000/api-docs | Documentation interactive |
| **Admin Dashboard** | http://localhost:8080/backoffice | Interface d'administration |

### Identifiants de Connexion

```
📧 Email : admin@jobbingtrack.com
🔐 Mot de passe : SuperAdmin123!
```

## 🎯 Premier Démarrage

### 1. Connexion Initiale

1. **Ouvrez** http://localhost:8080 dans votre navigateur
2. **Cliquez sur** "Se connecter"
3. **Saisissez** les identifiants ci-dessus
4. **Explorez** le tableau de bord

### 2. Découverte de l'Interface

#### Navigation Principale
- **📊 Dashboard** : Vue d'ensemble et statistiques
- **📝 Candidatures** : Gestion de vos candidatures
- **🏢 Entreprises** : Base de données des entreprises
- **👥 Contacts** : Carnet d'adresses professionnel
- **📅 Entretiens** : Planning et suivi des entretiens
- **⚙️ Paramètres** : Configuration et personnalisation

#### Fonctionnalités Clés
- **🔍 Recherche globale** : Recherchez dans tous les modules
- **📱 Mode hors ligne** : Utilisation sans connexion internet
- **🎨 Personnalisation** : Thèmes et préférences utilisateur
- **🔗 Intégrations** : LinkedIn, calendriers externes

## 📚 Utilisation Quotidienne

### Gestion des Candidatures

#### 1. Créer une Candidature
```typescript
// Via l'interface web
1. Aller dans "Candidatures" → "Nouvelle candidature"
2. Remplir le formulaire avec :
   - Titre du poste
   - Entreprise (créer si nécessaire)
   - Description et notes
   - Statut (Brouillon, Envoyée, En cours, etc.)
3. Sauvegarder
```

#### 2. Suivi des Candidatures
- **Statuts** : Draft → Sent → In Review → Interview → Offer → Accepted/Rejected
- **Timeline** : Historique complet des actions
- **Notes** : Commentaires et observations
- **Documents** : CV, lettres de motivation, etc.

### Recherche et Filtres

#### Recherche Rapide
- **Barre de recherche** en haut de chaque page
- **Recherche globale** dans tous les modules
- **Filtres intelligents** par statut, date, entreprise

#### Recherche Avancée
```typescript
// Filtres disponibles
{
  "status": ["SENT", "INTERVIEW_SCHEDULED"],
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "company": "TechCorp",
  "priority": "HIGH"
}
```

### Intégrations Externes

#### LinkedIn
- **Importer votre profil** professionnel
- **Rechercher des entreprises** et contacts
- **Synchroniser** vos invitations réseau

#### Calendriers
- **Google Calendar** : Synchronisation automatique des entretiens
- **Outlook** : Intégration avec votre calendrier professionnel
- **Gestion locale** : Calendrier intégré à l'application

## 🔧 Configuration Avancée

### Variables d'Environnement

#### Fichier `.env`
```bash
# Base de données
DATABASE_URL=postgresql://jobbingtrack:password@localhost:5432/jobbingtrack

# JWT
JWT_SECRET=votre-cle-secrete-super-longue
JWT_REFRESH_SECRET=votre-cle-refresh-secrete

# Services (URLs internes Docker)
AUTH_SERVICE_URL=http://auth-service:3001
APPLICATION_SERVICE_URL=http://application-service:3002

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-application
```

### Personnalisation

#### Thèmes et Apparence
- **Thème clair/sombre** automatique selon préférences
- **Couleurs personnalisées** pour la marque
- **Mode compact** pour les écrans haute résolution
- **Animations** désactivables pour l'accessibilité

#### Préférences Utilisateur
- **Format de date** (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- **Format d'heure** (12h/24h)
- **Notifications** (son, position, durée)
- **Langue** (français, anglais, espagnol)

## 🆘 Résolution de Problèmes

### Problèmes Courants

#### 1. Services ne Démarrent Pas
```bash
# Diagnostic automatique
make fix

# Ou diagnostic manuel
./scripts/diagnostic-fix.sh full

# Vérification des logs
make logs
```

#### 2. Connexion Impossible
```bash
# Recréer l'utilisateur admin
make create-admin

# Ou manuellement
./scripts/create-admin-user.sh admin@jobbingtrack.com SuperAdmin123!
```

#### 3. Performance Lente
```bash
# Nettoyer le cache
make clean-logs

# Vérifier les ressources
make check-disk

# Optimiser les indexes
./scripts/database/optimize-indexes.sh
```

### Support Technique

#### Logs et Debugging
```bash
# Logs temps réel de tous les services
make logs

# Logs d'un service spécifique
make logs-auth-service

# État des services
make status

# Vérification santé
make health
```

#### Backup et Restauration
```bash
# Créer une sauvegarde
make backup

# Restaurer depuis une sauvegarde
./scripts/database/restore-backup.sh backup_20250101.sql
```

## 📈 Évolution et Mises à Jour

### Mise à Jour du Code
```bash
# Récupérer les dernières mises à jour
git pull origin main

# Rebuild et redémarrage
make rebuild
```

### Nouvelles Fonctionnalités
- **Notifications push** pour les entretiens
- **Export PDF** des candidatures
- **Intégrations CRM** (HubSpot, Salesforce)
- **API mobile** optimisée

## 🎓 Apprentissage

### Tutoriels
- **[Tutoriel Candidatures](./tutorials/applications.md)** - Guide complet CRUD
- **[Tutoriel Recherche](./tutorials/search.md)** - Recherche avancée
- **[Tutoriel Intégrations](./tutorials/integrations.md)** - LinkedIn et calendriers

### Formation
- **Mode démo** : Données d'exemple préchargées
- **Tooltips** : Aide contextuelle dans l'interface
- **Documentation interactive** : Aide intégrée

## 🤝 Communauté et Support

### Ressources
- **📚 Documentation** : https://github.com/PavelDelhomme/JobbingTrack/wiki
- **🐛 Issues** : https://github.com/PavelDelhomme/JobbingTrack/issues
- **💬 Discussions** : https://github.com/PavelDelhomme/JobbingTrack/discussions

### Contribution
```bash
# Fork le repository
git fork https://github.com/PavelDelhomme/JobbingTrack.git

# Créer une branche feature
git checkout -b feature/nouvelle-fonctionnalite

# Développer et tester
make test-all

# Soumettre une Pull Request
git push origin feature/nouvelle-fonctionnalite
```

---

**🎯 JobbingTrack** - Votre plateforme de gestion de candidatures, simple, puissante et évolutive !

**Questions ?** Consultez la [documentation technique](./../technical/README.md) ou ouvrez une [issue](https://github.com/PavelDelhomme/JobbingTrack/issues).
