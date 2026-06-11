# Tests agent email / recherche d'emploi

Statut : **socle tests étendu** — unitaires + politique connexion boîte mail. L'implémentation produit complète (worker, UI `/`, OAuth réel) reste en backlog.

Source fonctionnelle : [`docs/features/EMAIL_TRIAGE_AGENT.md`](../../docs/features/EMAIL_TRIAGE_AGENT.md)

## Objectif

Valider sans secrets dans Git :

- le moteur de règles déterministe (refus, entretien, relance, événement emploi, bruit) ;
- la politique horaire Google Calendar : pas de `00:00` par défaut, pas d'événement auto avant `05:00` ni après `23:00` ;
- les permissions `JOB_SEARCH_AGENT_ENABLED` (compte activé, admin sans consentement bloqué) ;
- le rendu digest HTML/texte JobbingTrack (mock SMTP, liens internes, pas de fuite de secret) ;
- la politique de connexion Gmail/IMAP : skip explicite si `TEST_EMAIL_TRIAGE_ENABLED=false` ou credentials placeholder ;
- le digest SMTP JobbingTrack, son expéditeur `@jobbingtrack.com` et sa planification ;
- la lecture Gmail/IMAP en lecture seule **uniquement** si les variables `.env` locales sont présentes.

## Variables d'environnement

Voir `.env.example` section **Tests agent email recherche**. Les vraies valeurs restent dans `.env` gitignoré.

| Variable | Rôle |
|----------|------|
| `TEST_EMAIL_TRIAGE_ENABLED` | Active les tests d'intégration agent (défaut `false`) |
| `TEST_EMAIL_TRIAGE_USER_EMAIL` / `PASSWORD` | Compte utilisateur autorisé pour les scénarios UI/API |
| `TEST_EMAIL_TRIAGE_GMAIL_*` | OAuth/lecture Gmail de test |
| `TEST_EMAIL_TRIAGE_IMAP_*` | Boîte IMAP de test (ex. boîte candidatures) |
| `TEST_EMAIL_TRIAGE_DIGEST_FROM` | Expéditeur attendu du digest (`noreply@jobbingtrack.com`) |
| `TEST_EMAIL_TRIAGE_DIGEST_RECIPIENT` | Destinataire attendu du digest de test |
| `TEST_EMAIL_TRIAGE_DIGEST_DAILY_TIME` | Heure quotidienne attendue (`18:00`) |
| `TEST_EMAIL_TRIAGE_DIGEST_WEEKLY_DAY` | Jour hebdomadaire attendu (`sunday`) |
| `TEST_EMAIL_TRIAGE_CALENDAR_MIN_HOUR` | Borne basse auto (`05:00`) |
| `TEST_EMAIL_TRIAGE_CALENDAR_MAX_HOUR` | Borne haute auto (`23:00`) |

Le droit produit `JOB_SEARCH_AGENT_ENABLED` est un feature flag **utilisateur** (activation admin), pas une variable d'environnement.

## Lancer les tests

Depuis la racine du dépôt :

```bash
/usr/bin/node tests/node_modules/jest/bin/jest.js \
  --config tests/jest.config.js \
  tests/email-triage/ \
  --runInBand
```

Rapport horodaté (JSON + résumé texte) :

```bash
bash tests/email-triage/run-with-report.sh
```

Sortie : `tests/results/email-triage/<timestamp>/`

Backoffice : `/b4ck0ff1ce/tests` → carte **Agent email / triage** → `POST /api/test/run-email-triage`.

## Structure

```text
tests/email-triage/
├── README.md
├── run-with-report.sh
├── classification-rules.test.js
├── calendar-time-policy.test.js
├── digest-schedule-policy.test.js
├── digest-identity-policy.test.js
├── agent-access-policy.test.js
├── digest-renderer.test.js
├── mail-connection-policy.test.js
├── mail-connection.integration.test.js
├── helpers/
│   └── require-env.js
├── lib/
│   ├── agent-access-policy.js
│   ├── calendar-time-policy.js
│   ├── classification-rules.js
│   ├── digest-renderer.js
│   ├── digest-schedule-policy.js
│   ├── digest-identity-policy.js
│   └── mail-connection-policy.js
└── fixtures/
    └── emails/
```

## Rapports attendus

Chaque campagne doit produire :

- `summary.json` : scénarios, pass/fail/skip, durée ;
- `summary.txt` : synthèse lisible ;
- détail Jest (`jest-results.json`) si disponible.

Les secrets et adresses réelles ne doivent jamais apparaître dans les rapports.

## Prochaines étapes (backlog produit)

1. API permissions réelles (`JOB_SEARCH_AGENT_ENABLED` côté auth/user-service).
2. Worker digest 18h + envoi SMTP via notification-service.
3. OAuth Gmail lecture seule multi-comptes + stockage tokens chiffrés.
4. Interface utilisateur `/` (boîte agent, tâches, calendrier agrégé).
