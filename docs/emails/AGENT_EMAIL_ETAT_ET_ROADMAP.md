# Agent email — état actuel et roadmap (connexion boîtes + consentement)

[← Emails](README.md) | [Cadrage produit](../features/EMAIL_TRIAGE_AGENT.md) | [Comptes dev porteur](COMPTES_EMAIL_DEV_ET_TESTS.md) | [Tests agent](../../tests/email-triage/README.md)

Dernière mise à jour : 22 juin 2026

## Réponse courte

**Partiellement implémenté (22/06/2026)** — socle produit multi-utilisateur en place ; digest 18h SMTP, Google Tasks/Calendar et liaison auto email↔candidature restent à finaliser.

Ce qui existe aujourd’hui :

- **Backend auth-service** : modèles BDD `UserMailbox`, `UserAgentConsent`, `EmailTriageMessage` ; flag `jobSearchAgentEnabled` ; API `/api/v1/email-agent/*` ; chiffrement AES-256-GCM ; OAuth Gmail + IMAP ; worker cron workflow (30 min).
- **UI espace utilisateur** : `/agent` — consentements RGPD, Gmail/IMAP, sync, file à traiter.
- **Scripts dev porteur** (`.env`) et **socle tests** `tests/email-triage/` — complémentaires, inchangés.

---

## Ce qui existe aujourd’hui (technique)

| Élément | Statut | Périmètre |
|---------|--------|-----------|
| Envoi emails applicatifs (vérif, reset) | **OK** | auth-service + MailHog/SMTP |
| Lecture IMAP dev (scripts) | **OK local** | `fetch-imap-verification.js`, `resolve-email-triage-env.js` — lit **`.env` porteur** |
| Gmail sur émulateur AVD | **OK partiel** | `configure-emulator-gmail.js` — compte **`EMAIL_GMAIL_PRO_*`** porteur |
| Politique accès agent (tests + API) | **OK** | `jobSearchAgentEnabled` en BDD + `auth-service/src/lib/agentAccessPolicy.js` |
| Politique connexion Gmail/IMAP (tests) | **OK unitaire** | `mail-connection-policy.js` — OAuth / IMAP placeholder |
| Classification emails, digest, Calendar | **OK unitaire** | moteur déterministe testé ; worker prod sync + tri partiel |
| **OAuth Google par utilisateur** | **Partiel** | flux `/api/v1/email-agent/oauth/google/*` ; requiert `GOOGLE_OAUTH_*` |
| **UI « Connecter ma boîte »** | **OK** | `/agent` — Gmail OAuth + formulaire IMAP |
| **Table BDD comptes mail / tokens** | **OK** | `UserMailbox`, tokens chiffrés `credentialsEnc` |
| **Consentement RGPD mail (UI)** | **OK** | 6 consentements versionnés ; audit BDD |
| **Relier email → candidature (auto)** | **Partiel** | classification + file « à traiter » ; pas encore écriture candidature |

> Les variables `EMAIL_GMAIL_PRO_*` et `EMAIL_TRIAGE_*` dans `.env` servent au **développement et aux tests du porteur**. Elles **ne remplacent pas** un connecteur multi-utilisateur en production.

---

## Cible produit (à construire)

### 1. Activation par utilisateur (pas automatique à l’inscription)

- Feature flag **`JOB_SEARCH_AGENT_ENABLED`** sur le **profil utilisateur** (activé par admin pour le compte autorisé au départ ; généralisation ultérieure si produit validé).
- Email JobbingTrack **vérifié** obligatoire avant toute connexion de boîte externe.
- **Aucun** nouveau compte inscrit ne peut lire des mails sans activation explicite.

Référence tests : `tests/email-triage/agent-access-policy.test.js`.

### 2. Connexion des boîtes mail (par utilisateur autorisé)

| Type | Méthode prévue | Scopes / règles |
|------|----------------|-----------------|
| **Gmail** | OAuth 2.0 Google (lecture seule) | Scopes minimaux (`gmail.readonly` ou équivalent) ; refresh token **chiffré** en BDD, lié `userId` |
| **IMAP générique** | Formulaire hébergeur + login + mot de passe app | OVH, Proton Bridge, etc. — **lecture seule** au départ ; secrets chiffrés, jamais en clair en Git/logs |
| **SMTP** (envoi contrôlé) | Optionnel phase 2 | Uniquement brouillons validés par l’utilisateur — **pas d’envoi auto** sans confirmation |

**Pas** « n’importe qui sans contrôle » : chaque boîte est rattachée à **un** compte JobbingTrack, avec audit et révocation.

### 3. Consentement utilisateur (RGPD)

Écrans et enregistrements prévus **avant** la première lecture :

| Consentement | Contenu |
|--------------|---------|
| **Accès boîtes mail** | Quelles adresses, lecture seule, durée, révocation |
| **Traitement contenu** | Classification auto, extraction candidatures/entretiens, stockage interne |
| **Digest & notifications** | Email récap 18h, fréquence, destinataire |
| **Google Tasks / Calendar** | Création d’événements/tâches (sans 00:00 inventé, bornes 05:00–23:00) |
| **IA locale (optionnel)** | Si activée plus tard — opt-in séparé |

Données à persister (audit) :

- horodatage, version des textes, IP/appareil si pertinent ;
- scopes OAuth accordés ;
- possibilité de **révoquer** depuis Paramètres (coupe worker + tokens).

L’**admin backoffice** ne lit **pas** le contenu des mails personnels sans consentement explicite de l’utilisateur (déjà testé : `admin_cannot_read_personal_email_without_user_consent`).

### 4. Relier emails ↔ JobbingTrack

Pipeline prévu :

1. Worker planifié (polling IMAP / Gmail API) par utilisateur autorisé.
2. Classification déterministe (refus, entretien, relance, bruit) — moteur déjà testé.
3. Proposition à l’utilisateur : lier à **candidature / entreprise / contact** existant ou en créer un.
4. Historique de communication par entité (emails, relances, appels tracés).
5. **Validation humaine** avant écriture destructive ou envoi externe.

### 5. Où vivra l’UI

- **Espace utilisateur** `/` (recherche d’emploi) — **pas** le backoffice `/b4ck0ff1ce` (réservé admin / emails système).
- Parcours : Paramètres → Agent recherche → Consentements → Connecter Gmail / Ajouter IMAP → Tableau de bord agent.

---

## Ordre de implémentation recommandé

1. **Backend** : modèle `UserMailbox`, chiffrement tokens, API CRUD boîtes + révocation.
2. **Backend** : flag `JOB_SEARCH_AGENT_ENABLED` + endpoints consentement (CRUD audit).
3. **OAuth Google** : callback, stockage refresh token, test lecture 1 message.
4. **IMAP générique** : connecteur + test connexion (comme OVH candidatures).
5. **Worker** : import borné + classification + file « à traiter ».
6. **UI** `/` : connecteurs + consentements + validation suggestions.
7. **Digest 18h** via notification-service (SMTP JobbingTrack, pas Gmail perso comme expéditeur).
8. **Google Tasks / Calendar** (après consentement dédié).

Suivi détaillé : [`docs/pilotage/TODOS.md`](../pilotage/TODOS.md) § Agent email · [`docs/features/EMAIL_TRIAGE_AGENT.md`](../features/EMAIL_TRIAGE_AGENT.md).

---

## Distinction importante

| Aujourd’hui (dev porteur) | Demain (produit multi-utilisateur) |
|---------------------------|-------------------------------------|
| `.env` sur la machine dev | Credentials **par utilisateur** en BDD chiffrée |
| Un Gmail pro + une boîte OVH documentés | Chaque user autorisé connecte **ses** boîtes |
| Scripts CLI / smokes | UI + API + worker |
| Pas de consentement UI | Consentements RGPD obligatoires |
| Porteur + comptes test seulement | Generalisation progressive après validation porteur |

Voir aussi [`COMPTES_EMAIL_DEV_ET_TESTS.md`](COMPTES_EMAIL_DEV_ET_TESTS.md) pour la politique **comptes autorisés en local**.
