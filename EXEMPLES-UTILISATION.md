# 📖 Exemples d'Utilisation - JobbingTrack

## 🎯 Scénarios pratiques

---

## 1️⃣ Démarrage d'un nouveau développeur

### Objectif
Mettre en place l'environnement de développement en 5 minutes.

### Étapes

```bash
# 1. Cloner le projet
git clone <repository-url>
cd JobbingTrack

# 2. Démarrer les services backend
cd backend
make up

# 3. Attendre 30 secondes que tout démarre
# Puis générer des données de test
make seed-standard

# 4. Démarrer le frontend
cd ../frontend
npm install
npm run dev

# 5. Accéder au backoffice
# http://localhost:8080/backoffice
# Login: user1@jobbingtrack.com / password123
```

**Résultat** : Environnement complet avec données réalistes en 5 minutes ! ✅

---

## 2️⃣ Tester une nouvelle fonctionnalité

### Objectif
Développer et tester une fonctionnalité de gestion de candidatures.

### Workflow

```bash
# 1. Générer des données minimales (rapide)
cd backend
make seed-minimal

# 2. Développer la fonctionnalité
# ... codage ...

# 3. Tester dans l'émulateur mobile
# http://localhost:8080/backoffice/mobile-emulator
# Sélectionner iPhone 14
# Naviguer vers /backoffice/applications

# 4. Vérifier les logs en cas d'erreur
# http://localhost:8080/backoffice/logs
# Sélectionner application-service
# Activer auto-refresh

# 5. Tester l'API avec le testeur
# http://localhost:8080/backoffice/api-tester
# POST /api/v1/applications
```

**Résultat** : Développement et tests en un seul endroit ! ✅

---

## 3️⃣ Préparer une démo client

### Objectif
Créer un environnement de démonstration avec des données professionnelles.

### Étapes

```bash
# 1. Nettoyer les anciennes données
cd backend
make clean-data

# 2. Générer des données de démo
make seed-demo

# 3. Vérifier dans le backoffice
# http://localhost:8080/backoffice
# Login: user1@jobbingtrack.com / password123

# 4. Personnaliser si nécessaire
# Via l'interface : Développement > Données de Test
# Ajuster les sliders
# Régénérer

# 5. Tester le parcours utilisateur
# Via : Développement > Émulateur Mobile
# Device: iPhone 14
# Tester toutes les pages
```

**Résultat** : Démo professionnelle prête ! ✅

---

## 4️⃣ Débugger un problème en production

### Objectif
Identifier et résoudre un bug signalé.

### Workflow

```bash
# 1. Consulter les logs
# Backoffice > Logs & Activités
# Sélectionner le service concerné
# Chercher les erreurs (en rouge)

# 2. Reproduire localement
cd backend
make seed-standard  # Données similaires à la prod

# 3. Tester l'API
# Backoffice > Testeur API
# Reproduire la requête qui pose problème

# 4. Corriger le code
# ... fix ...

# 5. Redémarrer le service
make restart-application-service

# 6. Vérifier dans les logs
make logs-application-service
```

**Résultat** : Bug identifié et corrigé ! ✅

---

## 5️⃣ Tests de charge

### Objectif
Tester les performances avec beaucoup de données.

### Étapes

```bash
# 1. Générer beaucoup de données
cd backend
make seed-complete
# Cela crée 50 candidatures, 40 contacts, etc.

# 2. Tester la pagination
# Backoffice > Candidatures
# Vérifier que la pagination fonctionne

# 3. Tester les filtres
# Utiliser la recherche
# Filtrer par statut
# Vérifier les performances

# 4. Tester l'API
# Backoffice > Testeur API
# GET /api/v1/applications?page=1&limit=10
# Mesurer le temps de réponse

# 5. Voir les métriques
# Backoffice > Statistiques
```

**Résultat** : Application testée avec de gros volumes ! ✅

---

## 6️⃣ Tester la gestion de la corbeille

### Objectif
Vérifier que la suppression et restauration fonctionnent.

### Scénario

```bash
# 1. Générer des données
make seed-standard

# 2. Dans le backoffice
# Candidatures > Sélectionner une candidature > Supprimer

# 3. Vérifier dans la corbeille
# Nettoyage > Corbeille
# L'élément apparaît avec le badge "Restaurable"

# 4. Restaurer l'élément
# Cliquer sur "Restaurer"

# 5. Vérifier dans Candidatures
# L'élément est de retour !

# 6. Supprimer définitivement
# Corbeille > Sélectionner > Supprimer définitivement
# ⚠️ C'est IRRÉVERSIBLE
```

**Résultat** : Gestion de la corbeille testée ! ✅

---

## 7️⃣ Archiver des anciennes candidatures

### Objectif
Conserver l'historique sans encombrer l'interface.

### Workflow

```bash
# 1. Via l'API (en attendant le bouton UI)
# Backoffice > Testeur API
# POST /api/v1/admin/archive/application/:id

# 2. Vérifier dans Archives
# Nettoyage > Archives
# L'élément apparaît

# 3. Désarchiver si besoin
# Archives > Cliquer sur "Désarchiver"

# 4. L'élément redevient actif
# Candidatures > Il réapparaît
```

**Résultat** : Archives fonctionnelles ! ✅

---

## 8️⃣ Tester différents rôles utilisateur

### Objectif
Vérifier les permissions et restrictions par rôle.

### Étapes

```bash
# 1. Générer des utilisateurs
make seed-standard

# 2. Tester SUPER_ADMIN
# Login: user1@jobbingtrack.com
# Accès à TOUT (services, corbeille, données test, etc.)

# 3. Tester ADMIN
# Logout puis login: user2@jobbingtrack.com
# Accès admin mais restrictions sur vidage corbeille

# 4. Tester USER
# Logout puis login: user3@jobbingtrack.com
# Accès limité aux données personnelles
# Pas d'accès au backoffice admin

# 5. Vérifier les restrictions
# Essayer d'accéder à /backoffice/users en tant que USER
# Devrait être bloqué
```

**Résultat** : Permissions testées ! ✅

---

## 9️⃣ Développer une nouvelle page mobile

### Objectif
Créer et tester une nouvelle page en mode mobile.

### Workflow

```bash
# 1. Créer la page
# frontend/src/app/ma-page/page.tsx

# 2. Tester sur différents devices
# Backoffice > Émulateur Mobile
# URL: /ma-page

# 3. Tester sur iPhone 14
# Portrait : Vérifier l'affichage
# Paysage : Vérifier l'adaptation

# 4. Tester sur Pixel 7
# Vérifier les différences Android/iOS

# 5. Tester sur iPad
# Vérifier la version tablette

# 6. Ajuster le CSS
# Recharger l'émulateur (bouton 🔄)
```

**Résultat** : Page mobile optimisée ! ✅

---

## 🔟 Monitoring en production

### Objectif
Surveiller l'application en temps réel.

### Setup

```bash
# 1. Démarrer avec monitoring
cd backend
./deploy.sh production --monitoring

# 2. Accéder aux dashboards
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
# Jaeger: http://localhost:16686

# 3. Dans le backoffice
# Services > Voir les statuts
# Logs > Actualisation auto activée

# 4. Configurer les alertes
# Grafana > Create Alert
# Email ou Slack en cas d'erreur
```

**Résultat** : Monitoring complet ! ✅

---

## 🎬 Démonstration complète

### Scénario : Recherche d'emploi de A à Z

```bash
# 1. Setup
make up && make seed-demo

# 2. Login utilisateur
# user3@jobbingtrack.com (USER)

# 3. Créer une candidature
# Candidatures > Nouvelle candidature
# Entreprise: Google
# Poste: Software Engineer
# Statut: DRAFT

# 4. Ajouter un contact
# Contacts > Nouveau contact
# Prénom: John, Nom: Doe
# Email: john@google.com
# Lier à l'entreprise Google

# 5. Lier le contact à la candidature
# (Via l'API pour l'instant)

# 6. Planifier un entretien
# Entretiens > Nouvel entretien
# Type: TECHNICAL
# Date: Dans 3 jours

# 7. Programmer une relance
# Relances > Nouvelle relance
# Type: EMAIL
# Date: Demain

# 8. Enregistrer un appel
# Appels > Nouvel appel
# Type: OUTGOING
# Durée: 15 minutes
# Notes: Discussion positive

# 9. Mettre à jour le statut
# Candidatures > Modifier
# Statut: INTERVIEW_SCHEDULED

# 10. Après l'entretien
# Statut: INTERVIEWED
# Archiver l'entretien passé

# 11. Si refusé
# Statut: REJECTED
# Mettre à la corbeille

# 12. Si accepté
# Statut: ACCEPTED
# Archiver la candidature
```

**Résultat** : Parcours complet testé ! ✅

---

## 🚀 Commandes rapides du quotidien

```bash
# Matin - Démarrer l'environnement
cd backend && make up && make seed-minimal

# Développement - Voir les logs
make logs-auth-service

# Test - Redémarrer après modif
make rebuild-auth-service

# Debug - Nettoyer et regénérer
make clean-data && make seed-standard

# Soir - Tout arrêter
make down
```

---

## 💡 Pro Tips

### 1. Alias bash pratiques

Ajoutez dans votre `~/.bashrc` ou `~/.zshrc` :

```bash
alias jt-up='cd ~/JobbingTrack/backend && make up'
alias jt-logs='cd ~/JobbingTrack/backend && make logs'
alias jt-seed='cd ~/JobbingTrack/backend && make seed-standard'
alias jt-clean='cd ~/JobbingTrack/backend && make clean-data'
alias jt-restart='cd ~/JobbingTrack/backend && make restart-'
```

Usage :
```bash
jt-up              # Démarrer
jt-seed            # Générer des données
jt-logs            # Voir les logs
jt-restart auth-service  # Redémarrer un service
```

### 2. Script personnalisé

Créez `dev-start.sh` :

```bash
#!/bin/bash
cd backend
make up
sleep 30
make seed-minimal
cd ../frontend
npm run dev
```

### 3. Favoris navigateur

Créez des favoris pour :
- http://localhost:8080/backoffice (Backoffice)
- http://localhost:8080/backoffice/test-data (Données test)
- http://localhost:8080/backoffice/mobile-emulator (Émulateur)
- http://localhost:8080/backoffice/logs (Logs)

---

## 🎓 Exercices pratiques

### Exercice 1 : Créer une candidature complète

1. Générez des données minimales
2. Créez une entreprise "Ma Startup"
3. Créez un contact dans cette entreprise
4. Créez une candidature liée
5. Planifiez un entretien
6. Programmez une relance
7. Enregistrez un appel
8. Archivez la candidature

### Exercice 2 : Tester la corbeille

1. Supprimez 3 candidatures
2. Allez dans la corbeille
3. Restaurez-en une
4. Supprimez-en une définitivement
5. Videz la corbeille

### Exercice 3 : Émulateur mobile

1. Ouvrez l'émulateur
2. Testez sur 3 devices différents
3. Testez en portrait et paysage
4. Activez le mode sombre
5. Simulez un réseau lent (3G)

### Exercice 4 : Génération personnalisée

1. Ouvrez le générateur de données
2. Configurez :
   - 5 utilisateurs
   - 15 entreprises
   - 30 candidatures
   - 20 contacts
3. Générez
4. Vérifiez les relations dans la base
5. Testez les performances

---

## 🔍 Cas d'usage avancés

### Cas 1 : Migration de données

```javascript
// Backoffice > Testeur API

// 1. Exporter les données existantes
GET /api/v1/applications

// 2. Nettoyer
POST /api/v1/admin/test-data/clear

// 3. Réimporter avec le nouveau format
// (Script personnalisé)
```

### Cas 2 : Tests automatisés

```javascript
// tests/integration/data-generation.test.js

describe('Data Generation', () => {
  it('should generate minimal test data', async () => {
    const response = await fetch('http://localhost:3000/api/v1/admin/test-data/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        users: 2,
        companies: 5,
        applications: 5,
        contacts: 5,
        interviews: 2,
        followups: 3,
        calls: 2,
        events: 5,
        deletedItems: 1,
        archivedItems: 1
      })
    })
    
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
```

### Cas 3 : Backup avant tests

```bash
#!/bin/bash
# backup-and-test.sh

echo "📦 Backup de la base actuelle..."
docker compose exec postgres pg_dump -U jobbingtrack jobbingtrack > backup-$(date +%Y%m%d-%H%M%S).sql

echo "🧪 Génération de données de test..."
make clean-data
make seed-complete

echo "🧪 Exécution des tests..."
npm test

echo "♻️ Restauration du backup..."
cat backup-*.sql | docker compose exec -T postgres psql -U jobbingtrack -d jobbingtrack

echo "✅ Tests terminés, backup restauré"
```

---

## 📱 Exemples d'utilisation de l'émulateur

### Test responsive design

```javascript
// 1. Ouvrir l'émulateur
// http://localhost:8080/backoffice/mobile-emulator

// 2. Tester les breakpoints
// - iPhone 14 (390px) : Mobile petit
// - Pixel 7 (412px) : Mobile standard
// - iPhone Pro Max (430px) : Mobile large
// - iPad (834px) : Tablette

// 3. Vérifier que tout s'affiche correctement
```

### Test interactions tactiles

```javascript
// 1. Charger une page avec interactions
// URL: /backoffice/applications

// 2. Tester :
// - Swipe (simulation via souris)
// - Tap sur les éléments
// - Scroll
// - Formulaires

// 3. Vérifier en paysage
// Rotation avec bouton ou touche R
```

---

## 🗑️ Exemples corbeille & archives

### Scénario 1 : Candidature refusée

```javascript
// 1. Candidature rejetée
PUT /api/v1/applications/:id
{ "status": "REJECTED" }

// 2. Supprimer (soft delete)
DELETE /api/v1/applications/:id
// => deletedAt = now()

// 3. Visible dans corbeille
GET /api/v1/admin/trash?type=application
// => Apparaît dans la liste

// 4. Après 30 jours
// => Suppression auto définitive
```

### Scénario 2 : Candidature acceptée

```javascript
// 1. Candidature acceptée
PUT /api/v1/applications/:id
{ "status": "ACCEPTED" }

// 2. Archiver pour historique
POST /api/v1/admin/archive/application/:id
// => archivedAt = now()

// 3. Visible dans archives
GET /api/v1/admin/archive?type=application
// => Apparaît dans la liste

// 4. Garder pour toujours
// Pas de suppression auto
```

---

## 🎨 Personnalisation

### Créer son propre preset

```javascript
// Dans testdata.controller.js

const MY_CUSTOM_PRESET = {
  users: 1,
  companies: 5,
  applications: 10,
  contacts: 8,
  interviews: 4,
  followups: 6,
  calls: 3,
  events: 10,
  deletedItems: 2,
  archivedItems: 1
}

// Puis dans le frontend
// Ajouter dans les presets de test-data/page.tsx
```

### Ajouter des données personnalisées

```javascript
// Dans generate-test-data.js

// Ajouter vos propres entreprises
const MY_COMPANIES = [
  { name: 'Mon Entreprise', website: 'https://...', ... }
]

// Ajouter vos propres postes
const MY_POSITIONS = [
  'Mon Poste Custom',
  'Autre Poste',
  ...
]
```

---

## 📊 Métriques et KPIs

### Vérifier les données générées

```sql
-- Connexion à PostgreSQL
docker compose exec postgres psql -U jobbingtrack -d jobbingtrack

-- Compter les éléments
SELECT 
  (SELECT COUNT(*) FROM "User") as users,
  (SELECT COUNT(*) FROM "Company") as companies,
  (SELECT COUNT(*) FROM "Application") as applications,
  (SELECT COUNT(*) FROM "Contact") as contacts,
  (SELECT COUNT(*) FROM "Interview") as interviews,
  (SELECT COUNT(*) FROM "FollowUp") as followups,
  (SELECT COUNT(*) FROM "Call") as calls;

-- Éléments en corbeille
SELECT COUNT(*) FROM "Application" WHERE "deletedAt" IS NOT NULL;

-- Éléments archivés
SELECT COUNT(*) FROM "Application" WHERE "archivedAt" IS NOT NULL;

-- Relations
SELECT COUNT(*) FROM "ApplicationContact";
```

---

## 🆘 Dépannage par scénario

### Problème : "Aucune donnée n'apparaît"

```bash
# Solution 1 : Regénérer
make clean-data && make seed-standard

# Solution 2 : Vérifier la base
docker compose exec postgres psql -U jobbingtrack -d jobbingtrack -c 'SELECT COUNT(*) FROM "Application";'

# Solution 3 : Voir les logs
make logs-application-service
```

### Problème : "L'émulateur affiche une page blanche"

```bash
# Solution 1 : Vérifier le frontend
cd frontend && npm run dev

# Solution 2 : Vérifier l'URL
# Doit être une URL relative : /backoffice/applications

# Solution 3 : Rafraîchir
# Bouton 🔄 dans l'émulateur
```

### Problème : "Les logs ne s'affichent pas"

```bash
# Solution 1 : Vérifier les permissions
# Vous devez être ADMIN ou SUPER_ADMIN

# Solution 2 : Vérifier le service
docker compose ps

# Solution 3 : Redémarrer
make restart-auth-service
```

---

## 🎯 Checklist de validation

Avant de considérer une feature comme terminée :

- [ ] ✅ Testée avec données minimales
- [ ] ✅ Testée avec données complètes
- [ ] ✅ Testée sur mobile (émulateur)
- [ ] ✅ Testée en mode sombre
- [ ] ✅ Logs vérifiés (pas d'erreur)
- [ ] ✅ API testée (testeur intégré)
- [ ] ✅ Permissions vérifiées (USER, ADMIN, SUPER_ADMIN)
- [ ] ✅ Corbeille/Archives fonctionnelles
- [ ] ✅ Documentation à jour

---

## 📚 Ressources

- [Quick Start](QUICK-START-DEV.md)
- [Guide développement](backend/GUIDE-DEVELOPPEMENT.md)
- [Nouvelles fonctionnalités](NOUVELLES-FONCTIONNALITES.md)
- [Architecture](backend/architecture.md)

---

**Dernière mise à jour** : 2025-10-10  
**Version** : 1.0  
**Status** : ✅ Prêt à l'emploi

