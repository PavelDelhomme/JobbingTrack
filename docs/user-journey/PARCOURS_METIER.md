# Parcours de vie métier – JobbingTrack

## Vision

JobbingTrack est un outil personnel de suivi de candidatures pour un chercheur d'emploi. L'utilisateur est le candidat qui suit ses propres candidatures et expériences de travail (intérim inclus).

Ce n'est pas un ATS (outil recruteur/employeur).

## Parcours de vie typique

1. **Auth** : inscription / connexion (User).
2. **Entreprises** : le candidat crée ou réutilise des Company (entreprises ciblées).
3. **Candidatures** : pour chaque entreprise / offre, il crée une Application (position, statut, date, plateforme). Une Application appartient à un User et à une Company.
4. **Contacts** : il associe des Contact (recruteurs, RH) à des entreprises et candidatures.
5. **Entretiens** : pour une Application, il planifie des Interview (date, type, lieu).
6. **Appels** : il enregistre des Call (sujet, date, durée) liés à une Application.
7. **Relances** : il crée des FollowUp (type, date, notes) liés à une Application.
8. **Événements** : Event (calendrier) liés au User, optionnellement à une Application, Interview, Call, FollowUp.
9. **Profil** : Profile (bio, liens, préférences) 1–1 avec User.
10. **Notifications** : Notification (type, entityType, entityId, readAt) pour le User.
11. **Dashboard / Stats** : agrégation et analytics.

## Ce que les 36 tests API vérifient

Health des services, auth (login, profile), CRUD companies, applications (list + create), contacts, interviews (list + create), calls, events, followups, profile, notifications, métriques, dashboard.

Le coeur métier (candidature → entretien / appel / relance / événement) est couvert.

## À couvrir plus tard (hors Tests API)

- Mise à jour automatique des statuts dans le temps (workflow-service).
- Création / modification en cascade (Event ↔ Application / FollowUp / Interview).
- Cases / formulaires métier complets (parcours utilisateur E2E + Playwright).
- Traitement des statuts et workflow-service (jobs, cron).

## Vision mobile (candidat intérim)

L'application doit permettre au candidat de suivre, gérer et piloter l'ensemble de ses expériences travail côté intérim : ses demandes, ce qu'il a en cours, les propositions qu'il reçoit.

### Fonctionnalités prioritaires (applicatif)

- **Auth** : inscription, connexion, persistance session, synchronisation offline/online.
- **Backend API** : APIs stables et sécurisées.
- **Suivi candidat** : demandes, en cours, propositions reçues.
- **Test dans l'émulateur** : tester l'application de bout en bout.

### Ordre de travail recommandé

1. Inscription, connexion, session, synchronisation et APIs backend.
2. Backoffice administrateur, parcours, rapports.
3. Versioning de l'app mobile et déploiement.

## Scénarios User Journey (21 scénarios)

Parcours Complet, Parcours Rapide, Chercheur d'emploi actif, Nouvel utilisateur, Test Mobile complet, Ajouter Appel/Contact à candidature, Gestion contacts, Workflow entretiens, Gestion relances, Planification événements, Workflow entreprises, Cycle de vie candidature, Activité quotidienne, Candidature rapide, Session networking, Préparation entretien, Revue hebdomadaire, Vérification email et reset password, Tests emails complets, Gestion données de test.
