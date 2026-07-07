# Checklist avant changement **major** (rupture API / schéma)

Dernière mise à jour : **7 juillet 2026**

Voir aussi : [`COMPATIBILITE_ET_MISES_A_JOUR.md`](COMPATIBILITE_ET_MISES_A_JOUR.md), [`CONVENTION_VERSION_OFFICIELLE.md`](CONVENTION_VERSION_OFFICIELLE.md)

---

## Quand utiliser cette checklist

- Suppression ou renommage d’un champ JSON **requis**
- Changement de sémantique d’un endpoint existant
- Migration Prisma **non additive**
- Suppression d’une route utilisée par le mobile ou le backoffice en prod
- Force-update mobile (`minBuild` / `forceUpdate: true`)

**Patch/minor additive** → checklist **non** requise (smokes N-1 recommandés quand même).

---

## Avant merge

- [ ] Type de rupture documenté dans notes release / manifeste
- [ ] Bump **major** du composant concerné (`bump-component-version.sh … major`)
- [ ] Tests : mobile build **N-1** contre API candidate (smokes ou manuel)
- [ ] Backoffice : parcours impactés testés
- [ ] OTA : `minVersion` / `minBuild` relevés **seulement** si indispensable
- [ ] Email / bandeau porteur si force-update
- [ ] Rollback : tags Docker N-1 + manifeste précédent prêts

---

## Déploiement

- [ ] Rebuild **toutes** les images impactées (pas `npm update` in-container)
- [ ] `sync-platform-manifest.sh` + `audit-toolchain.sh`
- [ ] Préprod Portainer → validation porteur
- [ ] Prod : stack pinnée sur tags immuables
- [ ] `GET /api/v1/public/release-info` cohérent avec manifeste

---

## Après prod

- [ ] Archiver manifeste `JT-x.y.z.yaml` figé
- [ ] Mettre à jour `TODOS_A_VERIFIER.md` / validation porteur si gate prod

---

*BL-DEP-06 — éviter de bloquer les clients sur une ancienne version sans annonce explicite.*
