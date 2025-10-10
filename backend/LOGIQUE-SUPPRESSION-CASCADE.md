# 🗑️ Logique de Suppression en Cascade et Archivage

## 📋 Vue d'ensemble

Ce document décrit la logique de suppression (soft delete), d'archivage et de suppression en cascade pour toutes les entités du système JobbingTrack.

---

## 🎯 Principes de Base

### 1. **Soft Delete (Corbeille)**
- Tous les modèles ont un champ `deletedAt` (nullable)
- Quand un élément est "supprimé", on met `deletedAt = new Date()`
- L'élément reste dans la BDD mais est filtré des requêtes normales
- Permet une restauration facile

### 2. **Archivage**
- Tous les modèles ont un champ `archivedAt` (nullable)
- Pour marquer des données comme inactives mais conservées
- Les archives ne sont pas affichées par défaut mais accessibles

### 3. **Suppression en Cascade**
- Utilise les règles Prisma `onDelete: Cascade` ou `onDelete: SetNull`
- Automatique au niveau de la base de données

---

## 🔗 Hiérarchie et Règles de Cascade

### **Niveau 1: Utilisateur (User)**
```
User
├── Applications (CASCADE)
├── Contacts (CASCADE)
├── Documents (CASCADE)
├── Templates (CASCADE)
└── Reminders (CASCADE)
```

**Règle**: Si un utilisateur est supprimé → TOUT est supprimé

---

### **Niveau 2: Candidature (Application)**
```
Application
├── Interviews (CASCADE)
├── FollowUps (CASCADE)
├── Calls (CASCADE)
├── ApplicationDocuments (CASCADE)
├── ApplicationContacts (CASCADE)
└── Activities (CASCADE)
```

**Règles de suppression**:
1. **Mise à la corbeille d'une candidature**:
   - `Application.deletedAt = now()`
   - Les entretiens/appels/relances liés sont automatiquement cachés (car liés à une candidature supprimée)
   - Mais techniquement ils restent en BDD

2. **Suppression définitive d'une candidature**:
   - CASCADE automatique → Tous les entretiens, appels, relances, etc. sont SUPPRIMÉS
   - Les documents ne sont PAS supprimés (SetNull)
   - Les contacts ne sont PAS supprimés (ils peuvent exister indépendamment)

---

### **Niveau 3: Éléments Indépendants**

#### **Contact**
```
Contact
├── ApplicationContacts (CASCADE) - Liaison seulement
├── FollowUps (SetNull) - Relance reste mais contact = null
├── Calls (SetNull) - Appel reste mais contact = null
└── Activities (CASCADE)
```

**Règles**:
- Un contact peut exister **SANS candidature** (lié juste à une entreprise)
- Un contact peut être lié à **PLUSIEURS candidatures** via `ApplicationContact`
- Si on supprime un contact:
  - Les liaisons `ApplicationContact` sont supprimées (CASCADE)
  - Les relances/appels gardent juste `contactId = null` (SetNull)

#### **Entreprise (Company)**
```
Company
├── Applications (Restricted) - Ne peut pas supprimer si applications actives
├── Contacts (SetNull) - Contacts deviennent indépendants
```

**Règles**:
- On ne peut PAS supprimer une entreprise si elle a des candidatures actives
- Si supprimée → Les contacts perdent juste le lien entreprise

---

## 📞 Cas Spécifiques

### **Relance (FollowUp)**
```javascript
// Peut être supprimée SEULE
DELETE /api/v1/followups/:id
→ Seule la relance est supprimée
→ L'événement lié (si existant) peut être supprimé aussi (optionnel)
→ La notification liée peut être supprimée aussi (optionnel)
```

**Logique**:
1. Mise à la corbeille: `FollowUp.deletedAt = now()`
2. CASCADE si la candidature est supprimée
3. SetNull si le contact est supprimé

### **Appel (Call)**
```javascript
// Peut être supprimé SEUL
DELETE /api/v1/calls/:id
→ Seul l'appel est supprimé
→ La candidature reste
→ Le contact reste (juste contactId = null)
```

**Logique**:
1. Mise à la corbeille: `Call.deletedAt = now()`
2. CASCADE si la candidature est supprimée
3. SetNull si le contact est supprimé

### **Entretien (Interview)**
```javascript
// Peut être supprimé SEUL
DELETE /api/v1/interviews/:id
→ Seul l'entretien est supprimé
→ La candidature reste
```

**Logique**:
1. Mise à la corbeille: `Interview.deletedAt = now()`
2. CASCADE si la candidature est supprimée

### **Événement (Event)**
```javascript
// Peut être supprimé SEUL
DELETE /api/v1/events/:id
→ Seul l'événement est supprimé
→ Pas de cascade (événements globaux)
```

---

## 🛠️ Implémentation dans les Controllers

### Soft Delete (Recommandé)
```javascript
// Mise à la corbeille
async deleteFollowup(req, res) {
  const { id } = req.params;
  
  await prisma.followUp.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
  
  res.json({ success: true, message: 'Relance mise à la corbeille' });
}
```

### Hard Delete (Suppression définitive)
```javascript
// Suppression définitive (admin seulement)
async permanentlyDeleteFollowup(req, res) {
  const { id } = req.params;
  
  // Vérifier les permissions admin
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Non autorisé' });
  }
  
  await prisma.followUp.delete({
    where: { id }
  });
  
  res.json({ success: true, message: 'Relance supprimée définitivement' });
}
```

### Restauration
```javascript
// Restaurer depuis la corbeille
async restoreFollowup(req, res) {
  const { id } = req.params;
  
  await prisma.followUp.update({
    where: { id },
    data: { deletedAt: null }
  });
  
  res.json({ success: true, message: 'Relance restaurée' });
}
```

---

## 📊 Requêtes avec Soft Delete

### Exclure les éléments supprimés
```javascript
// Liste sans les éléments supprimés
const followups = await prisma.followUp.findMany({
  where: {
    userId: req.user.id,
    deletedAt: null  // ✅ Exclusion
  }
});
```

### Afficher SEULEMENT la corbeille
```javascript
// Liste de la corbeille
const trashedFollowups = await prisma.followUp.findMany({
  where: {
    userId: req.user.id,
    deletedAt: { not: null }  // ✅ Seulement supprimés
  }
});
```

### Afficher SEULEMENT les archives
```javascript
// Liste des archives
const archivedApplications = await prisma.application.findMany({
  where: {
    userId: req.user.id,
    archivedAt: { not: null },  // ✅ Seulement archivés
    deletedAt: null  // Mais pas supprimés
  }
});
```

---

## 🎨 Frontend - Affichage

### Onglets recommandés pour chaque page
```
┌─────────────────────────────────────────────┐
│  [Actifs]  [Archives]  [Corbeille]          │
└─────────────────────────────────────────────┘
```

1. **Actifs**: `deletedAt = null AND archivedAt = null`
2. **Archives**: `archivedAt != null AND deletedAt = null`
3. **Corbeille**: `deletedAt != null`

---

## ⚠️ Règles Important

### ✅ CE QUI PEUT être supprimé seul
- Relance (FollowUp)
- Appel (Call)
- Entretien (Interview)
- Événement (Event)
- Notification
- Contact

### ❌ CE QUI NE PEUT PAS être supprimé seul
- Application liée à une entreprise active
- Entreprise avec des candidatures actives
- Utilisateur admin unique

---

## 🔄 Workflow de Suppression Recommandé

### Utilisateur standard
```
1. Clic sur "Supprimer"
   → Soft delete (mise à la corbeille)
   
2. Accès à la corbeille pour restaurer si besoin
   
3. Après 30 jours → Suppression automatique définitive (CRON job)
```

### Admin
```
1. Accès direct à "Supprimer définitivement"
   
2. Confirmation requise
   
3. Suppression CASCADE immédiate
```

---

## 📝 Résumé des Relations

| Entité | Lié à | Type de Cascade |
|--------|-------|-----------------|
| Application → Interview | Candidature | CASCADE |
| Application → FollowUp | Candidature | CASCADE |
| Application → Call | Candidature | CASCADE |
| Application → ApplicationContact | Candidature | CASCADE |
| Contact → ApplicationContact | Contact | CASCADE |
| Contact → FollowUp | Contact | SetNull |
| Contact → Call | Contact | SetNull |
| Company → Contact | Entreprise | SetNull |
| User → Application | Utilisateur | CASCADE |
| User → Contact | Utilisateur | CASCADE |

---

## 🎯 Prochaines Étapes

1. ✅ Ajouter `deletedAt` et `archivedAt` à TOUS les modèles
2. ✅ Créer les routes de corbeille/archives
3. ✅ Implémenter les filtres dans les controllers
4. ⏳ Créer l'UI frontend pour corbeille/archives
5. ⏳ Ajouter un CRON job de nettoyage automatique (30 jours)
6. ⏳ Ajouter les permissions admin pour suppression définitive

---

**Dernière mise à jour**: 2025-10-10
**Version**: 1.0

