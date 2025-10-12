# 🚀 Guide Rapide - Test et Push

---

## ✅ Étape 1 : Vérifier que Tout Tourne

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack/backend
docker compose ps
```

**Attendu** : Tous les services doivent avoir le status "Up"

---

## ✅ Étape 2 : Tester l'API

```bash
./backend/test-admin-features.sh
```

**Attendu** : Au moins 6/9 tests doivent passer ✅

---

## ✅ Étape 3 : Démarrer le Frontend

```bash
cd frontend
npm run dev
```

**Attendu** : Frontend démarre sur http://localhost:8080

---

## ✅ Étape 4 : Tester Manuellement

### A. Login
- Ouvrir http://localhost:8080/login
- Email: `admin@jobbingtrack.test`
- Password: `password123`
- Cliquer "Se connecter"

**Attendu** : Redirection vers `/backoffice`

### B. Vérifier le Menu
- Vérifier que vous voyez votre nom en bas à gauche
- Vérifier que le rôle affiché est `SUPER_ADMIN`
- Vérifier que le menu contient "🗑️ Corbeille"

**Attendu** : Menu complet avec nouveau lien Corbeille

### C. Page Services
- Cliquer sur "⚙️ Services"
- Vérifier que les services s'affichent
- Cliquer sur "Tester tout"

**Attendu** : Services affichés avec leur statut

### D. Page Corbeille (NOUVEAU)
- Cliquer sur "🗑️ Corbeille"
- Vérifier que la page s'affiche

**Attendu** : Page avec message "Corbeille vide" (normal si aucun élément supprimé)

### E. Tester le Soft Delete
- Aller sur "📝 Candidatures"
- Créer une nouvelle candidature
- Cliquer sur "Supprimer"
- Recharger la page
- La candidature a disparu de la liste

**Attendu** : Candidature supprimée (soft delete)

---

## ✅ Étape 5 : Pusher

Si tout est OK ci-dessus :

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Voir les changements
git status

# Ajouter tout
git add .

# Commit
git commit -m "feat(admin): dashboard complet avec corbeille, rôles et CRON

- JWT inclut rôle (USER/ADMIN/SUPER_ADMIN)
- Page gestion corbeille globale
- Schémas Prisma synchronisés (Call, ApplicationContact)
- Champs avancés suppression (deletedBy, adminDeletedAt, canRestore)
- 5 jobs CRON (nettoyage auto, rappels)
- Routes admin sécurisées
- Scripts synchronisation automatique

Fixes #1, #2, #3"

# Push
git push origin feat/frontend-dashboard
```

---

## ⚠️ Si Problèmes

### Services ne démarrent pas
```bash
cd backend
docker compose logs | grep -i error
# Voir les erreurs
```

### Erreur Prisma
```bash
cd backend
for dir in */; do cd $dir && npx prisma format 2>/dev/null && cd .. ; done
docker compose up -d --build
```

### Frontend ne démarre pas
```bash
cd frontend
rm -rf .next
npm run dev
```

---

## 📞 Aide Rapide

Si vous voyez dans les tests :
- ❌ "Permission denied" Docker → **Normal**, fix optionnel (voir GUIDE-PERMISSIONS-DOCKER.md)
- ❌ "Accès refusé" → Vérifier que le JWT contient le rôle
- ❌ "Route non trouvée" → Rebuilder l'API Gateway

---

**🎉 C'est prêt ! Vous pouvez pusher ! 🎉**

