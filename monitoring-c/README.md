# Système de Monitoring en C

Ce répertoire contient le nouveau système de collecte de métriques écrit en C pour remplacer le système Node.js actuel.

## Objectifs

- **Performance maximale** : Collecte ultra-rapide des métriques système
- **Consommation minimale** : Utilisation mémoire et CPU réduite au maximum
- **Précision** : Collecte directe depuis `/proc` et Docker API
- **Fiabilité** : Pas de dépendances lourdes, code minimaliste

## Architecture

```
monitoring-c/
├── src/
│   ├── collector.c          # Collecteur principal
│   ├── docker.c              # Interface Docker API
│   ├── proc_reader.c          # Lecture des fichiers /proc
│   ├── metrics.c             # Calcul des métriques
│   └── storage.c              # Stockage en base de données
├── include/
│   ├── collector.h
│   ├── docker.h
│   ├── proc_reader.h
│   ├── metrics.h
│   └── storage.h
├── Makefile                   # Compilation
└── README.md                  # Ce fichier
```

## Métriques collectées

- **CPU** : Usage par conteneur et système
- **Mémoire** : Utilisation, limites, pourcentages
- **Disque** : Espace utilisé par Docker uniquement
- **Réseau** : RX/TX par conteneur
- **Charge système** : Load average
- **Santé des services** : Health checks HTTP

## Compilation

```bash
make
```

## Utilisation

```bash
./monitoring-c --interval 15 --output json
```

## Intégration

Le système remplacera progressivement `backend/metrics-aggregator-service` en exposant les mêmes endpoints HTTP.

