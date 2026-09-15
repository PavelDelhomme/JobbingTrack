# Lien écosystème Cloudity Suite (JobbingTrack)

> Fiche satellite — **ne modifie pas** les Postgres prod/preprod ni les volumes Docker.

## Identité

| | |
|--|--|
| Repo | `PavelDelhomme/JobbingTrack` |
| Clone Perso | `/home/pactivisme/Documents/Dev/Perso/JobbingTrack` |
| Sous Cloudity | `Cloudity/products/jobbing-track` (submodule, **même remote**) |
| Branche | `dev` |
| Stacks VPS | `jobbingtrack-prod` · `jobbingtrack-preprod` |

## Documents à lire (Cloudity)

1. **Décisions porteur** : repo Cloudity `docs/ecosystem/EMAIL-PORTEUR-DECISIONS-SUITE-2026-09-15.md`
2. **Ops Cursor/Portainer** : `docs/ecosystem/ARCHITECTURE-CURSOR-PORTAINER-SUITE.md`
3. **Brief Cursor** : [`CURSOR-BRIEF-CLOUDITY-SUITE.md`](./CURSOR-BRIEF-CLOUDITY-SUITE.md)

## Données (audit VPS 15/09/2026)

- `jobbingtrack-prod_postgres_data` (~537 Mo)
- `jobbingtrack-preprod_postgres_data` (~465 Mo)
- `jobbingtrack-prod_mobile_releases` (~1,2 Go)

SSO Cloudity ID = **opt-in** ; compte local Jobs **conservé**.

## Cursor

```bash
cd /home/pactivisme/Documents/Dev/Perso/Cloudity/Cloudity/products/jobbing-track && cursor .
# ou
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack && cursor .
cd /home/pactivisme/Documents/Dev/Perso/Cloudity/Cloudity && cursor Cloudity.code-workspace
```

## Décisions

Attendre les coches D1–D10 dans l’email Cloudity **avant** glue SSO / Mail / merge DB.
