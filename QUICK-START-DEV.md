# ⚡ Quick Start - Développement JobbingTrack

## 🚀 Démarrage en 3 minutes

### 1️⃣ Démarrer les services (1 min)

```bash
cd backend
make up
```

Attendez que tous les services soient démarrés (vous verrez ✅ dans les logs).

### 2️⃣ Générer des données de test (1 min)

```bash
make seed-standard
```

Cela va créer :
- 3 utilisateurs (SUPER_ADMIN, ADMIN, USER)
- 10 entreprises (Google, Microsoft, Amazon, etc.)
- 20 candidatures avec différents statuts
- 15 contacts
- 8 entretiens
- 12 relances
- 10 appels
- + Éléments en corbeille et archivés

### 3️⃣ Accéder au backoffice (30 sec)

1. **Frontend** : http://localhost:8080/backoffice
2. **Login** : `user1@jobbingtrack.test` / `password123`
3. **Explorez** toutes les fonctionnalités !

---

## 🎯 Fonctionnalités à tester

### 📋 Données

- **Candidatures** : Visualiser, créer, modifier, supprimer
- **Entreprises** : Gérer les entreprises
- **Contacts** : Gérer les contacts
- **Entretiens** : Planifier des entretiens
- **Relances** : Programmer des relances
- **Appels** : Enregistrer des appels

### 🗑️ Nettoyage

- **Corbeille** : Voir les éléments supprimés, restaurer ou supprimer définitivement
- **Archives** : Consulter les éléments archivés, désarchiver

### 🛠️ Développement

- **Données de Test** : Générer/supprimer des données en quelques clics
- **Émulateur Mobile** : Tester l'interface sur différents devices
- **Logs** : Consulter les logs en temps réel

### 👨‍💼 Administration

- **Services** : Redémarrer, arrêter, démarrer les microservices
- **Utilisateurs** : Gérer les rôles et permissions
- **Configuration** : Paramètres système

---

## 🎲 Générer des données

### Via l'interface (Recommandé)

1. Allez sur : http://localhost:8080/backoffice/test-data
2. Choisissez un preset :
   - **Minimal** : Pour tests rapides
   - **Standard** : Pour développement normal ⭐
   - **Complet** : Pour tests de charge
   - **Démo** : Pour présentation client
3. Ou personnalisez avec les sliders
4. Cliquez sur **Générer**

### Via CLI

```bash
cd backend

# Rapide
make seed-minimal

# Normal (recommandé)
make seed-standard

# Beaucoup de données
make seed-complete

# Pour démo
make seed-demo

# Nettoyer tout
make clean-data
```

---

## 📱 Tester sur mobile

1. Allez sur : http://localhost:8080/backoffice/mobile-emulator
2. Sélectionnez un appareil (iPhone 14, Pixel 7, etc.)
3. Naviguez avec les liens rapides
4. Testez en portrait et paysage
5. Activez le mode sombre

**Raccourcis** :
- `R` : Rotation
- `F` : Cadre on/off
- `D` : Mode sombre

---

## 📋 Voir les logs

1. Allez sur : http://localhost:8080/backoffice/logs
2. Sélectionnez un service
3. Activez l'actualisation auto
4. Les erreurs apparaissent en rouge, les warnings en jaune

**Via CLI** :
```bash
cd backend

# Tous les services
make logs

# Un service spécifique
make logs-auth-service
make logs-application-service

# En temps réel
docker compose logs -f auth-service
```

---

## 🗑️ Gérer la corbeille

1. **Supprimer** une candidature (bouton supprimer)
2. Allez sur : http://localhost:8080/backoffice/trash
3. Vous voyez l'élément supprimé
4. **Restaurez** ou **supprimez définitivement**

**Bon à savoir** :
- Les éléments restent 30 jours en corbeille
- Après 30 jours = suppression automatique
- Certains éléments ne sont pas restaurables

---

## 📦 Utiliser les archives

Les archives servent à **conserver sans afficher**.

**Exemple d'usage** :
- Candidature acceptée → Archiver pour garder l'historique
- Vieille entreprise → Archiver pour nettoyer la liste
- Contact inactif → Archiver temporairement

**Comment** :
- (TODO: Ajouter bouton d'archivage dans les listes)
- Pour l'instant, via API ou base de données

**Consulter** : http://localhost:8080/backoffice/archives

---

## 🔧 Commandes essentielles

```bash
cd backend

# Démarrer
make up

# Voir le statut
make status

# Générer des données
make seed-standard

# Voir les logs
make logs

# Redémarrer un service
make restart-auth-service

# Arrêter
make down

# Nettoyer tout
make clean
```

---

## 🎨 Interface du backoffice

### Menu principal

```
📊 Tableau de bord
   ├─ Vue d'ensemble
   └─ Statistiques

📝 Données
   ├─ Candidatures
   ├─ Entreprises
   ├─ Contacts
   ├─ Entretiens
   ├─ Appels
   ├─ Relances
   ├─ Événements
   └─ Notifications

🗑️ Nettoyage
   ├─ Corbeille          ← NOUVEAU
   └─ Archives           ← NOUVEAU

👨‍💼 Administration
   ├─ Services & Tests
   ├─ Utilisateurs
   ├─ Gestion Données
   └─ Configuration

🛠️ Développement
   ├─ Testeur API
   ├─ Données de Test    ← NOUVEAU
   ├─ Émulateur Mobile   ← NOUVEAU
   └─ Logs & Activités   ← NOUVEAU
```

---

## 💡 Tips & Astuces

### 1. Développement rapide

```bash
# Toujours utiliser seed-minimal en dev
make seed-minimal

# C'est plus rapide et suffit pour tester
```

### 2. Tester différents rôles

Générez des données, puis testez avec :
- `user1@jobbingtrack.test` (SUPER_ADMIN)
- `user2@jobbingtrack.test` (ADMIN)
- `user3@jobbingtrack.test` (USER)

### 3. Réinitialiser rapidement

```bash
make clean-data && make seed-standard
```

### 4. Débugger avec les logs

```bash
# En temps réel dans le terminal
make logs-auth-service

# Ou dans l'interface web avec auto-refresh
```

### 5. Tester sur mobile

Utilisez l'émulateur intégré plutôt que de sortir votre téléphone !

---

## 🆘 Problèmes courants

### "Cannot connect to database"

```bash
# Vérifier PostgreSQL
docker compose ps postgres

# Redémarrer
make restart-postgres
```

### "Service unavailable"

```bash
# Voir les logs
make logs-auth-service

# Redémarrer
make restart-auth-service
```

### "Données ne se génèrent pas"

```bash
# Nettoyer et regénérer
make clean-data
make seed-standard
```

### "Page blanche dans l'émulateur"

- Vérifiez l'URL
- Vérifiez que le frontend tourne (npm run dev)
- Rafraîchissez avec le bouton 🔄

---

## 📚 Documentation complète

- [Guide de développement complet](backend/GUIDE-DEVELOPPEMENT.md)
- [Nouvelles fonctionnalités](NOUVELLES-FONCTIONNALITES.md)
- [Architecture](backend/architecture.md)
- [README principal](README.md)

---

## 🎉 Vous êtes prêt !

Tout est configuré pour un développement efficace. Bon code ! 🚀

```bash
# Résumé de la commande magique
cd backend && make up && make seed-standard
```

Puis allez sur http://localhost:8080/backoffice et amusez-vous ! 🎮

---

**Créé le** : 2025-10-10  
**Pour** : Développement JobbingTrack  
**Version** : 1.0

