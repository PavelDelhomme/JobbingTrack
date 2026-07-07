# Releases plateforme JobbingTrack

| Fichier | Rôle |
|---------|------|
| `JT-1.0.0.yaml` | Baseline **figée** (archive porteur) |
| `platform-manifest.yaml` | Manifeste **actif** — source de vérité humaine au deploy |
| `platform-manifest.json` | Lecture runtime API / scripts (généré, versionné) |

## Workflow

```bash
# 1. Modifier platform-manifest.yaml (ou copier depuis un JT-x.y.z.yaml)
# 2. Synchroniser JSON + copie gateway
bash scripts/deps/sync-platform-manifest.sh

# 3. Auditer toolchain vs manifeste
bash scripts/deps/audit-toolchain.sh

# 4. Bump composant (patch/minor)
bash scripts/deps/bump-component-version.sh api-gateway patch
```

Docs : [`docs/deployment/CONVENTION_VERSION_OFFICIELLE.md`](../../docs/deployment/CONVENTION_VERSION_OFFICIELLE.md), [`COMPATIBILITE_ET_MISES_A_JOUR.md`](../../docs/deployment/COMPATIBILITE_ET_MISES_A_JOUR.md).
