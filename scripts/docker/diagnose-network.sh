#!/bin/bash

set -u

echo "🐳 Diagnostic réseau Docker"
echo "==========================="
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker n'est pas installé ou pas dans le PATH"
  exit 1
fi

echo "Docker: $(docker --version 2>/dev/null || echo 'indisponible')"
echo "Kernel: $(uname -r 2>/dev/null || echo 'indisponible')"
echo ""

if ! docker info >/dev/null 2>&1; then
  echo "❌ Le daemon Docker ne répond pas."
  echo "   Essaie : sudo systemctl restart docker"
  exit 1
fi

echo "✅ Daemon Docker joignable"

if grep -q '^veth ' /proc/modules 2>/dev/null; then
  echo "✅ Module veth chargé"
else
  echo "⚠️  Module veth non visible dans /proc/modules"
  echo "   Docker bridge a besoin de veth pour connecter les conteneurs aux réseaux."
  echo "   Si make up-full échoue avec 'failed to add the host <=> sandbox pair interfaces',"
  echo "   charge les modules puis redémarre Docker :"
  echo ""
  echo "     sudo modprobe veth bridge br_netfilter overlay"
  echo "     sudo systemctl restart docker"
  echo ""
  echo "   Si modprobe veth échoue sur Arch après une mise à jour kernel :"
  echo "     sudo pacman -Syu linux linux-headers"
  echo "     reboot"
fi

if grep -q '^bridge ' /proc/modules 2>/dev/null; then
  echo "✅ Module bridge chargé"
else
  echo "⚠️  Module bridge non visible"
fi

if grep -q '^overlay ' /proc/modules 2>/dev/null; then
  echo "✅ Module overlay chargé"
else
  echo "⚠️  Module overlay non visible"
fi

echo ""
echo "Réseaux JobbingTrack existants :"
docker network ls --format "  {{.Name}}\t{{.Driver}}\t{{.Scope}}" 2>/dev/null | grep -E 'jobbingtrack|backend_jobbingtrack' || echo "  Aucun réseau JobbingTrack"
