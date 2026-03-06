# Prochaines étapes – Mobile

Ce document décrit **dans l’ordre** ce qu’il reste à faire : d’abord **valider manuellement** le parcours vérification email, puis **travailler sur l’application Flutter** une fois que c’est validé.

---

## make down / make up-full : persistance des données (admin, BDD)

- **`make down`** : arrête tous les services **sans supprimer les volumes**. Les données (Postgres, Redis, **compte admin**, métriques, etc.) sont **conservées**. Au prochain **`make up-full`**, l’admin et tout le reste sont toujours là.
- **`make down-clean`** : arrête les services **et supprime les volumes** (tout est effacé). Après un **`make up-full`**, il faut recréer l’admin : **`make create-admin-user`** (ou **`make seed-auth`**).

Donc pour un cycle normal **make down && make up-full** : utilise **`make down`** (sans `-clean`) pour garder l’admin et la BDD.

**Ordre correct si tu veux tout repartir de zéro puis recréer l’admin :**
1. **`make down-clean`** (arrêt + suppression des volumes)
2. **`make up-full`** (redémarrage des services)
3. **`make seed-auth`** (création de l’admin dans le conteneur auth-service)

⚠️ **Ne pas faire** `make down-clean && make seed-auth` dans la même commande : après `down-clean` les conteneurs sont arrêtés, donc `seed-auth` échouerait. Faire **up-full** entre les deux.

---

## Partie 1 – Validation manuelle du parcours vérification email

Objectif : vérifier de bout en bout que **inscription → email reçu → clic lien → app → email vérifié → connexion → accueil** fonctionne.

### Prérequis

- Stack démarrée : `make up-full`
- Émulateur Android ou téléphone connecté (USB débogage)
- Contrôleur émulateur : `make emulator-controller` (ou bouton « Démarrer le contrôleur » depuis le backoffice)
- Backoffice : http://localhost:5003 (ou 5002 selon config) → se connecter en admin

### Étapes à faire à la main

1. **Ouvrir l’émulateur mobile**  
   - Aller sur **Backoffice → Émulateur mobile** (`/backoffice/mobile-emulator`).
   - Vérifier le contrôleur (bouton « Vérifier »), sélectionner un appareil ADB.
   - Si besoin : **Build APK** puis **Installer et lancer** pour avoir l’app sur l’appareil.

2. **Nettoyer un compte test (optionnel)**  
   - Dans la même page, section « Nettoyer un compte test », choisir un utilisateur de test existant et le supprimer pour repartir de zéro avec une nouvelle inscription.

3. **Inscription depuis l’app**  
   - Sur l’appareil : ouvrir l’app JobbingTrack.
   - Aller sur **Créer un compte** / Inscription.
   - Remplir : prénom, nom, **email** (une adresse où tu peux recevoir le mail, ex. Gmail / Proton), mot de passe (+ confirmation).
   - Valider l’inscription.
   - Vérifier que l’écran indique un message du type « Vérifiez votre email » ou redirection vers la connexion.

4. **Réception du mail**  
   - Sur ton ordinateur ou ton téléphone : ouvrir la boîte mail de l’adresse utilisée.
   - Vérifier qu’un **email de vérification JobbingTrack** est bien reçu (selon config : MailHog http://localhost:8025 ou SMTP réel).
   - Optionnel : **Backoffice → Email Monitor** pour voir les mails envoyés en temps réel.

5. **Clic sur le lien dans l’email**  
   - Dans le mail, cliquer sur le **lien de vérification** (ex. `http://.../verify-email?token=...` ou lien deep link vers l’app).
   - Si le lien ouvre le **navigateur** : la page web appelle l’API de vérification puis affiche succès/erreur.
   - Si le lien ouvre **l’app mobile** (deep link) : l’app doit afficher l’écran de vérification et appeler l’API `GET /auth/verify-email/:token` (ou équivalent avec le token en query). Vérifier que l’écran affiche **succès** (email vérifié).

6. **Connexion**  
   - Revenir sur l’app (ou l’ouvrir si le lien était dans le navigateur).
   - Aller sur **Connexion**.
   - Saisir le **même email** et le **mot de passe** utilisés à l’inscription.
   - Valider : la connexion doit **réussir** (plus de refus « email non vérifié »).
   - Vérifier que l’app redirige vers l’**accueil / dashboard**.

7. **Point de contrôle**  
   - Si tout fonctionne : **parcours vérification email = validé manuellement**.
   - Si quelque chose bloque (mail pas reçu, lien invalide, token expiré, erreur dans l’app) : noter l’étape et l’erreur pour corriger (voir STATUS.md section 3.5, ou docs techniques auth/notifications).

### En cas de problème

- **Mail pas reçu** : vérifier MailHog (dev) ou les logs du service notification / SMTP.
- **Lien « token expiré ou invalide »** : vérifier que l’app envoie bien le token à l’API (query ou path), et que l’endpoint `GET/POST /auth/verify-email` est bien appelé avec ce token.
- **Login toujours refusé après clic** : vérifier en BDD que l’utilisateur a bien `emailVerified: true` après l’appel de vérification (auth-service).

---

## Partie 2 – Une fois la vérification email validée : suite sur l’app Flutter

Quand le parcours **inscription → vérification email → connexion → accueil** est validé manuellement, enchaîner sur l’application Flutter elle‑même.

### Priorités (dans l’ordre)

1. **Accueil / Dashboard**  
   - Écran d’accueil après connexion (`home_screen.dart`) : résumé (nombre de candidatures, prochains entretiens, etc.), liens rapides vers les sections.
   - Si pas encore en place : **navigation principale** (bottom navigation bar + éventuellement drawer) pour accéder à Candidatures, Entreprises, Contacts, Entretiens, Relances, Événements, Profil, Paramètres.

2. **Candidatures**  
   - Liste des candidatures (API `GET /applications`), création / édition (formulaire déjà avancé d’après STATUS.md), détail avec relances / entretiens / appels.
   - Vérifier que les appels API utilisent bien l’API Gateway (URL configurée) et le token stocké après login.

3. **Entreprises, Contacts, Entretiens, Relances, Événements**  
   - Vérifier chaque écran : liste, création, détail, liaison aux candidatures/entreprises si besoin.
   - Aligner avec les endpoints décrits dans `docs/api/api-reference/README.md`.

4. **Profil et Paramètres**  
   - Profil : complétion / édition, appel `PUT /profiles/me` (ou équivalent).
   - Paramètres : préférences, thème, notifications, **déconnexion** (suppression token + redirection vers login).

5. **Notifications**  
   - Liste des notifications (API), marquer comme lu.
   - Optionnel : rappels locaux pour entretiens / relances.

6. **Recherche et Statistiques**  
   - Recherche globale (candidatures, contacts, etc.) et écran statistiques / dashboard si prévu.

### Références

- **Écrans et fichiers** : `docs/mobile/APPLICATION_MOBILE_A_FAIRE.md` (tableau des écrans).
- **API** : `docs/api/api-reference/README.md`.
- **Fonctionnalités détaillées** : `FONCTIONNALITES.md` section 10 (processus métier mobile).
- **Checklist détaillée** : `STATUS.md` (sections Phase 3, Application mobile).

---

## Résumé

| Étape | Action |
|-------|--------|
| 1 | Valider **manuellement** : inscription → email → clic lien → vérification → connexion → accueil. |
| 2 | Une fois validé : travailler sur **l’app Flutter** (dashboard, navigation, écrans Candidatures / Entreprises / etc., profil, paramètres). |

Document à mettre à jour au fur et à mesure (cocher les validations dans STATUS.md).
