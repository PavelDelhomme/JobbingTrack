# Scripts de Base de Données - JobbingTrack

[← Scripts](../README.md) | [← README principal](../../README.md) | [📚 Documentation](../../docs/README.md) | [🧭 Navigation](../../docs/navigation.md)

Ce dossier contient les scripts de gestion de la base de données PostgreSQL de JobbingTrack.

## Scripts disponibles

### seed.sh
Script de seed de la base de données - insère des données de test.

**Usage:**
```bash
./scripts/db/seed.sh              # Seed complet avec admin + données exemple
./scripts/db/seed.sh --admin-only # Création admin uniquement
```

**Données insérées:**
- Utilisateur administrateur (`admin@jobbingtrack.test` / `SuperAdmin123!`)
- Entreprises d'exemple (Google, Microsoft, Apple, Amazon, Meta)
- Candidatures de test
- Entretiens programmés

### backup.sh
Script de sauvegarde de la base de données PostgreSQL.

**Usage:**
```bash
./scripts/db/backup.sh                    # Sauvegarde avec nom auto-généré
./scripts/db/backup.sh --compress my-backup  # Sauvegarde compressée
./scripts/db/backup.sh --destination /mnt/backups daily-backup
```

**Fonctionnalités:**
- Sauvegarde complète de la base
- Compression optionnelle (gzip)
- Destination personnalisable
- Noms de fichiers avec timestamp

---

[← Retour au README principal](../README.md) | [Scripts précédents →](../setup/README.md) | [Scripts suivants →](../docker/README.md)
