# Versions Prisma et mise à jour majeure

Ce document décrit les **versions Prisma** utilisées dans le projet et comment gérer une **mise à jour majeure** (ex. 5.x → 7.x).

---

## Versions actuelles (référence)

Le projet utilise **Prisma** dans plusieurs services backend. Les versions ne sont pas toutes alignées :

| Contexte | prisma | @prisma/client |
|----------|--------|-----------------|
| **api-gateway** | ^6.0.0 | ^6.19.0 |
| **backend/prisma** (schéma partagé) | ^6.0.0 | ^6.19.0 |
| **metrics-aggregator-service** | 6.7.0 | 6.7.0 |
| **auth-service** | ^5.5.0 | ^5.5.0 |
| **application-service**, **company-service**, **contact-service**, **interview-service**, **profile-service**, **notification-service**, **call-service**, **event-service**, **followup-service**, **dashboard-service** | ^5.4.2 à ^5.5.0 | idem |
| **security-service**, **deployment-service** | ^5.0.0 | ^5.0.0 |
| **workflow-service** | ^5.4.2 | ^5.4.2 |

Lors de l’exécution de `make seed-auth` (ou `npx prisma db seed` dans auth-service), Prisma peut afficher :

```text
Update available 5.22.0 -> 7.4.2
This is a major update - please follow the guide at
https://pris.ly/d/major-version-upgrade
```

C’est une **mise à jour majeure** (5 → 7). Elle ne doit pas être faite d’un coup sans lire la doc officielle.

---

## Mise à jour majeure (quand vous déciderez de passer à 7.x)

1. **Guide officiel**  
   Suivre le guide Prisma pour les mises à jour majeures :  
   **https://pris.ly/d/major-version-upgrade**

2. **Ordre recommandé**  
   - Lire les **breaking changes** de la version cible (ex. 6 → 7, 5 → 7).  
   - Tester d’abord sur **un seul service** (ex. auth-service ou un service secondaire).  
   - Vérifier : `prisma generate`, `prisma db push` ou `migrate`, `prisma db seed`, et les tests du service.  
   - Aligner les autres services un par un (ou par lot) pour limiter les régressions.

3. **Commandes typiques (par service)**  
   ```bash
   cd backend/auth-service   # ou autre service
   npm i --save-dev prisma@latest
   npm i @prisma/client@latest
   npx prisma generate
   npx prisma db push       # ou migrate
   npx prisma db seed       # si seed défini
   ```

4. **Après mise à jour**  
   - Mettre à jour ce fichier avec les nouvelles versions.  
   - Mettre à jour les autres docs qui référencent des commandes Prisma si besoin (voir ci‑dessous).

---

## Références dans la doc

Les commandes **Prisma** sont mentionnées notamment dans :

- **Migrations / schéma** : `docs/getting-started/GUIDE_INSTALLATION.md`, `docs/getting-started/GUIDE_SETUP_COMPLET.md`, `docs/database/DATABASE_VERIFICATION.md`, `docs/database/migration/GUIDE_EXECUTION.md`, `docs/development/FINAL_IMPLEMENTATION_SUMMARY.md`
- **Seed / admin** : `docs/tests/STRUCTURE_TESTS_MAKE_TEST.md`, `makefiles/database/Makefile` (seed-auth, create-admin-user)
- **Architecture** : `docs/architecture/decisions/README.md`, `docs/core/services/README.md`

Les commandes (`npx prisma generate`, `npx prisma db push`, `npx prisma db seed`) restent valables après une mise à jour majeure ; seules les options ou comportements peuvent changer (voir le changelog Prisma).

---

**Dernière mise à jour** : mars 2026 (état des versions au moment de la rédaction).
