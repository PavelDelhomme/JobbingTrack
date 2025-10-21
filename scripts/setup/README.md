# Scripts de Setup - JobbingTrack

Ce dossier contient les scripts d'installation et de configuration initiale du système JobbingTrack.

## Scripts disponibles

### install-dependencies.sh
Script d'installation automatique des dépendances système nécessaires.

**Usage:**
```bash
./scripts/setup/install-dependencies.sh              # Installation complète
./scripts/setup/install-dependencies.sh --check-only  # Vérification uniquement
./scripts/setup/install-dependencies.sh --update       # Mise à jour des dépendances
```

**Dépendances installées:**
- Docker et Docker Compose
- Node.js et npm
- PostgreSQL client
- Redis tools
- Git et outils de développement

---

[← Retour au README principal](../README.md) | [Scripts suivants →](../db/README.md)
