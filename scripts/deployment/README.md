# Scripts de Déploiement - JobbingTrack

[← Scripts](../README.md) | [← README principal](../../README.md) | [📚 Documentation](../../docs/README.md) | [🧭 Navigation](../../docs/navigation.md)

Ce dossier contient les scripts liés au déploiement et à la gestion du cycle de vie des services.

## Scripts disponibles

### start-system.sh
Script de démarrage principal avec options avancées.

### stop-system.sh
Script d'arrêt propre avec options de nettoyage.

### restart-system.sh
Script de redémarrage complet du système.

## Usage

```bash
# Démarrage avec options
./scripts/deployment/start-system.sh --rebuild --with-metrics

# Arrêt avec nettoyage
./scripts/deployment/stop-system.sh --clean

# Redémarrage complet
./scripts/deployment/restart-system.sh
```
