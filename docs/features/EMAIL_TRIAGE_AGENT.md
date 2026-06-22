# Agent email, tâches et accompagnement recherche

Statut : cadrage produit/technique, à implémenter après validation des P0/P1 bloquants.

Référence visuelle fournie par le porteur : [prototype JobbingTrack](https://jobbingtrack.pplx.app).

## Objectif

Créer un assistant JobbingTrack qui lit et trie les emails liés à la recherche d’emploi, relie ces informations aux candidatures/entreprises/entretiens, crée des tâches et événements actionnables, et envoie des récapitulatifs utiles.

Le système doit aider le porteur à :

- savoir quoi faire demain et cette semaine ;
- relancer les entreprises au bon moment ;
- repérer les refus, propositions d’entretien, invitations, événements emploi et salons ;
- préparer les entretiens à venir ;
- préparer des brouillons/réponses depuis l’interface si autorisé, sans envoi automatique ;
- éviter de dépendre d’un outil payant externe à forte consommation.

## Sources à connecter

> **Politique comptes** (dev/tests porteur) : Gmail app password et IMAP OVH/Gmail ne concernent **que** les boîtes du porteur documentées dans **[COMPTES_EMAIL_DEV_ET_TESTS.md](../emails/COMPTES_EMAIL_DEV_ET_TESTS.md)** (Gmail pro, OVH candidatures, compte principal **`paul.delhomme@pm.me`**) — **pas** les comptes d'autres utilisateurs inscrits.

- Un ou plusieurs comptes Gmail de recherche connectés via OAuth et scopes minimaux, configurés hors Git.
- Une ou plusieurs boîtes **IMAP** configurées hors Git, en lecture seule au départ, pour les comptes qui ne passent pas par Gmail ou pour des boîtes candidatures dédiées.
- Boîte JobbingTrack dédiée aux candidatures, alias ou transfert, configurée hors Git.
- Candidatures, entreprises, contacts, relances, appels, entretiens et événements déjà présents dans JobbingTrack.
- Google Tasks et Google Calendar sont obligatoires pour le MVP : tâches de relance/préparation et événements d’entretien doivent être synchronisés proprement.
- Emails transférés automatiquement depuis des plateformes emploi ou recruteurs.

## Décisions d’architecture

- JobbingTrack reste le système central : Make.com/Zapier peuvent dépanner ponctuellement, mais ne doivent pas porter la logique métier ni les décisions de tri.
- Worker planifié interne : import/polling borné, classification, création de tâches/événements et digest quotidien vers 18h.
- Stockage interne des emails utiles uniquement : messages, threads, métadonnées, rattachements et décisions d’agent.
- Envoi du digest par le service email JobbingTrack existant, avec la même configuration SMTP que les emails de reset de mot de passe, validation d’inscription et notifications système (`SMTP_*`, `SMTP_FROM`, `SMTP_REPLY_TO`, `EmailLog`).
- Identité visible du digest : utiliser un expéditeur du domaine JobbingTrack, configurable via `EMAIL_TRIAGE_DIGEST_FROM` (ex. `JobbingTrack <noreply@jobbingtrack.com>`). Une adresse Gmail personnelle peut être lue ou recevoir un digest si l’utilisateur la configure, mais elle ne doit pas devenir l’expéditeur applicatif par défaut.
- Les placeholders `example.invalid` / `jobbingtrack.test` servent uniquement à la documentation et aux tests suivis par Git. En runtime, les adresses réelles viennent du profil utilisateur, d’un réglage admin ou du `.env` gitignoré.
- Moteur déterministe d’abord, sans IA payante obligatoire : règles, dates, statuts, délais de relance, labels et correction manuelle.
- IA locale ensuite, en renfort du moteur de règles : résumé, aide à la rédaction, priorisation et détection de cas ambigus.
- Le cœur de l’agent est la création et la planification de tâches/événements à faire par l’utilisateur. Aucun envoi d’email externe ni archivage massif sans validation utilisateur explicite.
- Le premier usage cible est le compte personnel non-admin du porteur : l’agent recherche d’emploi doit fonctionner pour un utilisateur standard autorisé, pas seulement pour un administrateur. En revanche, cette capacité ne doit pas être activée automatiquement pour tout compte créé.
- Priorité produit confirmée 15/06 : ce lot reste à traiter **en fin de séquence**, après les logs, validations et dettes P0/P1 déjà ouvertes. Ne pas interrompre la finalisation des logs/observabilité pour démarrer l’agent mail.

## Accès et permissions

- Prévoir un droit explicite de type `JOB_SEARCH_AGENT_ENABLED` / feature flag utilisateur, attribué par un administrateur au compte personnel du porteur.
- Un compte nouvellement inscrit, même non-admin valide, ne doit pas pouvoir connecter Gmail, lire des emails, voir les données de recherche d’emploi ou lancer le worker sans activation explicite.
- L’administrateur garde la gouvernance : activation/révocation du droit, audit des changements, visualisation technique limitée, mais ne lit pas les emails personnels par défaut.
- Le compte utilisateur autorisé garde le contrôle de ses comptes Gmail/OAuth : connexion, révocation, revalidation PIN, choix des boîtes lues, choix du destinataire digest, correction des classifications.
- Séparer les permissions backoffice admin des permissions utilisateur : le rôle admin ne donne pas automatiquement accès au contenu email personnel ; le compte personnel non-admin n’obtient pas les droits backoffice.

## Récapitulatifs

Envoyer un email récapitulatif clair, au minimum quotidien vers 18h, avec possibilité d’un récapitulatif hebdomadaire plus large :

- tâches à faire demain ;
- tâches en retard ;
- candidatures sans réponse depuis N jours ;
- relances recommandées ;
- entretiens à préparer ;
- événements emploi proches ;
- emails importants non classés ;
- décisions proposées : créer une tâche, programmer un appel, préparer un entretien, créer un événement, relancer, archiver, rédiger une réponse.

Le digest doit être compréhensible sans ouvrir l’application, mais chaque ligne doit pointer vers l’action JobbingTrack correspondante.

La planification doit être paramétrable par utilisateur à terme : heure quotidienne (`EMAIL_TRIAGE_DIGEST_DAILY_TIME` par défaut `18:00`), activation quotidienne, récapitulatif hebdomadaire optionnel (`EMAIL_TRIAGE_DIGEST_WEEKLY_ENABLED`, jour et heure), fuseau horaire utilisateur. Les horaires proposés doivent rester dans une fenêtre raisonnable `05:00`-`23:00` et être validés avant activation.

Les actions du digest ne doivent pas dépendre uniquement des emails : l’utilisateur doit pouvoir créer manuellement une action à programmer, par exemple appeler un contact ou une entreprise à une date/heure donnée, avec rappel, lien candidature/entreprise/contact, note et synchronisation Google Tasks/Calendar si souhaitée.

## Interface utilisateur dédiée

Ne pas mélanger cette expérience avec le backoffice email transactionnel qui sert aux resets de mot de passe, validations d’inscription et notifications système. Prévoir une interface privée JobbingTrack dédiée, accessible après connexion, orientée recherche d’emploi :

- tableau de bord du jour ;
- dashboard responsive mobile pour consulter rapidement tâches, emails importants, relances, entretiens, appels et événements ;
- file d’emails à traiter ;
- fiches emails reliées à une candidature, entreprise ou contact ;
- historique de communication par candidature/entreprise/contact : emails reçus/envoyés, relances faites, réponses, propositions d’entretien, appels planifiés et appels éventuellement déjà passés si une trace existe dans JobbingTrack ;
- recherche simple dans les emails, candidatures, entreprises, contacts, tâches et événements liés ;
- actions rapides : créer tâche, programmer appel, créer relance, créer événement, archiver, marquer refus, marquer entretien ;
- demandes de revalidation sensibles dans l’interface avec PIN de connexion et clavier numérique affiché automatiquement ;
- rédaction assistée de réponse ;
- aperçu des emails envoyés/reçus par candidature ;
- configuration des comptes et adresses de transfert ;
- historique des décisions de l’agent et possibilité de corriger.

Décision produit à confirmer avant implémentation : cette interface doit être un espace utilisateur connecté distinct du backoffice admin. Le backoffice reste accessible via `/b4ck0ff1ce` pour l’administration, les tests, la sécurité et les emails système. L’espace utilisateur doit être accessible depuis `/` et porter le suivi de recherche d’emploi, le dashboard, les tâches, les emails utiles, le calendrier et les actions de l’agent.

## Architecture frontend cible

- Court terme : conserver une base de code frontend Next.js unique si c’est le plus simple, avec routes séparées (`/` pour l’espace utilisateur, `/b4ck0ff1ce` pour le backoffice) et composants partagés.
- Moyen terme : préparer une séparation déployable en deux surfaces : `user-frontend` pour l’espace utilisateur et `backoffice-frontend` pour l’administration, avec une bibliothèque commune de composants, hooks, API clients, design tokens et validations.
- Le routage public/local cible : `https://jobbingtrack.localhost:5443/` pour l’espace utilisateur, `https://jobbingtrack.localhost:5443/b4ck0ff1ce` pour le backoffice, et `https://api.jobbingtrack.localhost:5443` pour l’API.
- En production, prévoir des variables séparées pour l’URL utilisateur, l’URL backoffice et l’API afin de pouvoir rester en chemin partagé ou passer plus tard à des hôtes distincts.
- Le partage de composants ne doit pas créer de fuite de permissions : les composants communs sont neutres, les garde-fous d’accès restent dans les layouts/routes/API.

## Parcours produit cible

- Suivi recherche : vue synthèse des candidatures, relances, appels, entretiens, emails utiles, tâches Google Tasks et événements Calendar.
- Emails : liste des emails reçus, tri par candidature/relance/entreprise/contact, classification manuelle ou automatique, rattachement et correction mémorisée.
- Boîtes IMAP : connexion/configuration par utilisateur, test de connexion, statut de dernière synchronisation, erreurs lisibles, lecture bornée par période/label/dossier et aucun secret affiché dans les logs.
- Envoi contrôlé : préparer/envoyer une relance ou une réponse depuis l’interface uniquement après validation explicite, avec identité d’envoi choisie et journalisation. Ce n’est pas le cœur du MVP : la priorité est la création de tâches/événements et leur visibilité dans le dashboard/digest.
- Actions manuelles : programmer un appel, une relance, une tâche ou un rappel depuis une fiche candidature, contact ou entreprise, même sans email déclencheur.
- Candidature : relances créables uniquement depuis une fiche candidature, préparation entretien visible sur la fiche, sauvegarde PDF de l’offre depuis une URL.
- Entreprise : page détail enrichie avec candidatures, contacts, relances, appels, missions intérim, informations métier, site, secteur, taille et actualités récentes utiles.
- Contacts : import Google Contacts CSV/vCard, rattachement aux entreprises/candidatures, appels par contact ou entreprise avec date/heure préremplies.
- Calendrier : vue calendrier agrégée pour entretiens, relances, appels, salons, job dating et événements emploi.
- Veille emploi : récupération automatique de salons/job dating/forums avec ville/région configurables, par exemple Rennes/Bretagne.
- UX formulaires : autocomplete poste/ville/plateforme, navigation clavier et ARIA sur toutes les combobox.
- Recherche v2 : prévoir une barre de recherche opérationnelle dans l’espace utilisateur puis réutilisable aussi dans le backoffice/admin, avec permissions séparées et index commun contrôlé.

## Priorités produit

P0 :

- corriger les bugs UI critiques avant activation : double croix sidebar, focus PIN automatique, clavier numérique, dashboard responsive mobile ;
- socle tâches JobbingTrack : tâche, échéance, priorité, statut, lien candidature/entreprise/contact/email ;
- digest quotidien 18h basé sur données internes existantes, même sans IA ;
- cadrage récapitulatif hebdomadaire : tâches réalisées/restantes, relances à venir, candidatures sans réponse, entretiens, salons et actions manuelles programmées ;
- lecture Gmail/boîte candidatures en lecture seule avec consentement explicite ;
- connexion OAuth d’un ou plusieurs comptes Gmail, avec liste des comptes connectés, statut de synchronisation, révocation et revalidation PIN ;
- stockage interne des emails utiles, threads, classifications et décisions ;
- consultation de l’historique de communication pour éviter les faux doublons : ne pas proposer une relance si un appel, une réponse ou une relance récente est déjà tracée ;
- synchronisation Google Tasks et Google Calendar obligatoire pour les relances, préparations d’entretien et événements ;
- garde-fou Calendar : ne jamais créer d’événement à `00:00` par défaut. Si l’email ne contient qu’une date sans heure, créer une tâche à planifier ou un événement journée entière/proposé, jamais un horaire inventé ;
- fenêtre horaire Calendar : ne jamais créer automatiquement un événement avant `05:00` ou après `23:00` ; créer une tâche “horaire à vérifier” ou demander validation utilisateur ;
- classification minimale déterministe : refus, entretien, relance nécessaire, événement emploi, newsletter/bruit.

P1 :

- autocomplete poste/ville/plateformes et navigation clavier ARIA des combobox ;
- revalidation PIN pour actions sensibles : connexion de boîte, changement destinataire digest, envoi externe, révocation OAuth, suppression/archivage massif ;
- token agent email + documentation endpoint API ;
- adresse de transfert configurable hors Git ;
- liste emails reçus dans l’interface, triés par candidature/relance ;
- préparer/envoyer relance/email directement depuis l’interface avec identité choisie, uniquement après validation explicite ;
- audit des actions automatiques et confirmation avant envoi externe.
- moteur de règles enrichi : mots-clés, expéditeurs connus, délais 7/10/14 jours, rattachement plateforme/candidature.
- barre de recherche v2 réutilisable dans l’espace utilisateur puis dans le backoffice/admin.

P2 :

- vue calendrier agrégée ;
- appels par contact/entreprise avec date/heure préremplies ;
- programmation manuelle d’actions : appel, relance, tâche, rappel, événement lié à une candidature, un contact ou une entreprise ;
- relances créées uniquement depuis une fiche candidature ;
- page détail entreprise avec candidatures, contacts, relances, appels, missions intérim et informations liées ;
- import contacts depuis Google Contacts CSV/vCard ;
- gestion intérim dans détail entreprise : missions, contacts agence, appels agence, relances et historique ;
- section préparation entretien sur fiche candidature.

P3 :

- enrichissement automatique entreprise : site, secteur, taille, contexte, actualités récentes utiles ;
- sauvegarde PDF de l’offre d’emploi depuis une URL ;
- brouillons de réponse contextualisés ;
- modèles de relance par contexte.

P4 :

- récupération automatique salons emploi par ville/région configurables, notamment Rennes/Bretagne ;
- recommandation proactive d’événements pertinents ;
- amélioration IA locale d’abord, puis hybride seulement si le coût, la confidentialité et la qualité sont acceptables.

## Règles déterministes MVP

- Email contenant `entretien`, `rendez-vous`, `disponibilités` : proposer entretien, tâche de préparation et événement Google Calendar uniquement si la date/heure est fiable.
- Email contenant `malheureusement`, `retenu`, `suite à votre candidature` : probable refus, rattachement candidature et proposition d’archivage.
- Email venant de plateformes emploi comme Indeed, LinkedIn, France Travail ou recruteurs connus : rattachement candidature, entreprise ou veille.
- Candidature sans réponse depuis 7/10/14 jours : tâche Google Tasks de relance et recommandation dans le digest.
- Tâche Google marquée terminée, déplacée ou modifiée côté Google : synchroniser le statut dans JobbingTrack, rattacher l’action à la candidature/contact, puis planifier la suite si nécessaire (`fait`, `à relancer`, `à vérifier`, conflit à confirmer).
- Email ou alerte contenant `job dating`, `salon`, `forum emploi` : événement emploi à vérifier, puis création Calendar si validé.
- Si une date est détectée sans heure exploitable : ne pas créer un événement à minuit ; demander confirmation ou créer une tâche “horaire à confirmer”.
- Si une heure détectée est avant `05:00` ou après `23:00` : ne pas créer automatiquement l’événement ; créer une tâche “horaire à vérifier” ou demander validation. Exception uniquement si l’utilisateur confirme explicitement un événement exceptionnel.
- Les formulations ambiguës (`ce soir`, `demain matin`, `fin de journée`, timezone absente) doivent rester en proposition/tâche à confirmer, pas en événement Calendar confirmé.

## Fenêtre horaire Calendar

Les événements créés automatiquement par l’agent email doivent respecter une fenêtre humaine réaliste :

- créneau automatique autorisé : `05:00` inclus à `23:00` inclus, fuseau utilisateur explicite ;
- avant `05:00` : proposer une tâche ou une confirmation, car l’utilisateur risque de ne pas être disponible ;
- après `23:00` : proposer une tâche ou une confirmation, pas de rendez-vous confirmé sans accord ;
- date seule : proposer un événement journée entière ou une tâche “horaire à confirmer”, jamais `00:00` ;
- heure détectée mais douteuse : conserver la preuve extraite de l’email et demander validation dans l’interface ;
- digest : signaler les invitations ambiguës dans une section “À confirmer” plutôt que les masquer.

## Tests agent email à prévoir

La suite de test dédiée doit être créée avec des fixtures non sensibles et des variables `.env` locales configurées hors Git :

- tests unitaires du moteur de règles : refus, entretien, relance 7/10/14 jours, événement emploi, bruit/newsletter, ambiguïtés de date ;
- tests dates/heures : pas de Calendar à `00:00`, pas d’événement auto avant `05:00`, pas d’événement auto après `23:00`, timezone explicite, date seule convertie en tâche/événement proposé ;
- tests d’intégration avec boîtes de test : lecture Gmail/IMAP en lecture seule si variables présentes, skip explicite sinon, aucun secret affiché dans les logs ;
- tests digest : email quotidien généré via le socle SMTP JobbingTrack ou mock SMTP, sections attendues, liens JobbingTrack, absence d’envoi externe automatique ;
- tests identité digest : expéditeur `@jobbingtrack.com`, destinataire configuré hors Git, refus des placeholders et des expéditeurs personnels ;
- tests programmation digest : quotidien 18h par défaut, horaire paramétrable, hebdomadaire optionnel, refus des heures hors fenêtre ;
- tests permissions : compte sans `JOB_SEARCH_AGENT_ENABLED` bloqué, compte personnel autorisé OK, admin sans consentement utilisateur incapable de lire le contenu email personnel ;
- tests historique communication : une relance déjà faite, un appel déjà passé ou une réponse récente empêchent une recommandation de relance automatique sans confirmation ;
- rapports : produire un dossier `tests/results/email-triage/<timestamp>` avec résumé JSON/HTML/TXT, scénarios exécutés, variables manquantes masquées et décisions Calendar/Tasks expliquées.
- socle de tests déjà amorcé : `tests/email-triage/README.md`, moteur de classification `tests/email-triage/lib/classification-rules.js`, politique horaire `tests/email-triage/lib/calendar-time-policy.js`, digest planifié/identité d’envoi, lancement `bash tests/email-triage/run-with-report.sh`.

## Agent IA et coût

Approche recommandée :

1. D’abord un moteur déterministe fiable : règles, dates, statuts, délais de relance, parsing email, labels.
2. Ajouter ensuite une couche IA locale pour résumer, classer et proposer une réponse, sans remplacer les règles métier.
3. Favoriser une IA locale ou auto-hébergée : Ollama, modèle léger, cache de résultats, batch quotidien.
4. Prévoir un mode sans IA payante qui reste utile : digest + tâches + règles.
5. Si un fournisseur externe est utilisé, limiter strictement les données envoyées, demander validation explicite, journaliser le coût et anonymiser autant que possible.

## Sécurité, confidentialité et RGPD

- OAuth avec scopes minimaux : lecture seule au départ, envoi séparé et désactivé par défaut.
- Chiffrement des tokens au repos, rotation et révocation visibles.
- Aucun secret ou token dans les logs.
- Journal d’audit : email lu, classification proposée, tâche créée, réponse envoyée, utilisateur qui confirme.
- Actions destructives interdites sans confirmation : suppression email, archivage massif, envoi automatique.
- Règle stricte : l’agent peut proposer, mais l’utilisateur confirme avant réponse externe tant que la confiance n’est pas prouvée.
- Données personnelles minimisées dans les prompts IA ; ne pas envoyer les emails complets à un fournisseur externe sans accord.

## Intégrations techniques à prévoir

- Gmail API : OAuth multi-comptes, watch/history ou polling borné, labels, threads, pièces jointes sélectionnées.
- IMAP/API fournisseur pour la boîte candidatures configurée hors Git, en lecture seule au départ.
- Envoi digest : notification-service/auth-service ou service email partagé, en réutilisant `SMTP_*`, `SMTP_FROM`, `SMTP_REPLY_TO` et `EmailLog`; aucune adresse d’expéditeur ou de destinataire ne doit être codée en dur.
- Google Tasks API : création et synchronisation obligatoire des tâches de relance/préparation, avec lecture périodique des statuts Google (`completed`, déplacement, suppression, modification titre/date) pour détecter ce qui a été réellement fait hors JobbingTrack.
- Google Calendar API : événements entretien, job dating, salons, rappels.
- Normalisation dates/heures : timezone explicite, distinction `date seule` / `date+heure`, refus des horaires implicites à `00:00`, refus des créneaux automatiques avant `05:00` ou après `23:00`, confirmation utilisateur avant création si ambigu.
- Tables internes : `EmailAccount`, `EmailMessage`, `EmailThread`, `EmailClassification`, `UserTask`, `TaskReminder`, `AgentDecision`, `AgentDigest`.
- Tables/relations actions manuelles à prévoir : appel/tâche/rappel/événement rattachable à candidature, contact ou entreprise, même sans email source.
- Worker planifié : digest 18h, tri périodique, relances en retard.
- API JobbingTrack : endpoints utilisateur, pas backoffice admin.

## Critères d’acceptation initiaux

- L’utilisateur connecte Gmail sans exposer de secret.
- L’utilisateur peut connecter, voir et révoquer un ou plusieurs comptes Gmail sans exposer de secret.
- Un digest 18h est envoyé via le socle SMTP JobbingTrack configuré, avec au moins 5 sections : urgent, aujourd’hui/demain, retard, candidatures, entretiens/événements.
- Un récapitulatif hebdomadaire peut agréger tâches, événements, relances, appels, emails importants, candidatures sans réponse et actions manuelles programmées.
- Un refus reçu par email peut être relié à une candidature et proposé en archivage.
- Une invitation à entretien crée une tâche Google Tasks de préparation et un événement Google Calendar proposé/validé seulement si l’horaire est explicite, dans la fenêtre `05:00`-`23:00` et dans le bon fuseau ; sinon l’action reste à confirmer.
- Une candidature sans réponse depuis N jours déclenche une tâche Google Tasks de relance et une recommandation digest.
- L’utilisateur peut programmer manuellement un appel ou une tâche depuis une fiche candidature/contact/entreprise, et cette action apparaît dans le dashboard, le digest et le calendrier/tâches si synchronisée.
- L’utilisateur peut corriger une classification, et cette correction est conservée.
- Aucun email externe n’est envoyé automatiquement sans validation explicite.

## Hors périmètre initial

- Agent autonome qui répond seul aux recruteurs.
- Suppression automatique des emails.
- Dépendance obligatoire à un service IA payant.
- Lecture de boîtes personnelles non autorisées.
- Remplacement des validations sécurité/rapport P0 actuellement ouvertes.
