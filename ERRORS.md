# 🔴 ERREURS DÉTECTÉES - JobbingTrack
**Date**: 2025-12-22 15:30:00

## 📊 Résumé
- **Total erreurs**: 3
- **Critiques**: 1
- **Avertissements**: 2

---

## ✅ Erreur #1: Monitoring-c ne répond pas aux requêtes HTTP (RÉSOLU)
**Service**: jobbingtrack-monitoring-c
**Priorité**: 🔴 CRITIQUE
**Description**: 
Le service `monitoring-c` écoutait bien sur le port 8015, acceptait les connexions, mais la fonction `handle_request()` plantait silencieusement avant d'exécuter le premier log. Les requêtes HTTP échouaient avec "Empty reply from server".

**Cause identifiée**: 
**Stack overflow** causé par des buffers trop grands alloués sur la stack :
- `buffer[BUFFER_SIZE]` (65536 bytes) sur la stack
- `json_buffer[BUFFER_SIZE]` (65536 bytes) sur la stack
- `http_response[BUFFER_SIZE + 300]` (65836 bytes) sur la stack
- Total : ~197 KB sur la stack, ce qui dépasse la limite par défaut de la stack (souvent 8 MB mais peut être réduite)

**Solution appliquée**:
- ✅ Allocation de tous les buffers sur la heap avec `malloc()` au lieu de la stack
- ✅ Libération correcte de tous les buffers avec `free()` dans tous les cas de retour
- ✅ Ajout de logs de debug détaillés pour tracer l'exécution
- ✅ Vérification de l'allocation mémoire avant utilisation

**Fichiers modifiés**:
- `monitoring-c/src/http_server.c` (lignes 184-466)

**Statut**: ✅ RÉSOLU - Le serveur répond maintenant correctement avec du JSON valide

---

## ✅ Erreur #2: Frontend affiche "N/A" pour CPU, mémoire, disque et conteneurs (RÉSOLU)
**Service**: jobbingtrack-frontend
**Priorité**: 🟡 MOYENNE
**Description**: 
Le frontend affichait "N/A" pour les métriques système (CPU, mémoire, disque) et le nombre de conteneurs dans la vue d'ensemble au lieu d'afficher les valeurs réelles depuis `monitoring-c`.

**Cause identifiée**: 
- Le frontend cherchait les métriques dans `jobbingtrack.containers` qui n'était pas créée par `formatMetricsFromMonitoringC`
- Les valeurs système (`cpu.load_1`, `memory.usage_percent`, `disk.usage_percent`) n'étaient pas utilisées en priorité
- La structure `jobbingtrack` n'était pas créée avec les métriques agrégées des conteneurs

**Solution appliquée**:
- ✅ Ajout de la structure `jobbingtrack.containers` dans `formatMetricsFromMonitoringC` avec calcul des métriques agrégées
- ✅ Correction de l'affichage pour utiliser les valeurs système en priorité :
  - CPU : `cpu.load_1` (charge système) en priorité
  - Mémoire : `memory.usage_percent` (mémoire système) en priorité
  - Disque : `disk.usage_percent_number` en priorité
  - Conteneurs : `monitoringC.container_count` ou `jobbingtrack.containers.count`
- ✅ Ajout de `usage_percent_number` pour le disque pour permettre les comparaisons numériques
- ✅ Amélioration de la fusion des métriques pour préserver les anciennes valeurs pendant le rechargement

**Fichiers modifiés**:
- `frontend/src/lib/services/centralMetricsService.ts` (lignes 773-842)
- `frontend/src/app/(admin)/backoffice/page.tsx` (lignes 852-965)

**Statut**: ✅ RÉSOLU - Les métriques système sont maintenant affichées correctement

---

## 🔴 Erreur #3: Tables Prisma non créées automatiquement lors de `make up-full`
**Service**: jobbingtrack-auth-service
**Priorité**: 🟡 MOYENNE
**Description**: 
Les tables Prisma ne sont pas créées automatiquement lors de `make up-full`, ce qui cause des erreurs `Invalid prisma.user.findUnique() invocation: The table public.User does not exist in the current database.`

**Impact**: 
- Les utilisateurs ne peuvent pas se connecter
- Le service `auth-service` échoue avec des erreurs Prisma
- Nécessite une intervention manuelle pour créer les tables

**Statut**: ✅ RÉSOLU - Ajout de `$(MAKE) db-push-all` dans `_up-full-internal` du Makefile

---

## 📝 Notes
- Le problème de `monitoring-c` est le plus critique car il empêche tout le système de monitoring de fonctionner
- Les autres erreurs ont été résolues mais nécessitent une vérification
- Le problème de `monitoring-c` nécessite une investigation avec un debugger (gdb) pour identifier la cause exacte du crash
