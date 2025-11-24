# 📝 Modifications Demandées - Structure Base de Données

> **Fichier centralisé** pour toutes vos demandes de modifications de la structure de la base de données.
> 
> **Comment utiliser ce fichier** :
> 1. Ajoutez vos demandes dans la section "📋 Demandes en Attente"
> 2. Je donnerai mon avis et les actions à effectuer
> 3. Une fois implémenté, la demande sera déplacée dans "✅ Demandes Implémentées"

**📄 Documentation complète** : Voir [README.md](README.md)  
**📊 Actions à effectuer** : Voir [../STRUCTURE_BDD_ACTIONS.md](../STRUCTURE_BDD_ACTIONS.md)

---

## 📋 Demandes en Attente

### 🔄 Synchronisation des Listes Personnalisables

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Question** : Les modèles de listes personnalisables (Platform, FollowUpType, InterviewType, CallType, EventType) doivent-ils avoir un système de synchronisation (`syncHash`, `entityHash`, `lastSyncAt`) ?

**Contexte** :
- Ces modèles ont déjà `userId` (nullable) et `isPredefined` pour distinguer les entrées système et utilisateur
- Les utilisateurs peuvent créer leurs propres entrées (ex: créer une plateforme "Mon Site Web")
- Ces entrées peuvent être créées/modifiées sur mobile et serveur

**💡 Avis Technique** :

**✅ OUI, je recommande d'ajouter la synchronisation** pour les raisons suivantes :

1. **Création sur mobile** : Si un utilisateur crée une plateforme "Mon Site Web" sur mobile, elle doit être synchronisée avec le serveur
2. **Modifications simultanées** : Si l'utilisateur modifie une plateforme sur mobile ET sur web en même temps, il faut détecter le conflit
3. **Cohérence** : Pour avoir un système de synchronisation cohérent, tous les modèles modifiables par l'utilisateur devraient avoir les mêmes champs
4. **Offline-first** : Si l'application mobile fonctionne en mode offline, les modifications locales doivent être synchronisées plus tard

**⚠️ Exception** : Les entrées système (`userId = null`, `isPredefined = true`) n'ont PAS besoin de synchronisation car elles ne sont jamais modifiées par l'utilisateur.

**📝 Actions à Effectuer** :

- [ ] Ajouter champs de synchronisation aux modèles personnalisables :
  - [ ] `Platform` : `syncHash`, `entityHash`, `lastSyncAt`
  - [ ] `FollowUpType` : `syncHash`, `entityHash`, `lastSyncAt`
  - [ ] `InterviewType` : `syncHash`, `entityHash`, `lastSyncAt`
  - [ ] `CallType` : `syncHash`, `entityHash`, `lastSyncAt`
  - [ ] `EventType` : `syncHash`, `entityHash`, `lastSyncAt`
- [ ] Modifier le service de synchronisation pour gérer ces modèles
- [ ] Tester la synchronisation des listes personnalisables

**📄 Fichiers à Modifier** :
- `backend/prisma/schema.prisma` - Ajouter champs aux modèles
- `backend/auth-service/src/services/sync.service.js` - Gérer synchronisation des listes
- `docs/database/synchronisation.md` - Documenter la synchronisation des listes

**Statut** : 🔴 **À IMPLÉMENTER**

---

## ✅ Demandes Implémentées

*(Aucune pour le moment)*

---

## 📝 Format pour Ajouter une Demande

```markdown
### [Titre de la Demande]

**Date** : YYYY-MM-DD  
**Demandé par** : [Votre nom]

**Description** : [Description détaillée de ce que vous voulez]

**Contexte** : [Pourquoi vous voulez cette modification]

**💡 Avis Technique** : [Mon avis sera ajouté ici]

**📝 Actions à Effectuer** :
- [ ] Action 1
- [ ] Action 2

**📄 Fichiers à Modifier** :
- `chemin/vers/fichier` - Description

**Statut** : 🔴 **À IMPLÉMENTER** | 🟡 **EN COURS** | ✅ **TERMINÉ**
```

---

**Dernière mise à jour** : 2025-01-27

