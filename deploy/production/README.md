# Déploiement production / préprod — Portainer

Stack Docker Compose pensée pour **Portainer > Stacks > Add stack > Use a git repository**.

## Valeurs Portainer (formulaire)

| Champ | Préprod (test VPS) | Production stable |
|--------|-------------------|-------------------|
| **Name** | `jobbingtrack` | `jobbingtrack` |
| **Repository URL** | `https://github.com/PavelDelhomme/JobbingTrack.git` | idem |
| **Repository reference** | `refs/heads/dev` | `refs/heads/main` |
| **Compose path** | `deploy/production/docker-compose.yml` | idem |
| **Authentication** | Token GitHub si dépôt privé | idem |
| **GitOps updates** | Activé (polling 5 min) ou webhook CI | idem |

**Checklist porteur (actions exactes)** : [`docs/production/PORTEUR_ACTIONS_DEPLOIEMENT.md`](../../docs/production/PORTEUR_ACTIONS_DEPLOIEMENT.md)

**Checklist premier déploiement** : [`PREMIER_DEPLOIEMENT.md`](PREMIER_DEPLOIEMENT.md) ← commencer ici.

## Secrets

- Copier `.env.example` → variables **Environment variables** de la stack Portainer (mode avancé).
- Ne jamais committer `.env` réel ni `stack.env` avec secrets.
- Générer des mots de passe forts (`openssl rand -hex 32`).

## Nginx Proxy Manager

La stack expose l’API et le frontend sur **127.0.0.1** (ports `3000` / `3001` par défaut). NPM sur le même hôte :

| Proxy host | Forward |
|------------|---------|
| `api.<domaine>` | `http://127.0.0.1:3000` |
| `jobbingtrack.<domaine>` (backoffice + app web) | `http://127.0.0.1:3001` |

Activer **SSL** + **Force SSL** dans NPM. Aligner `ALLOWED_ORIGINS` et `NEXT_PUBLIC_*` sur ces URLs HTTPS.

## Phases de déploiement

### Phase A — Premier déploiement (build sur VPS)

1. `IMAGE_PULL_POLICY=build` (défaut).
2. Portainer clone le dépôt et **build** les images sur le serveur (long au premier lancement).
3. Vérifier healthchecks : `docker ps`, logs Portainer.

### Phase B — CI/CD recommandée

1. GitHub Actions workflow `build-push-images.yml` pousse les images vers **GHCR**.
2. Dans Portainer : `IMAGE_PULL_POLICY=always`, `IMAGE_TAG=dev` ou SHA/tag release.
3. GitOps ou webhook `PORTAINER_STACK_WEBHOOK` après push sur `dev` / `main`.

## Mobile

Portainer ne déploie **pas** l’app Flutter. Voir [`docs/production/MOBILE_RELEASE_PIPELINE.md`](../../docs/production/MOBILE_RELEASE_PIPELINE.md).

## Validation locale du compose

```bash
cd deploy/production
cp .env.example .env   # valeurs de test uniquement
docker compose config --quiet
```
