# Agent email, tâches et accompagnement recherche

Statut : cadrage produit/technique, à implémenter après validation des P0/P1 bloquants.

Référence visuelle fournie par le porteur : [prototype JobbingTrack](https://jobbingtrack.pplx.app).

## Objectif

Créer un assistant JobbingTrack qui lit et trie les emails liés à la recherche d’emploi, relie ces informations aux candidatures/entreprises/entretiens, crée des tâches actionnables, et envoie chaque soir un récapitulatif utile.

Le système doit aider le porteur à :

- savoir quoi faire demain et cette semaine ;
- relancer les entreprises au bon moment ;
- repérer les refus, propositions d’entretien, invitations, événements emploi et salons ;
- préparer les entretiens à venir ;
- répondre aux emails depuis l’interface si autorisé ;
- éviter de dépendre d’un outil payant externe à forte consommation.

## Sources à connecter

- Gmail `redacted@example.invalid` via OAuth et scopes minimaux.
- Boîte JobbingTrack dédiée, par exemple `candidatures@example.invalid`.
- Candidatures, entreprises, contacts, relances, appels, entretiens et événements déjà présents dans JobbingTrack.
- Google Tasks et Google Calendar si le porteur confirme l’usage.
- Emails transférés automatiquement depuis des plateformes emploi ou recruteurs.

## Récapitulatif quotidien

Tous les jours vers 18h, envoyer un email récapitulatif clair :

- tâches à faire demain ;
- tâches en retard ;
- candidatures sans réponse depuis N jours ;
- relances recommandées ;
- entretiens à préparer ;
- événements emploi proches ;
- emails importants non classés ;
- décisions proposées : relancer, archiver, répondre, créer un événement, préparer un entretien.

Le digest doit être compréhensible sans ouvrir l’application, mais chaque ligne doit pointer vers l’action JobbingTrack correspondante.

## Interface utilisateur dédiée

Ne pas mettre cette expérience dans le backoffice admin. Prévoir une interface produit dédiée, accessible à l’utilisateur, orientée recherche d’emploi :

- tableau de bord du jour ;
- file d’emails à traiter ;
- fiches emails reliées à une candidature, entreprise ou contact ;
- actions rapides : créer tâche, créer relance, créer événement, archiver, marquer refus, marquer entretien ;
- rédaction assistée de réponse ;
- aperçu des emails envoyés/reçus par candidature ;
- configuration des comptes et adresses de transfert ;
- historique des décisions de l’agent et possibilité de corriger.

## Priorités produit

P0 :

- corriger les bugs UI critiques avant activation : double croix sidebar, focus PIN automatique, clavier numérique, dashboard responsive mobile ;
- socle tâches JobbingTrack : tâche, échéance, priorité, statut, lien candidature/entreprise/contact/email ;
- digest quotidien 18h basé sur données internes existantes, même sans IA ;
- lecture Gmail/boîte candidatures en lecture seule avec consentement explicite ;
- classification minimale : refus, entretien, relance nécessaire, événement emploi, newsletter/bruit.

P1 :

- autocomplete poste/ville/plateformes et navigation clavier ARIA des combobox ;
- token agent email + documentation endpoint API ;
- adresse de transfert configurable (`candidatures@example.invalid`) ;
- liste emails reçus dans l’interface, triés par candidature/relance ;
- envoyer relance/email directement depuis l’interface avec identité choisie ;
- audit des actions automatiques et confirmation avant envoi externe.

P2 :

- vue calendrier agrégée ;
- appels par contact/entreprise avec date/heure préremplies ;
- relances créées uniquement depuis une fiche candidature ;
- page détail entreprise avec candidatures, contacts, relances, entretiens liés ;
- import contacts depuis Google Contacts CSV/vCard ;
- gestion intérim dans détail entreprise ;
- section préparation entretien sur fiche candidature.

P3 :

- enrichissement automatique entreprise : site, secteur, taille, contexte ;
- sauvegarde PDF de l’offre d’emploi depuis une URL ;
- brouillons de réponse contextualisés ;
- modèles de relance par contexte.

P4 :

- récupération automatique salons emploi Rennes/Bretagne ;
- recommandation proactive d’événements pertinents ;
- amélioration IA locale ou hybride si le coût, la confidentialité et la qualité sont acceptables.

## Agent IA et coût

Approche recommandée :

1. D’abord un moteur déterministe fiable : règles, dates, statuts, délais de relance, parsing email, labels.
2. Ajouter ensuite une couche IA optionnelle pour résumer, classer et proposer une réponse.
3. Favoriser une IA locale ou auto-hébergée quand c’est réaliste : Ollama, modèle léger, cache de résultats, batch quotidien.
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

- Gmail API : watch/history ou polling borné, labels, threads, pièces jointes sélectionnées.
- IMAP/SMTP ou API fournisseur pour `candidatures@example.invalid`.
- Google Tasks API : création et synchronisation des tâches.
- Google Calendar API : événements entretien, job dating, rappels.
- Tables internes : `EmailAccount`, `EmailMessage`, `EmailThread`, `EmailClassification`, `UserTask`, `TaskReminder`, `AgentDecision`, `AgentDigest`.
- Worker planifié : digest 18h, tri périodique, relances en retard.
- API JobbingTrack : endpoints utilisateur, pas backoffice admin.

## Critères d’acceptation initiaux

- L’utilisateur connecte Gmail sans exposer de secret.
- Un digest 18h est envoyé avec au moins 5 sections : urgent, aujourd’hui/demain, retard, candidatures, entretiens/événements.
- Un refus reçu par email peut être relié à une candidature et proposé en archivage.
- Une invitation à entretien crée une tâche de préparation et une proposition d’événement calendrier.
- Une candidature sans réponse depuis N jours déclenche une relance recommandée.
- L’utilisateur peut corriger une classification, et cette correction est conservée.
- Aucun email externe n’est envoyé automatiquement sans validation explicite.

## Hors périmètre initial

- Agent autonome qui répond seul aux recruteurs.
- Suppression automatique des emails.
- Dépendance obligatoire à un service IA payant.
- Lecture de boîtes personnelles non autorisées.
- Remplacement des validations sécurité/rapport P0 actuellement ouvertes.
