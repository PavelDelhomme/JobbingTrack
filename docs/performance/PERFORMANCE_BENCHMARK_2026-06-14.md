# Benchmark performance avant/après — 14 juin 2026

## Objectif

Prouver les gains réels des correctifs performance récents, sans se contenter d'un ressenti UI.

La comparaison porte sur deux états Git :

| État | Commit | Description |
|---|---:|---|
| Avant | `34fc84f4` | Avant le lot mémoire frontend : `next dev` sans `--webpack`, pas de plafond Statistics 7j |
| Après | `69ec0b0d` | État `dev` courant : Webpack, plafond Statistics, refresh visible-tab, API mobile authentifiée |

Commande de benchmark réutilisable :

```bash
bash scripts/perf/benchmark-performance-commits.sh
```

Le script ne passe pas par `make`, recrée seulement le conteneur `frontend`, borne les attentes avec `timeout`, puis restaure la branche de départ.

## Résultats mesurés

| Mesure | Avant `34fc84f4` | Après `69ec0b0d` | Écart |
|---|---:|---:|---:|
| Mode Next dev | `Turbopack` | `webpack` | Changement confirmé |
| Script `frontend dev` | `next dev -H 0.0.0.0` | `next dev --webpack -H 0.0.0.0` | Correctif actif |
| Plafond Statistics 7j | `10080` points | `2000` points max | -80,2 % de points demandés |
| Mémoire frontend idle après recreate | `1.733 GiB / 2 GiB` | `454.9 MiB / 2 GiB` | -73,7 % |
| Mémoire après `test-performance.js PERF_LIGHT=1` | `2.000 GiB / 2 GiB` | `409.5 MiB / 2 GiB` | -79,5 %, plafond évité |
| API perf légère | `15/15`, score `100/100` | `15/15`, score `100/100` | Pas de régression backend |
| API mobile authentifiée | N/A (script absent) | `9/9` endpoints + charge `10/10` | Nouveau périmètre prouvé |
| Smoke Statistics Playwright | non exploitable après crash/restart frontend | `4 passed` en `33s` | Stable après correctifs |
| Mémoire après smoke Statistics | restart/reset observé côté avant | `1.577 GiB / 2 GiB` | Le smoke chauffe encore Next, mais reste sous plafond |

## Diagnostic

Il y a bien un gain mesuré et important sur le point critique initial : le frontend dev ne démarre plus proche du plafond mémoire et ne remonte plus immédiatement à `2 GiB / 2 GiB` lors de la charge API légère. Le passage Webpack est confirmé dans les logs `Next.js 16.2.6 (webpack)`, alors que l'état avant lançait Turbopack.

Le plafond `MAX_CHART_API_POINTS = 2000` réduit fortement les payloads historiques Statistics : une plage 7j ne demande plus `10080` points par série. Cela ne réduit pas seulement le réseau ; cela limite aussi le travail de parsing, stockage en state React et rendu Recharts sur les longues plages.

La charge API légère reste excellente avant comme après (`15/15`, score `100/100`). Le gain principal n'est donc pas côté backend pur sur ce test : il est côté frontend dev et surface Statistics. La nouveauté utile est la campagne authentifiée mobile : le test vérifie désormais les endpoints métier avec un vrai `Bearer token` USER, au lieu de considérer des `401` comme suffisants.

## Limites

Le smoke Statistics après correctifs monte encore à environ `1.577 GiB / 2 GiB` après compilation et rendu Playwright. C'est nettement mieux que le plafond atteint avant, mais ce n'est pas encore une marge confortable pour de longues campagnes backoffice.

Le benchmark avant a montré un reset/restart du frontend après saturation (`2 GiB / 2 GiB` puis mémoire retombée très bas), ce qui confirme le comportement observé précédemment : l'ancien état touchait le plafond et pouvait redémarrer.

Le test n'est pas un benchmark production : il mesure le dev server Docker local. Pour la prod, il faudra comparer un build Next production et une campagne rate-limit/WAF dédiée, hors `NODE_ENV=development`.

## Conclusion

Les correctifs récents apportent un vrai gain :

- mémoire idle frontend divisée par environ 3,8 ;
- mémoire après charge API légère divisée par environ 4,9 ;
- plafond `2 GiB` évité sur l'état courant ;
- Statistics 7j limité à `2000` points au lieu de `10080` ;
- API mobile authentifiée maintenant couverte sur les endpoints métier.

Le chantier n'est pas terminé : les prochains gains probables sont les imports dynamiques Recharts sur pages lourdes (`correlation`, `log-stats`, Statistics), la virtualisation/pagination des listes volumineuses et une campagne prod-like contrôlée pour rate-limit/WAF.
