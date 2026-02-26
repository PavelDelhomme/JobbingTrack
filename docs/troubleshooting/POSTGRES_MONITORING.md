# Résolution – Tables monitoring et enums (Postgres)

Erreurs typiques dans les logs Postgres après `make up-full` ou en cours d'exécution.

---

## 1. `relation "public.system_metrics_snapshots" does not exist`

Idem pour `container_metrics_snapshots`, `service_availability_history`, `system_metrics`.

**Cause** : les tables sont créées par `make db-push-all` (Partie 2 = `init-system-metrics.sql`, Partie 3 = `init-key-tables.sql`). Si `db-push-all` n'a pas été exécuté ou a échoué, ces tables manquent.

**Solution** :
- Lancer `make db-push-all` avec la stack déjà up (Postgres doit être démarré).
- Après un `db-push-all` réussi, redémarrer metrics-aggregator : `docker restart jobbingtrack-metrics-aggregator`.

**Vérification** :
```bash
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c '\dt public.system_metrics*'
```

## 2. `type "FollowUpStatus" already exists` / `type "InterviewType" already exists`

**Cause** : plusieurs services Prisma définissent ces enums. Lors des `prisma db push`, le premier push crée le type, les suivants provoquent cette erreur.

**Solution** : à ignorer. Le script `db-push-all.sh` considère déjà « type already exists » comme succès.

## 3. `jobbingtrack-metrics-aggregator exited with code 1`

**Cause** : échec d'écriture en BDD (tables absentes).

**Solution** : appliquer la résolution (1) puis `docker restart jobbingtrack-metrics-aggregator`.

## 4. Erreurs persistantes après `make db-push-all`

**Cause** : dans `docker-compose.yml`, `monitoring-c` et `jobbingtrack-metrics-aggregator` n'avaient pas de `profiles`. Ils démarraient avant `db-push-all`.

**Correctif appliqué** : les deux services sont dans le profil `monitoring`. Dans `make up-full`, ils sont démarrés après `db-push-all`.

**Si vous avez une ancienne stack** : `make down` puis `make up-full`.

## 5. Accès Refusé (rôle USER au lieu d'admin)

**Symptôme** : connexion avec admin@jobbingtrack.com OK, mais « Accès Refusé – Votre rôle actuel : USER ».

**Solution** :
```bash
make create-admin-user
```
Puis se déconnecter et se reconnecter.
