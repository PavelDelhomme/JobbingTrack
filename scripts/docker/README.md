# Scripts Docker - JobbingTrack

[← Scripts](../README.md) | [← README principal](../../README.md) | [📚 Documentation](../../docs/README.md) | [🧭 Navigation](../../docs/navigation.md)

Ce dossier contient les scripts utilitaires pour la gestion et la maintenance de l'environnement Docker de JobbingTrack.

## Scripts disponibles

### cleanup.sh
Script de nettoyage complet de l'environnement Docker.

**Usage:**
```bash
./scripts/docker/cleanup.sh              # Nettoyage avec confirmation
./scripts/docker/cleanup.sh --dry-run    # Aperçu du nettoyage
./scripts/docker/cleanup.sh --force      # Nettoyage automatique
./scripts/docker/cleanup.sh --images-only   # Images uniquement
./scripts/docker/cleanup.sh --containers-only  # Conteneurs uniquement
```

**Actions effectuées:**
- Suppression des conteneurs arrêtés
- Suppression des images inutilisées (dangling)
- Suppression des volumes orphelins
- Suppression des réseaux inutilisés
- Nettoyage du cache de build

**Options de sécurité:**
- Mode dry-run pour voir ce qui sera supprimé
- Confirmation interactive par défaut
- Mode force pour automatisation

---

[← Retour au README principal](../README.md) | [Scripts précédents →](../db/README.md) | [Scripts suivants →](../health/README.md)
