# 📂 Structure du Frontend JobbingTrack

Cette structure utilise les **Route Groups** de Next.js (dossiers entre parenthèses) pour organiser logiquement l'application sans affecter les URLs.

## 🗂️ Organisation

### `(public)/` - Pages Publiques
Pages accessibles sans authentification :
- `/login` - Connexion
- `/register` - Inscription
- `/forgot-password` - Mot de passe oublié
- `/reset-password/[token]` - Réinitialisation mot de passe
- `/access-denied` - Accès refusé

### `(dashboard)/` - Dashboard Utilisateur
Pages principales de l'application (authentification requise) :
- `/` - Page d'accueil dashboard
- `/applications` - Gestion des candidatures
  - `/applications/applications` - Liste des candidatures
  - `/applications/applications/[id]` - Détail candidature
- `/entities` - Entités métier
  - `/entities/calls` - Appels
  - `/entities/companies` - Entreprises
  - `/entities/contacts` - Contacts
  - `/entities/events` - Événements
  - `/entities/followups` - Suivis
  - `/entities/interviews` - Entretiens
  - `/entities/users` - Utilisateurs

### `(admin)/` - Administration
Pages d'administration système (rôle admin requis) :
- `/b4ck0ff1ce` - Vue d'ensemble administration
  - `/b4ck0ff1ce/analytics` - Analyses admin
- `/analytics` - Métriques et analyses système
- `/settings` - Configuration système
- `/notifications` - Gestion des notifications
- `/search` - Recherche avancée
- `/statistics` - Statistiques globales
- `/data-management` - Gestion des données
- `/archives` - Archives
- `/trash` - Corbeille
- `/maintenance` - Maintenance système
- `/deployments` - Déploiements
- `/test-data` - Données de test

### `(security)/` - Sécurité
Pages de sécurité (rôles admin/security requis) :
- `/alerts` - Alertes de sécurité
- `/analysis` - Analyse de sécurité
- `/logs` - Logs de sécurité
- `/intrusions` - Détection d'intrusions
- `/vulnerabilities` - Vulnérabilités
- `/ddos` - Protection DDoS
- `/data-generator` - Générateur de données de test

### `(development)/` - Outils Développement
Outils de développement (mode dev uniquement, rôle admin requis) :
- `/tests/api-tester` - Testeur d'API
- `/tests/performance` - Tests de performance
- `/tests/playwright` - Tests Playwright
- `/mobile-emulator` - Émulateur mobile
- `/services/applications` - Services applicatifs
- `/services/b4ck0ff1ce` - Services backoffice

### `api/` - API Routes
Routes API Next.js :
- `/api/health` - Health check
- `/api/cadvisor` - Proxy cAdvisor
- `/api/middleware-test` - Test middleware
- `/api/v1.3/docker` - API Docker

## 🎯 Avantages de cette Structure

1. **Organisation Claire** : Chaque section a son propre groupe
2. **Sécurité** : Layouts de groupe pour gérer l'authentification
3. **URLs Propres** : Les parenthèses n'affectent pas les URLs
4. **Maintenabilité** : Facile de trouver et maintenir le code
5. **Scalabilité** : Ajout facile de nouvelles sections

## 🔐 Sécurité

Chaque groupe a son propre `layout.tsx` qui gère :
- **(public)** : Aucune auth requise
- **(dashboard)** : Auth requise
- **(admin)** : Auth + rôle admin requis
- **(security)** : Auth + rôle admin/security requis
- **(development)** : Mode dev + rôle admin requis

## 📝 Convention de Nommage

- Groupes de routes : `(nom-groupe)/`
- Pages : `page.tsx`
- Layouts : `layout.tsx`
- Routes dynamiques : `[param]/`
- Routes API : `route.ts`
