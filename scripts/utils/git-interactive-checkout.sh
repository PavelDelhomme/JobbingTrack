#!/usr/bin/env bash
# =============================================================================
# Outil de navigation Git interactive - JobbingTrack
# Permet de revenir à un commit ou une branche de manière claire et visuelle.
# Usage: ./scripts/utils/git-interactive-checkout.sh  ou  make git-checkout
# =============================================================================

set -e
cd "$(git rev-parse --show-toplevel)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Git – Revenir à un commit ou une branche                   ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Menu principal
echo -e "${BLUE}Choisir une action :${NC}"
echo "  1) Voir les derniers commits (log) et choisir un commit"
echo "  2) Voir les branches et changer de branche"
echo "  3) Voir le statut actuel (branche + dernier commit)"
echo "  4) Quitter"
echo ""
read -p "Votre choix (1-4) : " choice

case "$choice" in
  1)
    echo ""
    echo -e "${YELLOW}Derniers commits (hash court | date | auteur | message) :${NC}"
    echo ""
    git log --oneline -30 --format="%C(yellow)%h%C(reset) | %C(cyan)%ar%C(reset) | %an | %s"
    echo ""
    read -p "Coller le hash du commit (ex: abc1234) ou Entrée pour annuler : " hash
    if [ -n "$hash" ]; then
      echo -e "${GREEN}Checkout du commit $hash...${NC}"
      git checkout "$hash"
      echo -e "${GREEN}✅ Vous êtes maintenant en mode \"détaché HEAD\" sur le commit $hash.${NC}"
      echo -e "${YELLOW}Pour revenir à une branche : make git-checkout → option 2${NC}"
    fi
    ;;
  2)
    echo ""
    echo -e "${YELLOW}Branches locales :${NC}"
    git branch -v
    echo ""
    read -p "Nom de la branche à utiliser (ex: main, feature/xxx) : " branch
    if [ -n "$branch" ]; then
      git checkout "$branch"
      echo -e "${GREEN}✅ Branche active : $branch${NC}"
    fi
    ;;
  3)
    echo ""
    echo -e "${GREEN}Branch actuelle :${NC} $(git branch --show-current)"
    echo -e "${GREEN}Dernier commit :${NC}"
    git log -1 --oneline --format="%h | %ar | %an | %s"
    echo ""
    ;;
  4)
    echo "Au revoir."
    exit 0
    ;;
  *)
    echo -e "${RED}Choix invalide.${NC}"
    exit 1
    ;;
esac
