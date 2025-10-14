#!/bin/bash

# 🔧 Script de Configuration pour l'Accès Mobile
# Ce script configure automatiquement l'accès au backoffice depuis un mobile

set -e

echo "🔧 Configuration de l'accès mobile pour JobbingTrack..."
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Obtenir l'IP locale
echo "📡 Détection de l'adresse IP locale..."
IP_ADDRESS=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | head -n 1 | awk '{print $2}' | cut -d'/' -f1)

if [ -z "$IP_ADDRESS" ]; then
    echo -e "${RED}❌ Impossible de détecter l'adresse IP locale${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Adresse IP détectée : $IP_ADDRESS${NC}"
echo ""

# 2. Configurer le frontend
echo "⚙️  Configuration du frontend..."
cd "$(dirname "$0")/frontend"

# Créer .env.local
cat > .env.local << EOF
# Configuration pour l'accès réseau local
NEXT_PUBLIC_API_URL=http://$IP_ADDRESS:8080
NEXT_TELEMETRY_DISABLED=1
EOF

echo -e "${GREEN}✅ Fichier .env.local créé${NC}"
echo ""

# 3. Vérifier les ports
echo "🔍 Vérification des ports..."

# Vérifier si le port 3000 est utilisé
if netstat -tuln | grep -q ":3000 "; then
    echo -e "${GREEN}✅ Port 3000 (Frontend) est actif${NC}"
else
    echo -e "${YELLOW}⚠️  Port 3000 (Frontend) n'est pas actif${NC}"
    echo "   Démarrez le frontend avec: cd frontend && npm run dev"
fi

# Vérifier si le port 8080 est utilisé
if netstat -tuln | grep -q ":8080 "; then
    echo -e "${GREEN}✅ Port 8080 (Backend) est actif${NC}"
else
    echo -e "${YELLOW}⚠️  Port 8080 (Backend) n'est pas actif${NC}"
    echo "   Démarrez le backend avec: cd backend && docker-compose up -d"
fi

echo ""

# 4. Configuration du pare-feu
echo "🔥 Configuration du pare-feu..."

# Détection du pare-feu
if command -v firewall-cmd &> /dev/null; then
    echo "Pare-feu détecté : firewalld"
    
    # Vérifier si le service est actif
    if systemctl is-active --quiet firewalld; then
        echo "Ajout des règles firewalld..."
        sudo firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || echo "Port 3000 déjà autorisé"
        sudo firewall-cmd --permanent --add-port=8080/tcp 2>/dev/null || echo "Port 8080 déjà autorisé"
        sudo firewall-cmd --reload
        echo -e "${GREEN}✅ Règles firewalld ajoutées${NC}"
    else
        echo -e "${YELLOW}⚠️  firewalld n'est pas actif${NC}"
    fi
    
elif command -v ufw &> /dev/null; then
    echo "Pare-feu détecté : ufw"
    
    # Vérifier si ufw est actif
    if sudo ufw status | grep -q "Status: active"; then
        echo "Ajout des règles ufw..."
        sudo ufw allow 3000/tcp
        sudo ufw allow 8080/tcp
        echo -e "${GREEN}✅ Règles ufw ajoutées${NC}"
    else
        echo -e "${YELLOW}⚠️  ufw n'est pas actif${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Aucun pare-feu détecté ou configuré${NC}"
fi

echo ""

# 5. Test de connectivité
echo "🧪 Test de connectivité..."

# Test backend
if curl -s -o /dev/null -w "%{http_code}" "http://$IP_ADDRESS:8080/health" | grep -q "200"; then
    echo -e "${GREEN}✅ Backend accessible sur http://$IP_ADDRESS:8080${NC}"
else
    echo -e "${RED}❌ Backend non accessible sur http://$IP_ADDRESS:8080${NC}"
    echo "   Vérifiez que Docker est en cours d'exécution"
fi

# Test frontend (si actif)
if netstat -tuln | grep -q ":3000 "; then
    if curl -s -o /dev/null -w "%{http_code}" "http://$IP_ADDRESS:3000" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✅ Frontend accessible sur http://$IP_ADDRESS:3000${NC}"
    else
        echo -e "${RED}❌ Frontend non accessible sur http://$IP_ADDRESS:3000${NC}"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ Configuration terminée !${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Pour accéder depuis votre mobile :"
echo ""
echo "   1. Assurez-vous que votre mobile est sur le même WiFi"
echo "   2. Ouvrez votre navigateur mobile"
echo "   3. Accédez à : http://$IP_ADDRESS:3000/login"
echo ""
echo "🔑 Identifiants de test :"
echo "   Email    : admin@jobbingtrack.test"
echo "   Password : password123"
echo ""
echo "📝 URLs importantes :"
echo "   - Frontend : http://$IP_ADDRESS:3000"
echo "   - Backend  : http://$IP_ADDRESS:8080"
echo "   - Health   : http://$IP_ADDRESS:8080/health"
echo ""

# 6. Afficher les prochaines étapes
if ! netstat -tuln | grep -q ":3000 "; then
    echo -e "${YELLOW}⚠️  N'oubliez pas de démarrer le frontend :${NC}"
    echo "   cd frontend && npm run dev"
    echo ""
fi

if ! netstat -tuln | grep -q ":8080 "; then
    echo -e "${YELLOW}⚠️  N'oubliez pas de démarrer le backend :${NC}"
    echo "   cd backend && docker-compose up -d"
    echo ""
fi

echo "📖 Pour plus d'informations, consultez : ACCES-MOBILE-RESEAU-LOCAL.md"
echo ""

