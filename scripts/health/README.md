# Scripts de Health Checks - JobbingTrack

Ce dossier contient les scripts de vérification de santé et de diagnostic du système JobbingTrack.

## Scripts disponibles

### check-all.sh
Script de vérification complète de l'état de santé du système.

**Usage:**
```bash
./scripts/health/check-all.sh                 # Vérification standard
./scripts/health/check-all.sh --quick         # Vérification rapide
./scripts/health/check-all.sh --detailed      # Vérification complète
./scripts/health/check-all.sh --fix           # Diagnostic avec correction
./scripts/health/check-all.sh --report-format json --output report.json
```

**Vérifications effectuées:**
- Disponibilité de Docker et Docker Compose
- État des services essentiels (postgres, redis, api-gateway, frontend)
- Connectivité des endpoints principaux
- Accès à la base de données PostgreSQL
- État du cache Redis
- Espace disque et mémoire système
- Services optionnels (métriques)

**Formats de rapport:**
- `text` (par défaut) - Rapport textuel lisible
- `json` - Rapport JSON structuré
- `html` - Rapport HTML avec graphiques

**Codes de sortie:**
- `0` = Tout fonctionne correctement
- `1` = Problèmes détectés (warnings)
- `2` = Erreurs critiques détectées

---

[← Retour au README principal](../README.md) | [Scripts précédents →](../docker/README.md) | [Scripts suivants →](../utils/README.md)
