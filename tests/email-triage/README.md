# Tests agent email / recherche d'emploi

Statut : **préparation** — socle de tests unitaires et plan d'intégration. L'implémentation produit complète reste bloquée tant que le P0 CVE de `TODOS_A_VALIDER.md` est ouvert.

Source fonctionnelle : [`docs/features/EMAIL_TRIAGE_AGENT.md`](../../docs/features/EMAIL_TRIAGE_AGENT.md)

## Objectif

Valider sans secrets dans Git :

- le moteur de règles déterministe (refus, entretien, relance, événement emploi, bruit) ;
- la politique horaire Google Calendar : pas de `00:00` par défaut, pas d'événement auto avant `05:00` ni après `23:00` ;
- les permissions `JOB_SEARCH_AGENT_ENABLED` ;
- le digest SMTP JobbingTrack (mock ou boîte de test) ;
- la lecture Gmail/IMAP en lecture seule **uniquement** si les variables `.env` locales sont présentes.

## Variables d'environnement

Voir `.env.example` section **Tests agent email recherche**. Les vraies valeurs restent dans `.env` gitignoré.

| Variable | Rôle |
|----------|------|
| `TEST_EMAIL_TRIAGE_ENABLED` | Active les tests d'intégration agent (défaut `false`) |
| `TEST_EMAIL_TRIAGE_USER_EMAIL` / `PASSWORD` | Compte utilisateur autorisé pour les scénarios UI/API |
| `TEST_EMAIL_TRIAGE_GMAIL_*` | OAuth/lecture Gmail de test |
| `TEST_EMAIL_TRIAGE_IMAP_*` | Boîte IMAP de test (ex. boîte candidatures) |
| `TEST_EMAIL_TRIAGE_DIGEST_RECIPIENT` | Destinataire attendu du digest de test |
| `TEST_EMAIL_TRIAGE_CALENDAR_MIN_HOUR` | Borne basse auto (`05:00`) |
| `TEST_EMAIL_TRIAGE_CALENDAR_MAX_HOUR` | Borne haute auto (`23:00`) |

## Lancer les tests

Depuis la racine du dépôt :

```bash
/usr/bin/node tests/node_modules/jest/bin/jest.js \
  --config tests/jest.config.js \
  tests/email-triage/calendar-time-policy.test.js \
  --runInBand
```

Rapport horodaté (JSON + résumé texte) :

```bash
bash tests/email-triage/run-with-report.sh
```

Sortie : `tests/results/email-triage/<timestamp>/`

## Structure

```text
tests/email-triage/
├── README.md
├── run-with-report.sh
├── calendar-time-policy.test.js
├── helpers/
│   └── require-env.js
├── lib/
│   └── calendar-time-policy.js
└── fixtures/
    └── emails/
```

## Rapports attendus

Chaque campagne doit produire :

- `summary.json` : scénarios, pass/fail/skip, durée ;
- `summary.txt` : synthèse lisible ;
- détail Jest (`jest-results.json`) si disponible.

Les secrets et adresses réelles ne doivent jamais apparaître dans les rapports.

## Prochaines étapes (après P0)

1. Tests unitaires moteur de règles (`classification-rules.test.js`).
2. Tests permissions API (`JOB_SEARCH_AGENT_ENABLED`).
3. Tests digest SMTP mockés.
4. Tests intégration Gmail/IMAP conditionnels (`TEST_EMAIL_TRIAGE_ENABLED=true`).
5. Intégration au backoffice **Développement → Tests** et à `scripts/run-all-tests-with-reports.sh`.
