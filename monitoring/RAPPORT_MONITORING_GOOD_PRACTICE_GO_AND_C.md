# Rapport monitoring - bonnes pratiques Rust / C

Date : 13 mai 2026

## Reponse courte

Non, la reecriture complete de `monitoring/monitoring-c` selon toutes les regles C listees n'a pas ete faite.

Le travail realise jusqu'ici a surtout porte sur la migration Rust :

- `monitoring-agent-rs` est branche par defaut dans `docker-compose.yml`.
- `log-collector-rs` est branche par defaut dans `docker-compose.yml`.
- `monitoring-c` et `log-collector-c` restent des fallbacks legacy sous profil `monitoring-c`.
- `metrics-aggregator-c` reste un prototype non branche.
- `backend/metrics-aggregator-service` reste l'agregateur actif pour le backoffice.

Il n'y a pas de composant Go actif dans le monitoring. Le nom de ce rapport garde `GO_AND_C` uniquement parce que la demande portait sur un rapport de bonnes pratiques generales ; a ce stade, les langages concernes par le monitoring sont C, Rust et Node.js.

## Etat C

`monitoring/monitoring-c` n'est pas conforme aux regles demandees :

- toutes les constantes litterales ne sont pas sorties dans des headers dedies ;
- certaines fonctions depassent largement 60 lignes, notamment dans le serveur HTTP et le stockage ;
- les variables ne sont pas systematiquement declarees en debut de fonction ;
- les erreurs ne passent pas toutes explicitement par `fd 2` ;
- le style de commentaires n'est pas uniforme ;
- `sleep` / attentes historiques restent a auditer face a la regle `usleep` ;
- le code n'est pas entierement anglais ;
- l'architecture garde des etats partages et des chemins legacy ;
- les typedefs `u8`, `u16`, `u32`, `u64` ne sont pas generalises.

Decision recommandee : ne pas investir dans une grosse reecriture C tant que la cible produit est Rust. Le C doit etre traite comme fallback legacy temporaire, puis retire apres validation longue Rust.

## Etat Rust

Les regles C ne s'appliquent pas telles quelles a Rust, mais l'intention doit etre conservee :

- constantes centralisees dans des modules `constants.rs` quand elles sont partagees ;
- `main.rs` minimal ;
- modules separes par responsabilite (`config`, `http`, `storage`, `metrics`, `docker`, `procfs`, `types`) ;
- fonctions courtes et focalisees autant que possible ;
- pas d'etat global mutable non protege ;
- erreurs operationnelles explicites ;
- pas de duplication de logique C comme fallback permanent.

Etat actuel :

- `monitoring/rust/crates/monitoring-agent` est modularise.
- `monitoring/rust/crates/log-collector` est modularise.
- `monitoring/rust/crates/metrics-aggregator` est modularise, mais n'a pas encore remplace l'agregateur Node actif.
- `cargo fmt --all` et `cargo check --workspace` ont ete valides lors de la modularisation.

## Point important sur les benchmarks

La baseline du 07/05 mentionne encore `monitoring-c` et `log-collector-c` parce qu'elle a ete faite pendant la transition.

La prochaine validation longue doit etre libellee comme :

> Validation cout collecte metriques post-bascule Rust : benchmark CPU/RAM/IO p95 sur 40-60 minutes avec `monitoring-agent-rs`, `log-collector-rs` et `jobbingtrack-metrics-aggregator`.

Les resultats C ne doivent rester qu'une reference historique.

## Actions a faire

1. Confirmer que le compose de developpement/preprod lance bien `monitoring-agent-rs` et `log-collector-rs` par defaut.
2. Relancer un benchmark long 40-60 minutes en gate tests complets/preprod, sans repeter ce test a chaque iteration.
3. Comparer les contrats Rust avec les contrats historiques C via `scripts/monitoring/compare-monitoring-agents.py`.
4. Supprimer progressivement les references qui presentent `monitoring-c` comme systeme principal.
5. Retirer `monitoring-c`, `log-collector-c` et `metrics-aggregator-c` apres validation porteur et absence de regression.

## Decision actuelle

Le projet doit continuer vers Rust. Une reecriture C complete serait couteuse et contradictoire avec la trajectoire de migration, sauf si un besoin de fallback long terme est explicitement decide.
