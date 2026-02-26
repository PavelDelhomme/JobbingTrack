# Couverture tests Backoffice (E2E Playwright)

## Ce que couvrent les « Tests Backoffice »

Quand on lance **Tests Backoffice** depuis le hub (`/backoffice/tests`), la commande exécute toute la suite Playwright du frontend (`npm run test:e2e`).

## Spec backoffice (`frontend/tests/e2e/backoffice.spec.ts`)

### Couvert

- **Affichage** : titre, menu, liens Applications / Candidats / Entreprises.
- **Navigation** : Applications, Entreprises, Candidats, Analytics, Utilisateurs.
- **Recherche globale** : champ recherche, résultats.
- **Paramètres** : accès, bouton thème, modification thème + sauvegarde.
- **Déconnexion** : bouton → redirection login.
- **Notifications** : centre de notifications, liste ou « Aucune notification ».
- **Accessibilité** : navigation clavier (Tab, Enter).
- **404** : route inexistante → page 404.
- **Session** : rechargement → utilisateur connecté.
- **RGPD** : lien RGPD → Données personnelles, Export/Suppression.
- **Pages ajoutées** : Rapports de tests, Programmer tests, Données de test, Testeur d'API, hub Tests.
- **Remise à l'état** : ouvrir Créer utilisateur puis Annuler sans soumettre.
- **Apparence** : layout (nav, main), pas de scroll horizontal excessif.

### Non couvert / partiel

- Pages : paramètres avancés, Archives, Corbeille, Logs services/sécurité, User analytics, Email Monitor, Parcours utilisateur.
- Rétention / nettoyage automatique : non testés.
- Rollback BDD : la suite utilise un login mocké.

## Checklist couverture – pages Tests

| # | Page / action | URL | À vérifier |
|---|---------------|-----|------------|
| 1 | Hub Tests | `/backoffice/tests` | Cartes, sélection, lancement, journal, lien rapport |
| 2 | Playwright | `/backoffice/playwright-tests` | Lancement suite complète |
| 3 | Emails | `/backoffice/tests-emails` | Lancement, config SMTP |
| 4 | API | `/backoffice/tests-api` | Lancer, rapport (36 tests) |
| 5 | Backend | `/backoffice/tests-backend` | Lancer, rapport |
| 6 | Frontend | `/backoffice/tests-frontend` | Lancer, rapport |
| 7 | Backoffice E2E | `/backoffice/tests-backoffice` | Lancer, rapport |
| 8 | Sécurité | `/backoffice/tests-security` | Lancer, rapport |
| 9 | Performance | Hub Tests | Backend + Frontend, rapports |
| 10 | Rapports | `/backoffice/test-reports` | Liste, filtre, captures Playwright |
| 11 | Programmer | `/backoffice/performance-tests/schedule` | Créer schedule, lancer maintenant |
| 12 | Parcours prédéfinis | Parcours utilisateur | Lancer, analytics, rapport |
| 13 | Parcours personnalisé | Parcours utilisateur | Étapes, résultats, rapport |
| 14 | Rapports parcours | Lien depuis Parcours | Liste et détail |
