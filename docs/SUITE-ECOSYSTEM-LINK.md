# Lien écosystème Cloudity Suite (JobbingTrack)

> Fiche satellite — **ne modifie pas** les Postgres prod/preprod.

## Identité

- Repo : `PavelDelhomme/JobbingTrack`
- Stacks VPS : `jobbingtrack-prod` + `jobbingtrack-preprod`
- Branche : `dev`

## Rapport complet

https://github.com/PavelDelhomme/Cloudity/blob/dev/ECOSYSTEME-SUITE-MODULAIRE.md

## Données

- `jobbingtrack-prod_postgres_data` (~537 Mo)
- `jobbingtrack-preprod_postgres_data` (~465 Mo)

SSO Cloudity ID = **opt-in** ; compte local Jobs toujours conservé.

## Cursor / Portainer

Stacks séparées ; jamais Remove volumes.

## Décisions

§17 du rapport Cloudity — attendre avant glue SSO / Mail.
