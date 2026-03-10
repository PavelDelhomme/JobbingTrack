# Guide pratique – Où en est-on et quoi faire maintenant

**À lire en premier** pour savoir exactement quoi faire (backoffice, données de test, suivi intérim, mobile, base de test).

---

## À faire maintenant (priorité)

**Objectif** : aller au bout du **suivi intérim** (backoffice puis application mobile), avec un **mode intérim** activable qui adapte l’interface.

### Étape A – Backoffice (en premier)

1. **Couleurs calendrier**  
   - Événements liés à une candidature **avec** agence → couleur **intérim** (ambre `#F59E0B`).  
   - Événements sans agence → couleur **classique** (bleu `#3B82F6`).  
   - À faire : calcul de la couleur à la création de l’event (backend) ou à l’affichage (frontend) selon `application.agencyId`.

2. **Page dédiée « Suivi intérim »**  
   - Une page (ex. **Administration → Suivi intérim** ou lien « Boîtes d’intérim » déjà présent) qui liste les agences (`companyType = TEMP_AGENCY`) et, pour chaque agence, les candidatures où `agencyId = cette agence`.  
   - Filtres utiles : statut, date.

3. **Toggle « Mode intérim »**  
   - Un interrupteur dans la barre de navigation ou le menu : **activer / désactiver le mode intérim**.  
   - Quand activé : mettre en avant Suivi intérim / Boîtes d’intérim, filtres par défaut adaptés, calendrier avec couleurs intérim/classique.  
   - Préférence persistée (ex. `localStorage` ou préférence utilisateur) pour garder le choix.

Spec détaillée : **`docs/features/SUIVI_BOITES_INTÉRIM.md`** (section 4.0 Mode intérim, 4.2, 4.3).

### Étape B – Application mobile Flutter (ensuite)

1. **Valider le parcours vérification email** (si pas encore fait) : **`docs/mobile/PROCHAINES_ETAPES.md`**.
2. **Toggle « Mode intérim »** (Paramètres ou accueil) : quand activé, afficher l’onglet/écran **Intérim**, champs **agence** visibles dans les formulaires candidature, calendrier avec couleurs intérim ; quand désactivé, vue classique. Préférence persistée (SharedPreferences ou profil).
3. **Champs agence** : choix de la boîte d’intérim à la création/édition de candidature.
4. **Écran « Intérim »** : liste des agences, puis pour une agence liste des candidatures liées.
5. **Calendrier** : couleurs distinctes (classique vs intérim).

Références mobile : **`docs/mobile/PROCHAINES_ETAPES.md`**, **`docs/mobile/APPLICATION_MOBILE_A_FAIRE.md`**, **`docs/features/SUIVI_BOITES_INTÉRIM.md`**.

---

## 1. Quelle base de données pour quoi ?

| Ce que tu fais | Base utilisée | À savoir |
|----------------|---------------|----------|
| **Backoffice** (admin, navigation, Données de test, Entreprises, Candidatures, etc.) | **Base principale** | C’est toujours la base principale. Aucun changement : `make up-full` → tout pointe vers `postgres:5432/jobbingtrack`. |
| **Générer des données de test** (bouton dans le backoffice) | **Base principale** | Les données sont insérées dans la base principale pour que tu puisses démo et naviguer. Tu peux les nettoyer avec « Nettoyer les données de test ». |
| **Émulateur mobile / tests en live** (APK sur appareil, parcours depuis le backoffice) | **Base principale** | L’app mobile et l’API parlent à la même stack que le backoffice → base principale. Donc **pour tester en live avec l’émulateur**, tu restes sur la base principale. |
| **Tests automatisés** (`make test-database`, `make test-full`, etc.) | **Base principale** (actuellement) | Aujourd’hui les tests make utilisent la base principale. Si tu veux qu’ils utilisent la **base de test** pour ne pas polluer la principale : après `make up-test` et `make db-replicate-schema-to-test`, il faudrait que les scripts de test lisent `TEST_DATABASE_URL` ou que tu lances les tests avec `DATABASE_URL=...@localhost:5434/...`. Ce n’est pas encore branché par défaut. |

**En résumé** :  
- **Backoffice + émulateur en live** → base **principale** (rien à changer).  
- **Base de test** : tu as créé la réplique du schéma ; tu peux t’en servir pour des tests automatisés ou de la génération de données ciblée en pointant `DATABASE_URL` vers `localhost:5434` quand tu lances un script à part. Pour l’usage quotidien (backoffice, emulateur), tu continues avec la principale.

---

## 2. Suivi boîtes d’intérim – Ce qui est fait vs ce qui reste

### Déjà fait (backend + backoffice de base)

- **BDD** : `Company.companyType` (EMPLOYER | TEMP_AGENCY), `Application.agencyId`.
- **API** : create/update company avec `companyType`, filtre `?companyType=TEMP_AGENCY` ; create/update application avec `agencyId`, réponses avec relation `agency`.
- **Backoffice** :  
  - Administration → Gestion des données → **Entreprises** et **Boîtes d’intérim** (lien vers entreprises filtrées).  
  - Page Entreprises : filtre Type (Toutes / Employeur / Boîte d’intérim), colonne Type, création/édition avec type.  
  - Données de test → Candidatures : champ optionnel **Agence (boîte d’intérim)**.
- **Données de test** : le script crée 2 boîtes d’intérim (Randstad, Manpower) et affecte `agencyId` à une partie des candidatures.

### À faire pour aller au bout du suivi intérim (spec `docs/features/SUIVI_BOITES_INTÉRIM.md`)

1. **Calendrier – Couleurs**  
   - Événements liés à une candidature **avec** `agencyId` → couleur **intérim** (ex. ambre `#F59E0B`).  
   - Événements sans agence → couleur **classique** (ex. bleu `#3B82F6`).  
   - À faire côté **backoffice** (et plus tard mobile) : soit définir la couleur à la création de l’event (backend), soit la calculer à l’affichage (frontend) selon `application.agencyId`.

2. **Backoffice – Page / vue dédiée « Suivi intérim »**  
   - Une page qui liste les **Company** avec `companyType = TEMP_AGENCY` (ou réutiliser la liste Entreprises filtrée « Boîtes d’intérim » déjà en place).  
   - Depuis une agence : liste des **Application** où `agencyId = cette agence`.  
   - Optionnel : filtre « Candidatures classiques » (`agencyId = null`) vs « Intérim » dans la liste des candidatures.

3. **Mobile Flutter**  
   - Mêmes champs : choix **agence** (boîte d’intérim) à la création/édition de candidature.  
   - Écran ou onglet **« Intérim »** / « Suivi intérim » (liste des agences + propositions par agence).  
   - Calendrier : couleurs distinctes (classique vs intérim).

Tu peux t’appuyer sur la spec **`docs/features/SUIVI_BOITES_INTÉRIM.md`** pour le détail (couleurs, interface, API).

---

## 3. Application mobile Flutter – Où on en est

- **Fait** (d’après STATUS.md) : formulaire candidature (création + édition), détail candidature avec relances/entretiens/appels, écran Entretiens, providers branchés sur l’API.
- **À valider en premier** : parcours **vérification email** (inscription → mail → clic lien → vérifié → connexion → accueil). Voir **`docs/mobile/PROCHAINES_ETAPES.md`**.
- **Ensuite** : accueil/dashboard, navigation (bottom nav, drawer), tous les écrans (Entreprises, Contacts, Relances, Événements, Profil, Paramètres, Notifications), puis **suivi intérim** (agence, écran Intérim, couleurs calendrier).

Références : **`docs/mobile/PROCHAINES_ETAPES.md`** (ordre des étapes), **`docs/mobile/APPLICATION_MOBILE_A_FAIRE.md`** (écrans), **STATUS.md** (Phase 3, mobile).

---

## 4. Ordre recommandé des actions (à faire dans l’ordre)

1. **Vérifier que la stack et la BDD sont à jour**  
   - `make up-full` (si besoin).  
   - `make db-push-all` (schéma à jour, dont companyType / agencyId).  
   - `make seed-auth` si tu as besoin d’un admin propre.

2. **Backoffice – Données de test**  
   - Te connecter au backoffice en admin.  
   - Aller dans **Données de test** (ou équivalent).  
   - Générer des données de test (preset standard ou mobile).  
   - Vérifier dans **Administration → Entreprises** qu’il y a des entreprises, et dans **Boîtes d’intérim** (ou filtre « Boîte d’intérim ») que Randstad et Manpower apparaissent.  
   - Vérifier dans **Candidatures** (ou Données de test → Candidatures) qu’une partie des candidatures ont une agence renseignée.

3. **Backoffice – Suivi intérim (suite)**  
   - Implémenter les **couleurs calendrier** (intérim = ambre, classique = bleu) selon la spec.  
   - Créer ou compléter la **page dédiée « Suivi intérim »** (liste agences + propositions par agence).  
   - Ajouter le **toggle « Mode intérim »** (navigation + préférence persistée).  
   - Voir **`docs/features/SUIVI_BOITES_INTÉRIM.md`** (sections 4.0, 4.2, 4.3).

4. **Mobile – Validation puis Flutter**  
   - Valider **à la main** le parcours vérification email (voir `docs/mobile/PROCHAINES_ETAPES.md`).  
   - Puis enchaîner sur l’app Flutter (dashboard, écrans, profil, paramètres, notifications).  
   - **Suivi intérim mobile** : toggle Mode intérim, champs agence, écran Intérim, couleurs calendrier (spec `docs/features/SUIVI_BOITES_INTÉRIM.md`).

5. **Base de test (optionnel)**  
   - Pour **ne pas** mélanger tests automatisés et données de prod/démo :  
     - `make up-test` puis `make db-replicate-schema-to-test`.  
     - Pour les tests qui doivent tourner sur la base de test : les lancer avec `DATABASE_URL` pointant vers `localhost:5434` (ou adapter les scripts pour utiliser `TEST_DATABASE_URL`).  
   - Pour **l’émulateur et le backoffice en live** : continuer à utiliser la **base principale** (comportement actuel).

---

## 5. Récap en une phrase par thème

- **Backoffice / utilisateurs** : tout reste sur la **base principale** ; les mises à jour pour les utilisateurs, les données de test et le suivi intérim (entreprises, candidatures, agences) se font comme aujourd’hui, avec les nouvelles options (type entreprise, agence sur candidature).
- **Test-data** : génération dans la **base principale** depuis le backoffice ; le script crée déjà des boîtes d’intérim et des candidatures avec agence ; tu peux vérifier dans les listes Backoffice.
- **Suivi intérim** : il reste les **couleurs calendrier**, la **page dédiée** Suivi intérim et le **toggle Mode intérim** en backoffice ; puis en **mobile** : toggle Mode intérim, champs agence, écran Intérim, couleurs calendrier (spec `docs/features/SUIVI_BOITES_INTÉRIM.md`).
- **Application mobile Flutter** : d’abord **valider le parcours vérification email**, puis compléter les écrans et la navigation, puis ajouter l’intérim (agence, écran, calendrier).
- **BDD de test** : tu as la **réplique du schéma** ; pour l’émulateur et le backoffice en live tu utilises la **base principale** ; la base de test sert aux **tests automatisés** (ou scripts à part) si tu configures `DATABASE_URL` / `TEST_DATABASE_URL` vers le conteneur test (port 5434).

---

## 6. Fichiers à avoir sous la main

| Besoin | Fichier |
|--------|---------|
| Vue d’ensemble projet, priorités, commandes | **`STATUS.md`** |
| Migrations, principale vs test | **`docs/database/MIGRATIONS_ET_BASES.md`** |
| Spec suivi intérim (couleurs, interface, API) | **`docs/features/SUIVI_BOITES_INTÉRIM.md`** |
| Ordre des étapes mobile (vérif email puis Flutter) | **`docs/mobile/PROCHAINES_ETAPES.md`** |
| Écrans mobile à faire | **`docs/mobile/APPLICATION_MOBILE_A_FAIRE.md`** |
| Ce guide (résumé « quoi faire maintenant ») | **`docs/GUIDE_ETAPES_ACTUELLES.md`** (ce fichier) |
| Index doc (ports, performance, parcours, BDD, tests mobile, perf frontend) | **`docs/INDEX.md`** — section « Où trouver quoi » |
