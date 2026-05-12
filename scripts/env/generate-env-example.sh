#!/usr/bin/env bash
# =============================================================================
# DEPRECIE - ne pas utiliser pour regenerer .env.example
# =============================================================================
# La source de verite pour les variables est le fichier /.env.example a la
# racine du depot, maintenu a la main.
#
# Pour aligner les cles : make env-check
# Pour reordonner ton .env sans perdre tes valeurs : make env-reorder
#
# Voir : docs/operations/PRE_VPS_ENV_AUDIT_AND_UPDATES.md
# =============================================================================

echo "Ce script est deprecie. Utilisez le fichier racine .env.example et : make env-check / make env-reorder" >&2
exit 1
