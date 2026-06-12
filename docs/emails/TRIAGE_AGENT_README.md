# Agent de triage email — Recherche d'emploi

**Fichier** : `docs/emails/triage_email_agent.gs`  
**Technologie** : Google Apps Script (gratuit, hébergé par Google)  
**Déclenchement** : chaque soir à 19h automatiquement  
**Coût** : 0€ — aucun crédit Perplexity

---

## Ce que fait l'agent

Chaque soir à 19h, il :

1. Lit les emails des 24 dernières heures dans Gmail (inclut les redirections de la boîte candidatures configurée hors Git)
2. Détecte et classe automatiquement : entretiens, offres, refus, confirmations, job dating, France Travail, contacts RH
3. Crée des tâches dans Google Tasks (liste "Recherche emploi") pour le lendemain après 16h
4. Crée des événements Google Calendar si entretien ou événement détecté
5. Vérifie les tâches en retard non réalisées
6. Ajoute des boutons d’action dans le récap (`FAIT`, `PAS PERTINENT`, `REPORTER +3j`)
7. Cherche des offres fraîches autour de Rennes via flux publics France Travail / Indeed / Hellowork / Meteojob
8. Envoie un récapitulatif HTML formaté au destinataire défini dans les propriétés Apps Script

---

## Installation (5 minutes)

> **Important** : se connecter avec le compte Google qui lit la boîte de recherche d'emploi. Ne pas écrire cette adresse réelle dans Git : elle doit rester dans la configuration locale Google / `.env`.

1. Aller sur [script.google.com](https://script.google.com)
2. Cliquer **Nouveau projet**
3. Coller le contenu de `triage_email_agent.gs` dans l'éditeur (remplacer le code par défaut)
4. Cliquer **Services (+)** > chercher **Tasks API** > version v1 > identifiant : `TasksAPI` > Ajouter
5. Dans **Paramètres du projet** > **Propriétés du script**, créer :
   - `TRIAGE_AGENT_EMAIL` : adresse du compte Google qui lit la boîte de recherche d’emploi
   - `TRIAGE_DIGEST_RECIPIENT` : vraie adresse de réception du récapitulatif
   - `JBT_AGENT_PIN` : PIN/token local JobBingTrack si l’écriture automatique JBT est utilisée
6. Pour activer les boutons du mail : **Déployer** → **Nouveau déploiement** → type **Application Web** → exécuter en tant que **Moi** → accès **Tout le monde**. Copier l’URL `/exec`.
7. Coller cette URL dans `CONFIG.webAppUrl` du script, puis redéployer une nouvelle version.
8. Dans le menu déroulant des fonctions, sélectionner `installerDeclencheur` > **Exécuter** > accepter toutes les permissions Google

Le script tourne ensuite automatiquement chaque soir à 19h.

Sans Web App configurée, les boutons retombent vers `CONFIG.jobbingtrackUrl` : le triage, les tâches, le calendrier et le récap continuent de fonctionner.

---

## Migration vers un nouvel appareil

Le script est lié au **compte Google**, pas à l'appareil.  
Sur un nouvel ordinateur :
- Aller sur [script.google.com](https://script.google.com) avec le compte Google configuré
- Le projet est déjà là, aucune réinstallation nécessaire

---

## Configuration (dans le fichier .gs)

```javascript
var CONFIG = {
  taskListName: "Recherche emploi",        // nom de la liste Google Tasks
  calendarId: "primary",                  // calendrier Google Calendar
  heureDebutTaches: 16,                   // tâches planifiées après 16h
  webAppUrl: "REMPLACER_PAR_URL_WEB_APP", // requis pour les boutons du mail
  jobbingtrackUrl: "https://jobbingtrack.pplx.app",
  // ... mots-clés et expéditeurs à adapter
};
```

Les valeurs personnelles ne sont pas dans le fichier : `TRIAGE_AGENT_EMAIL`, `TRIAGE_DIGEST_RECIPIENT` et `JBT_AGENT_PIN` sont lus depuis les propriétés Apps Script. Si aucun destinataire n’est disponible, le script échoue explicitement au lieu d’envoyer vers une adresse factice.

---

## Nouveautés v4

- **Boutons dans le mail** : `FAIT` complète la tâche Google Tasks, `PAS PERTINENT` supprime la tâche et marque la candidature `WITHDRAWN` si reliée à JBT, `REPORTER +3j` repousse l’échéance.
- **Web App Apps Script** : obligatoire pour que les boutons soient cliquables depuis l’email. L’accès “Tout le monde” sert uniquement de point d’entrée HTTP signé par les paramètres de tâche ; éviter d’y exposer des secrets.
- **Recherche d’offres Rennes** : récupération quotidienne d’offres publiques filtrées sur technicien support, informatique, cybersécurité, alternance IT dans un rayon d’environ 30 km autour de Rennes.
- **Section offres fraîches** : les offres détectées sont ajoutées au récap quotidien, séparées des emails reçus.

---

## Corrections v2 (par rapport à v1)

- **Emojis supprimés** : remplacés par des labels texte `[ENTRETIEN]`, `[OFFRE]`, etc. pour éviter les carrés avec point d'interrogation
- **Dates en français** : "Mardi 9 juin 2026" au lieu de "Tuesday 9 June 2026"
- **Détection améliorée** : types d'email mieux identifiés (offres Indeed classées comme offres, non comme INFO)
- **Axia Intérim reconnu** : ajouté dans les expéditeurs prioritaires
- **`var` au lieu de `const/let`** : compatibilité maximale avec Apps Script
- **Pas d'arrow functions** : compatibilité apps script garantie

---

## Intégration avec JobBingTrack

L'API de `jobbingtrack.pplx.app` est protégée par authentification — seul le navigateur connecté peut y écrire.  
L'agent indique dans le récapitulatif email quelles candidatures doivent être saisies manuellement dans JobBingTrack.

Évolution future : quand JobBingTrack sera déployé sur le VPS avec une API key, l'agent pourra y écrire directement via `UrlFetchApp`.

Pour l'implémentation native dans JobbingTrack, le digest ne doit pas être envoyé depuis Gmail/App Script : il doit réutiliser le même socle SMTP que les emails de reset, validation d'inscription et notifications système (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_REPLY_TO`) avec journalisation `EmailLog`.
