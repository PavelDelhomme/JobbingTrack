# 🔄 Système de Synchronisation avec Hash

**Retour** : [Index Documentation BDD](README.md)

> Documentation complète du système de synchronisation avec hash SHA-256 pour détection de modifications et résolution de conflits.

---

## Principe

Le système de synchronisation permet de :
- Détecter les modifications locales vs serveur
- Résoudre les conflits lors de synchronisation
- Optimiser les transferts de données (seulement les modifications)
- Assurer la cohérence des données entre client et serveur

---

## Champs de Synchronisation à Ajouter

**À ajouter à TOUS les modèles applicatifs** :
- `syncHash` : String? - Hash calculé pour détection de modifications (SHA-256)
- `entityHash` : String? - Hash de l'entité complète pour comparaison
- `lastSyncAt` : DateTime? - Timestamp de dernière synchronisation réussie

### Modèles Concernés

Tous les modèles applicatifs doivent avoir ces champs :
- ✅ `User` - Déjà présent (à vérifier)
- ⚠️ `Company` - **À AJOUTER**
- ⚠️ `Application` - **À AJOUTER**
- ⚠️ `Contact` - **À AJOUTER**
- ⚠️ `FollowUp` - **À AJOUTER**
- ⚠️ `Call` - **À AJOUTER**
- ⚠️ `Interview` - **À AJOUTER**
- ⚠️ `Event` - **À AJOUTER**
- ⚠️ `Document` - **À AJOUTER**

---

## Calcul du Hash

**Algorithme** : SHA-256

**Champs inclus dans le hash** (tous les champs modifiables sauf timestamps et hash) :
- Pour `Application` : `userId`, `companyId`, `platformId`, `position`, `description`, `jobUrl`, `location`, `contractType`, `workMode`, `applicationDate`, `applicationType`, `status`, `salaryMin`, `salaryMax`, `salaryNegotiable`, `notes`, `archived`, `archivedAt`
- Même principe pour tous les autres modèles

**Format** : `SHA256(JSON.stringify(sortedFields))`

---

## Logique de Synchronisation

1. **Création locale** :
   - `syncHash` = null
   - `entityHash` = hash calculé
   - `lastSyncAt` = null
   - Ajout dans `SyncQueue` avec action `CREATE`

2. **Modification locale** :
   - `syncHash` = hash précédent (pour comparaison)
   - `entityHash` = nouveau hash calculé
   - `lastSyncAt` = null (non synchronisé)
   - Ajout dans `SyncQueue` avec action `UPDATE`

3. **Synchronisation réussie** :
   - `syncHash` = `entityHash` (synchronisé)
   - `lastSyncAt` = now()
   - Suppression de `SyncQueue`

4. **Résolution de conflits** :
   - Si `syncHash` local ≠ `syncHash` serveur → Conflit détecté
   - Stratégie : Last-Write-Wins ou merge manuel selon configuration

---

## Implémentation Requise

### Service de Synchronisation

**Fichier** : `backend/auth-service/src/services/sync.service.js`

**Fonctionnalités** :
- Calcul de hash SHA-256 pour chaque entité
- Comparaison de hashs pour détection de modifications
- Résolution de conflits (Last-Write-Wins ou merge)
- Gestion de la queue de synchronisation
- Synchronisation incrémentale (seulement les modifications)

### Champs à Ajouter dans le Schéma Prisma

**Pour tous les modèles applicatifs** :
```prisma
// Synchronisation
syncHash      String?   // Hash pour détection de modifications
entityHash    String?   // Hash de l'entité complète
lastSyncAt    DateTime? // Timestamp de dernière synchronisation
```

### Calcul du Hash - Exemple

**Fonction** : `calculateEntityHash(entity)`

**Algorithme** :
1. Extraire tous les champs modifiables (exclure `id`, `createdAt`, `updatedAt`, `deletedAt`, `syncHash`, `entityHash`, `lastSyncAt`)
2. Trier les champs par ordre alphabétique
3. Créer un objet JSON avec les valeurs
4. Calculer SHA-256 de la chaîne JSON

**Exemple pour Application** :
```javascript
const fields = {
  userId: entity.userId,
  companyId: entity.companyId,
  platformId: entity.platformId,
  position: entity.position,
  description: entity.description,
  // ... tous les autres champs modifiables
};
const hash = SHA256(JSON.stringify(sortKeys(fields)));
```

### Workflow de Synchronisation

1. **Client (Mobile/Web)** :
   - Modification locale → Calcul `entityHash` → `syncHash` = null → Ajout dans `SyncQueue`
   - Synchronisation → Envoi des entités avec `syncHash` et `entityHash`

2. **Serveur** :
   - Réception → Comparaison `syncHash` serveur vs `syncHash` client
   - Si identique → Pas de conflit → Mise à jour
   - Si différent → Conflit détecté → Résolution selon stratégie
   - Mise à jour `syncHash` = `entityHash` et `lastSyncAt` = now()

3. **Résolution de Conflits** :
   - **Last-Write-Wins** : Prendre la version la plus récente (`updatedAt`)
   - **Merge** : Fusionner les champs modifiés (stratégie avancée)
   - **Manuel** : Demander à l'utilisateur de choisir

---

**Retour** : [Index Documentation BDD](README.md)

