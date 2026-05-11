# Démarrage du projet JobbingTrack

## Premier lancement (ou reprise)

```bash
make up-full && make db-push-all && make build && make up-full && make create-admin-user && make status
```

| Étape | Commande | Rôle |
|-------|----------|------|
| 1 | `make up-full` | Démarre tous les conteneurs (21 services). |
| 2 | `make db-push-all` | Prisma push (9 services) + init-system-metrics + init-key-tables + seed statuts. |
| 3 | `make build` | Rebuild des images Docker. |
| 4 | `make up-full` | Redémarre la stack avec les images à jour. |
| 5 | `make create-admin-user` | Crée ou met à jour l'admin (admin@jobbingtrack.com / password123, rôle SUPER_ADMIN). |
| 6 | `make status` | Affiche l'état des services. |

## Repartir à zéro

```bash
make down && make up-full && make db-push-all && make build && make up-full && make create-admin-user && make status
```

## Après le démarrage

1. **Backoffice** : http://localhost:5003 → admin@jobbingtrack.com / password123.
2. **Tests API** : Backoffice → Tests → Tests API → Lancer (36/36 doivent passer).
3. **Émulateur mobile** (optionnel) : `make emulator-controller` (2e terminal), puis http://localhost:5003/backoffice/mobile-emulator.

## Dépannage « Accès Refusé »

Si le backoffice affiche « Accès Refusé – Votre rôle actuel : USER » :
```bash
make create-admin-user
```
Puis se déconnecter et se reconnecter.

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `make up-full` | Démarrer la stack complète |
| `make down` | Arrêter tout |
| `make status` | État des services |
| `make db-push-all` | Synchroniser la BDD |
| `make build` | Rebuild des images |
| `make logs` | Logs colorés |
| `make logs-applicative` | Logs sans monitoring |
| `make test-all` | Lancer tous les tests |
| `make fresh-start` | down + build + up-full |

Voir aussi : `docs/getting-started/COMMANDES_UTILES.md`.
