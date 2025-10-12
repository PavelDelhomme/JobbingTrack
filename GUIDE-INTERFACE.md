# 🎨 Guide de l'Interface Backoffice

## 🏠 Navigation Principale

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 JobbingTrack                                    👤 John Doe │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Tableau de bord                                             │
│  ├─ Vue d'ensemble                                              │
│  └─ Statistiques                                                │
│                                                                  │
│  📝 Gestion des Données                                         │
│  ├─ Candidatures                                                │
│  ├─ Entreprises                                                 │
│  ├─ Contacts                                                    │
│  ├─ Entretiens                                                  │
│  ├─ 📞 Appels                    ← NOUVEAU                      │
│  ├─ Relances                                                    │
│  ├─ Événements                                                  │
│  └─ Notifications                                               │
│                                                                  │
│  📦 Archives & Corbeille                                        │
│  ├─ Archives                                                    │
│  └─ Corbeille                                                   │
│                                                                  │
│  ⚙️ Administration                                              │
│  ├─ Services & Tests             ← AMÉLIORÉ                     │
│  ├─ 👥 Utilisateurs              ← COMPLET                      │
│  ├─ 💾 Gestion Données           ← NOUVEAU (PhpMyAdmin)         │
│  └─ Configuration                                               │
│                                                                  │
│  🛠️ Développement                                               │
│  ├─ Testeur API                                                 │
│  ├─ Données de Test                                             │
│  └─ Émulateur Mobile                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📞 Page Gestion des Appels

### `/backoffice/calls`

```
┌─────────────────────────────────────────────────────────────────┐
│  📞 Gestion des Appels                       [➕ Nouvel Appel]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 STATISTIQUES                                                │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │  Total   │ Terminés │ Planifiés│   Taux   │  Durée   │      │
│  │    45    │    32    │    13    │   71%    │   5m     │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│                                                                  │
│  🔍 FILTRES                                                     │
│  [Statut ▼] [Type ▼] [Rechercher...]                           │
│                                                                  │
│  📋 LISTE DES APPELS                                            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Type │ Candidature/Contact │ Date │ Durée │ Statut │ ⚙️ │   │
│  ├──────┼─────────────────────┼──────┼───────┼────────┼───┤   │
│  │ 📞   │ Google - Dev Full   │ 10/12│  5m   │  ✅    │👁️🗑️│   │
│  │ 📱   │ Apple - Designer    │ 10/11│  3m   │  ✅    │👁️🗑️│   │
│  │ 📞   │ Meta - Manager      │ 10/15│  -    │  ⏱️    │✓👁️│   │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [← Précédent]  Page 1 / 3  [Suivant →]                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👥 Page Gestion des Utilisateurs

### `/backoffice/users`

```
┌─────────────────────────────────────────────────────────────────┐
│  👥 Gestion Utilisateurs    [➕ Créer] [📧 Inviter]             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 STATISTIQUES                                                │
│  ┌──────────┬──────────┬──────────┬──────────┐                 │
│  │  Total   │  Actifs  │  Admins  │  Users   │                 │
│  │    25    │    22    │     3    │    22    │                 │
│  └──────────┴──────────┴──────────┴──────────┘                 │
│                                                                  │
│  📋 LISTE DES UTILISATEURS                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Utilisateur │ Email │ Rôle ▼ │ Statut │ Inscrit │ ⚙️   │    │
│  ├─────────────┼───────┼────────┼────────┼─────────┼──────┤    │
│  │ 👤 JD       │ j@... │ ADMIN ▼│  ✓     │ 10/01   │ 👁️🗑️ │    │
│  │ 👤 MS       │ m@... │ USER ▼ │  ✓     │ 10/05   │ 👁️🗑️ │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  👁️ Cliquer pour ouvrir la POPUP DE DÉTAIL                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  POPUP DE DÉTAIL UTILISATEUR                              [✕]   │
├─────────────────────────────────────────────────────────────────┤
│  👤 John Doe                                                    │
│  redacted@example.invalid                                                  │
│                                                                  │
│  [ℹ️ Info] [📋 Logs Emails] [📊 Rapports] [⚙️ Actions]         │
│  ────────                                                       │
│                                                                  │
│  ONGLET INFO :                                                  │
│  ┌─────────────────────────────────────────────────┐           │
│  │ Prénom: John            Email: redacted@example.invalid    │           │
│  │ Nom: Doe                Téléphone: +336...      │           │
│  │ Rôle: ADMIN             Statut: ✓ Actif        │           │
│  │ Créé: 01/10/2025        Modifié: 12/10/2025    │           │
│  │ ID: clxxx123456                                 │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                  │
│  ONGLET LOGS EMAILS :                                           │
│  ┌─────────────────────────────────────────────────┐           │
│  │ 📧 Bienvenue sur JobbingTrack                   │           │
│  │    À: redacted@example.invalid • SENT • 01/10/2025        │           │
│  │                                                  │           │
│  │ 📧 Réinitialisation mot de passe                │           │
│  │    À: redacted@example.invalid • SENT • 05/10/2025        │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                  │
│  ONGLET ACTIONS :                                               │
│  ┌─────────────────────────────────────────────────┐           │
│  │ 🔑 Envoyer lien de réinitialisation             │           │
│  │ 👤 Impersonate (se connecter en tant que)       │           │
│  │ 🔒 Désactiver le compte                         │           │
│  │ 🗑️ Supprimer définitivement                     │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💾 Page Gestion de Données (PhpMyAdmin)

### `/backoffice/data-management`

```
┌─────────────────────────────────────────────────────────────────┐
│  💾 Gestion des Données                                         │
├─────────────────────────────────────────────────────────────────┤
│  [📊 Parcourir] [📤 Export] [📥 Import] [⚙️ Opérations]         │
│  ─────────────                                                  │
│                                                                  │
│  SIDEBAR         │  CONTENU PRINCIPAL                           │
│  ┌─────────┐     │  ┌────────────────────────────────────┐     │
│  │ Tables  │     │  │ Table : User       [🔍][➕][🔄]   │     │
│  ├─────────┤     │  ├────────────────────────────────────┤     │
│  │ 👤 User │ ←───┼──│ 25 enregistrements                 │     │
│  │ 🏢 Comp.│     │  │                                     │     │
│  │ 📝 Appl.│     │  │ id │ email │ firstName │ role │ ⚙️ │     │
│  │ 👥 Cont.│     │  │────┼───────┼───────────┼──────┼───│     │
│  │ 📅 Inte.│     │  │ 1  │ a@... │ Admin     │ ADMIN│✏️🗑️│     │
│  │ 📞 Call │     │  │ 2  │ b@... │ Bob       │ USER │✏️🗑️│     │
│  │ 📧 Foll.│     │  │ 3  │ c@... │ Charlie   │ USER │✏️🗑️│     │
│  │ 🔔 Noti.│     │  └────────────────────────────────────┘     │
│  │ 📬 Email│     │                                              │
│  │ 📊 Acti.│     │  [← Précédent] Page 1 [Suivant →]           │
│  │ 📄 Doc. │     │                                              │
│  │ ⏰ Remi.│     │                                              │
│  │ 📋 Temp.│     │                                              │
│  └─────────┘     │                                              │
└─────────────────────────────────────────────────────────────────┘

ONGLET EXPORT :
┌─────────────────────────────────────────┐
│ Table à exporter : [User ▼]            │
│                                         │
│ [📄 Exporter en JSON] [📊 Export CSV]  │
└─────────────────────────────────────────┘

ONGLET OPÉRATIONS :
┌─────────────────────────────────────────┐
│ 🗑️ Suppression en masse                │
│ 📝 Mise à jour en masse                 │
│ 🔄 Synchronisation des données          │
└─────────────────────────────────────────┘
```

---

## 🔧 Page Services & Tests

### `/backoffice/services`

```
┌─────────────────────────────────────────────────────────────────┐
│  🔧 Services & Tests            [☑️ Auto-refresh] [🧪 Tester]   │
├─────────────────────────────────────────────────────────────────┤
│  [🔧 Services] [📋 Logs] [🧪 Tests DB]                          │
│  ─────────────                                                  │
│                                                                  │
│  📊 STATISTIQUES                                                │
│  ┌──────────┬──────────┬──────────┬──────────┐                 │
│  │  Total   │ En ligne │Hors ligne│ Temps moy│                 │
│  │    12    │    11    │     1    │   45ms   │                 │
│  └──────────┴──────────┴──────────┴──────────┘                 │
│                                                                  │
│  🎴 CARTES DES SERVICES                                         │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐      │
│  │ API Gateway    │ │ Auth Service   │ │ Call Service   │      │
│  │ Port 8080      │ │ Port 3001      │ │ Port 3008      │      │
│  │ ✅ ONLINE      │ │ ✅ ONLINE      │ │ ✅ ONLINE      │      │
│  │ 23ms           │ │ 45ms           │ │ 32ms           │      │
│  │ [🧪][🔄][🛑]   │ │ [🧪][🔄][🛑]   │ │ [🧪][🔄][🛑]   │      │
│  └────────────────┘ └────────────────┘ └────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

ONGLET LOGS :
┌─────────────────────────────────────────────────────────────────┐
│  Service: [Tous ▼]    Lignes: [100]              [🔄 Rafraîchir]│
├─────────────────────────────────────────────────────────────────┤
│  📟 CONSOLE (logs Docker)                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 2025-10-12T10:00:01 INFO  🔐 Auth Service démarré     │    │
│  │ 2025-10-12T10:00:02 INFO  📞 Call Service démarré     │    │
│  │ 2025-10-12T10:00:15 INFO  POST /api/v1/calls - 201    │    │
│  │ 2025-10-12T10:00:20 WARN  Token expiration proche     │    │
│  │ 2025-10-12T10:00:30 ERROR Database connection timeout │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

ONGLET TESTS DB :
┌─────────────────────────────────────────────────────────────────┐
│  🧪 Tests de Base de Données              [▶️ Lancer les tests]│
├─────────────────────────────────────────────────────────────────┤
│  ✅ Test connexion PostgreSQL                           (45ms)  │
│     ✓ Connexion PostgreSQL OK                                  │
│                                                                  │
│  ✅ Schéma Prisma Auth Service                          (32ms)  │
│     ✓ Schéma Prisma auth-service OK                            │
│                                                                  │
│  🔄 Schéma Prisma Application Service                           │
│     Test en cours...                                            │
│                                                                  │
│  ⏳ Schéma Prisma Call Service                                  │
│                                                                  │
│  ⏳ Schéma Prisma Notification Service                          │
│                                                                  │
│  ⏳ Test Migration (dry-run)                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Pages d'Authentification

### `/login` - Connexion
```
┌─────────────────────────────────────────┐
│            🎯 JobbingTrack              │
│                                          │
│  Email    : [________________]          │
│  Password : [________________]          │
│                                          │
│  [Se connecter]                         │
│                                          │
│  Mot de passe oublié ?                  │
│  Pas de compte ? S'inscrire             │
└─────────────────────────────────────────┘
```

### `/forgot-password` - Mot de passe oublié
```
┌─────────────────────────────────────────┐
│      Mot de passe oublié ?              │
│                                          │
│  Entrez votre email pour recevoir       │
│  un lien de réinitialisation            │
│                                          │
│  Email : [________________]             │
│                                          │
│  [Envoyer le lien]                      │
│                                          │
│  ← Retour à la connexion                │
└─────────────────────────────────────────┘
```

### `/reset-password/[token]` - Réinitialisation
```
┌─────────────────────────────────────────┐
│      Nouveau mot de passe               │
│      Pour : redacted@example.invalid               │
│                                          │
│  Nouveau mot de passe :                 │
│  [________________]                     │
│                                          │
│  Confirmer :                            │
│  [________________]                     │
│                                          │
│  💡 Min. 6 caractères                   │
│                                          │
│  [Réinitialiser]                        │
└─────────────────────────────────────────┘
```

### `/access-denied` - Accès refusé
```
┌─────────────────────────────────────────┐
│              🚫                         │
│         Accès Refusé                    │
│                                          │
│  Vous n'avez pas les permissions        │
│  nécessaires pour accéder au backoffice │
│                                          │
│  Votre rôle : USER                      │
│                                          │
│  Le backoffice est réservé aux          │
│  administrateurs.                       │
│                                          │
│  [Retour à l'accueil]                   │
│  [Se déconnecter]                       │
│                                          │
│  Rôles autorisés :                      │
│  • 👨‍💼 ADMIN                             │
│  • 👑 SUPER_ADMIN                        │
└─────────────────────────────────────────┘
```

---

## 🎨 Codes Couleurs

### Statuts
```
✅ Succès    → Vert   (bg-green-100)
⏱️ En cours  → Jaune  (bg-yellow-100)
❌ Erreur    → Rouge  (bg-red-100)
ℹ️ Info      → Bleu   (bg-blue-100)
⚠️ Warning   → Orange (bg-orange-100)
```

### Rôles
```
👤 USER        → Gris   (bg-gray-100)
👨‍💼 ADMIN       → Bleu   (bg-blue-100)
👑 SUPER_ADMIN → Violet (bg-purple-100)
```

### Actions
```
👁️ Voir       → Bleu
✏️ Éditer     → Bleu
🗑️ Supprimer  → Rouge
✓ Valider     → Vert
🔄 Rafraîchir → Orange
```

---

## 📱 Responsive Design

### Desktop (> 1024px)
- Sidebar fixe à gauche (256px)
- Contenu principal à droite
- Tableaux complets
- 3-4 colonnes pour les stats

### Tablet (768px - 1024px)
- Sidebar collapsible
- 2 colonnes pour les stats
- Tableaux scrollables horizontalement

### Mobile (< 768px)
- Menu hamburger
- 1 colonne pour les stats
- Cartes au lieu de tableaux
- Actions en dropdown

---

## 🎨 Thèmes

### Mode Clair ☀️
```
Background : bg-gray-50
Cards      : bg-white
Text       : text-gray-900
Borders    : border-gray-200
```

### Mode Sombre 🌙
```
Background : bg-gray-950
Cards      : bg-gray-800
Text       : text-gray-100
Borders    : border-gray-700
```

### Toggle
- Bouton dans le header (☀️ / 🌙)
- Sauvegarde dans localStorage
- Transition smooth

---

## 🎯 Raccourcis Clavier (À Implémenter)

Suggestions pour améliorer l'UX :

```
Ctrl + K     → Recherche globale
Ctrl + /     → Aide
Ctrl + B     → Toggle sidebar
Ctrl + L     → Focus sur les logs
Ctrl + N     → Nouveau (selon la page)
Ctrl + S     → Sauvegarder
Échap        → Fermer les modals
```

---

## 📊 Flux de Navigation

### Flux Typique Admin

```
1. Login → /login
2. Backoffice → /backoffice
3. Gestion Utilisateurs → /backoffice/users
4. Ouvrir détail utilisateur → Popup
5. Impersonate → /backoffice/mobile-emulator?impersonate=ID
6. Retour → /backoffice
7. Services & Tests → /backoffice/services
8. Voir les logs → Onglet Logs
9. Gestion de données → /backoffice/data-management
10. Exporter des données → Onglet Export
```

### Flux Typique Utilisateur USER

```
1. Inscription → /register
2. (Tentative) Backoffice → /backoffice
3. Redirection → /access-denied
4. Retour accueil → /
5. Utilisation normale de l'app
```

---

## 🎉 Points Forts de l'Interface

- ✅ **Intuitive** : Navigation claire et organisée
- ✅ **Rapide** : Chargements optimisés
- ✅ **Sécurisée** : Permissions vérifiées à chaque étape
- ✅ **Belle** : Design moderne avec Tailwind CSS
- ✅ **Complète** : Toutes les fonctionnalités accessibles
- ✅ **Responsive** : Fonctionne sur tous les écrans
- ✅ **Dark Mode** : Confort visuel
- ✅ **Accessible** : Labels, ARIA, keyboard navigation

**Interface professionnelle et complète !** 🚀

