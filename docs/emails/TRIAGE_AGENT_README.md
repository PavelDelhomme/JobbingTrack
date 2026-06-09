# Agent de triage email — Recherche d'emploi

**Fichier** : `docs/emails/triage_email_agent.gs`  
**Technologie** : Google Apps Script (gratuit, hébergé par Google)  
**Déclenchement** : chaque soir à 19h automatiquement  
**Coût** : 0€ — aucun crédit Perplexity

---

## Ce que fait l'agent

Chaque soir à 19h, il :

1. Lit les emails des 24 dernières heures dans Gmail (inclut les redirections de `candidatures@example.invalid`)
2. Détecte et classe automatiquement : entretiens, offres, refus, confirmations, job dating, France Travail, contacts RH
3. Crée des tâches dans Google Tasks (liste "Recherche emploi") pour le lendemain après 16h
4. Crée des événements Google Calendar si entretien ou événement détecté
5. Vérifie les tâches en retard non réalisées
6. Envoie un récapitulatif HTML formaté à `redacted@example.invalid`

---

## Installation (5 minutes)

> **Important** : se connecter avec `redacted@example.invalid`, pas `redacted@example.invalid`

1. Aller sur [script.google.com](https://script.google.com)
2. Cliquer **Nouveau projet**
3. Coller le contenu de `triage_email_agent.gs` dans l'éditeur (remplacer le code par défaut)
4. Cliquer **Services (+)** > chercher **Tasks API** > version v1 > identifiant : `TasksAPI` > Ajouter
5. Dans le menu déroulant des fonctions, sélectionner `installerDeclencheur` > **Exécuter** > accepter toutes les permissions Google

Le script tourne ensuite automatiquement chaque soir à 19h.

---

## Migration vers un nouvel appareil

Le script est lié au **compte Google**, pas à l'appareil.  
Sur un nouvel ordinateur :
- Aller sur [script.google.com](https://script.google.com) avec `redacted@example.invalid`
- Le projet est déjà là, aucune réinstallation nécessaire

---

## Configuration (dans le fichier .gs)

```javascript
var CONFIG = {
  email: "redacted@example.invalid",    // destinataire du récap
  taskListName: "Recherche emploi",        // nom de la liste Google Tasks
  calendarId: "primary",                  // calendrier Google Calendar
  heureDebutTaches: 16,                   // tâches planifiées après 16h
  jobbingtrackUrl: "https://jobbingtrack.pplx.app",
  // ... mots-clés et expéditeurs à adapter
};
```

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
