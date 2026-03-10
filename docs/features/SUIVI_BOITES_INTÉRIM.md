# Suivi boîtes d'intérim et candidatures classiques

Ce document décrit la **double voie** : suivi des **candidatures classiques** (recherche directe) et suivi des **propositions/missions via des boîtes d'intérim**, avec une interface dédiée et des couleurs distinctes sur le calendrier.

---

## 1. Objectifs

- **Savoir quelle boîte d'intérim a permis quelle proposition** : lier chaque candidature/mission à l'agence d'intérim concernée quand elle passe par une agence.
- **Couleur dédiée sur le calendrier** : afficher les événements liés à l'intérim (propositions, entretiens, missions) dans une **couleur distincte** (ex. orange/ambre) par rapport aux candidatures classiques (ex. bleu).
- **Interface séparée** : une section **« Boîtes d'intérim »** / **« Suivi intérim »** en plus de la gestion classique **« Candidatures »** / **« Recherche classique »**, pour gérer proprement les agences et les propositions qui en découlent.

---

## 2. Modèle de données (fait)

### 2.1 Company

- **`companyType`** (enum) : `EMPLOYER` | `TEMP_AGENCY`
  - `EMPLOYER` : entreprise employeuse classique (recherche directe).
  - `TEMP_AGENCY` : boîte d'intérim (agence qui envoie des propositions/missions).
- **Relations** :
  - `applications` : candidatures où cette company est **l'employeur** (entreprise utilisatrice).
  - `applicationsViaAgency` : candidatures où cette company est **l'agence d'intérim** (`Application.agencyId`).

### 2.2 Application

- **`agencyId`** (optionnel) : référence vers une **Company** de type `TEMP_AGENCY`. Si renseigné, la candidature/proposition est passée par cette boîte d'intérim.
- **`companyId`** : reste l'**entreprise employeuse** (client final ou agence elle-même si candidature directe à l'agence).

Exemples :

- Candidature classique (recherche directe) : `companyId` = entreprise X, `agencyId` = null.
- Mission reçue via Randstad : `companyId` = entreprise cliente (ou Randstad si mission « agence »), `agencyId` = Randstad (Company avec `companyType = TEMP_AGENCY`).

### 2.3 Event (calendrier)

- Le modèle **Event** garde son champ **`color`**.
- **Règle d'affichage** :
  - Si l'événement est lié à une **Application** qui a **`agencyId != null`** → couleur **intérim** (ex. `#F59E0B` / ambre).
  - Sinon → couleur **classique** (ex. `#3B82F6` / bleu) ou couleur du type d'événement existant.

La couleur peut être calculée à la création de l'event (backend) ou au moment de l'affichage (frontend).

---

## 3. Couleurs calendrier (à implémenter)

| Contexte | Couleur suggérée | Usage |
|----------|------------------|--------|
| Candidature / événement **classique** | `#3B82F6` (bleu) | Recherche directe, pas d'agence |
| Candidature / événement **intérim** | `#F59E0B` (ambre/orange) | Proposition ou mission via une boîte d'intérim |

---

## 4. Interface dédiée « Boîtes d'intérim » (à implémenter)

### 4.0 Mode intérim (backoffice : en place ; mobile : à implémenter)

- **Objectif** : un **mode intérim** activable/désactivable qui adapte l’application (navigation, filtres, couleurs).
- **Backoffice** :
  - **Toggle « Mode intérim »** : dans **Paramètres** (icône engrenage) → onglet **Affichage** ; persistance dans `localStorage` (`backoffice_interim_mode`). Quand activé, la navigation peut mettre en avant Suivi intérim et le calendrier affiche les couleurs intérim/classique (voir 4.1).
  - À étendre : filtre par défaut sur les candidatures « Intérim » / « Toutes » selon le mode.
- **Mobile Flutter** :
  - **Paramètre / toggle « Mode intérim »** (ex. Paramètres ou écran d’accueil) : quand activé, affichage de l’onglet/écran **Intérim**, champs **agence** visibles dans les formulaires candidature, calendrier avec couleurs intérim. Quand désactivé, vue classique (pas d’onglet Intérim, agence optionnel masqué ou en bas de formulaire).
  - Préférence persistée (SharedPreferences ou profil utilisateur) pour conserver le choix.

### 4.1 Menu / navigation

- **Backoffice** : entrée **« Boîtes d'intérim »** ou **« Suivi intérim »** (à côté de Candidatures, Entreprises). **En place** : Gestion des données → **Suivi intérim** (`/backoffice/suivi-interim`) et onglet Suivi intérim dans Données applicatives (`/backoffice/datas`). Toggle « Mode intérim » (4.0) à implémenter dans le menu ou les paramètres.
- **Mobile** : onglet ou écran **« Intérim »** distinct de **« Candidatures »**.

### 4.2 Liste des boîtes d'intérim

- Afficher les **Company** avec **`companyType = TEMP_AGENCY`**.
- Pour chaque agence : nom, contact, nombre de candidatures/missions liées.
- Actions : créer une agence, éditer, archiver, voir les propositions liées.

### 4.3 Propositions par agence

- Depuis une agence : liste des **Application** où **`agencyId` = cette agence**.
- Filtres : statut, date, entreprise cliente.

### 4.4 Séparation classique / intérim

- **Vue Candidatures classique** : filtre **`agencyId = null`**.
- **Vue Intérim** : filtre **`agencyId != null`** ou par agence.
- **Calendrier** : filtre optionnel « Toutes / Classiques / Intérim » et couleurs distinctes.

---

## 5. API (à adapter)

- **Company** : champ **`companyType`** en CRUD, filtre `?companyType=TEMP_AGENCY`.
- **Application** : champ **`agencyId`** en CRUD, inclure **`agency`** dans les réponses, filtre `?agencyId=xxx` ou `?viaAgency=true`.
- **Event** : définir **`color`** selon **`application.agencyId`** à la création ou à l'affichage.

---

## 6. Ordre d'implémentation

1. **BDD** : migration Prisma (schéma auth-service mis à jour ; propager aux autres services et exécuter migration).
2. **API** : company-service et application-service (champs + filtres + relation `agency`).
3. **Backoffice** : formulaire Company avec `companyType`, formulaire Application avec choix agence, page « Boîtes d'intérim », couleurs calendrier, **toggle « Mode intérim »** (navigation + préférence).
4. **Mobile** : mêmes champs, **toggle « Mode intérim »** (Paramètres ou accueil), écran Suivi intérim, couleurs calendrier.

---

## 7. Fichiers concernés

| Zone | Fichiers |
|------|----------|
| Schéma BDD | `backend/auth-service/prisma/schema.prisma` (Company, Application) — à synchroniser dans les autres services Prisma |
| API Company | `backend/company-service` : controller, filtres `companyType` |
| API Application | `backend/application-service` : controller, `agencyId`, relation `agency` |
| Backoffice | Page **Suivi intérim** : `backoffice/suivi-interim`, composant partagé `backoffice/datas/components/SuiviInterimContent.tsx` ; Données applicatives : `backoffice/datas` ; formulaires Company/Application, couleurs calendrier, toggle Mode intérim (à implémenter) |
| Mobile | Écrans listes/détail, formulaire avec choix agence, calendrier |
