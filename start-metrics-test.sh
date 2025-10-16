#!/bin/bash

# Script de test des métriques avec API Gateway simplifié

echo "🚀 Démarrage du système de métriques pour tests"
echo "=============================================="

# Vérifier si Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution"
    exit 1
fi

echo "✅ Docker est en cours d'exécution"

# Arrêter les services problématiques
echo ""
echo "🛑 Arrêt des services problématiques..."
docker-compose down

# Démarrer seulement les services essentiels pour les métriques
echo ""
echo "🚀 Démarrage des services de monitoring..."

# Démarrer Prometheus et cAdvisor seulement
docker-compose up -d prometheus cadvisor

# Attendre que les services démarrent
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier les services démarrés
echo ""
echo "📊 Vérification des services de monitoring..."

services=("prometheus" "cadvisor")
for service in "${services[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "$service"; then
        echo "✅ $service - En cours d'exécution"
    else
        echo "❌ $service - Arrêté"
    fi
done

# Créer une version simplifiée de l'API Gateway
echo ""
echo "🚀 Création de l'API Gateway simplifié..."

cat > /tmp/api-gateway-simple.js << 'EOF'
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Configuration CORS simple
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3001',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

// ✅ Middleware de base
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Route pour récupérer la personnalisation utilisateur
app.get('/api/v1/users/customization', async (req, res) => {
  try {
    console.log('⚙️ Route /api/v1/users/customization interceptée');

    // Mode développement : retourner des paramètres de personnalisation par défaut
    const mockCustomization = {
      success: true,
      customization: {
        theme: 'light',
        language: 'fr',
        dashboardLayout: 'default',
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        features: {
          analytics: true,
          maintenance: true,
          security: true
        },
        metrics: {
          refreshInterval: 30000,
          defaultView: 'system',
          showContainers: true,
          showServices: true
        }
      },
      fallback: true,
      message: 'Personnalisation utilisateur (mode développement)'
    };

    res.status(200).json(mockCustomization);

  } catch (error) {
    console.error('Error in user customization:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ Route pour récupérer le profil utilisateur
app.get('/api/v1/auth/profile', async (req, res) => {
  try {
    console.log('👤 Route /api/v1/auth/profile interceptée');

    const mockProfile = {
      success: true,
      user: {
        id: 'dev_user_1',
        email: 'admin@jobbingtrack.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        isActive: true,
        isDeleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      fallback: true,
      message: 'Profil utilisateur (mode développement)'
    };

    res.status(200).json(mockProfile);

  } catch (error) {
    console.error('Error in auth profile:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ Route Prometheus pour les métriques
app.get('/api/v1/maintenance/metrics/prometheus/query', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre query requis'
      });
    }

    const prometheusUrl = 'http://prometheus:9090';

    const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
      params: { query },
      timeout: 5000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Erreur proxy Prometheus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des métriques Prometheus',
      error: error.message
    });
  }
});

// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ✅ Route de fallback
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: 'Cette route n\'existe pas dans l\'API Gateway'
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Gateway démarré sur le port ${PORT}`);
  console.log('📋 Routes disponibles:');
  console.log('  /api/v1/users/customization');
  console.log('  /api/v1/auth/profile');
  console.log('  /api/v1/maintenance/metrics/prometheus/query');
  console.log('  /health');
});

module.exports = server;
EOF

# Démarrer l'API Gateway simplifié
echo ""
echo "🚀 Démarrage de l'API Gateway simplifié..."
node /tmp/api-gateway-simple.js &
API_GATEWAY_PID=$!

# Attendre que l'API Gateway démarre
sleep 3

# Test des endpoints
echo ""
echo "🔗 Test des endpoints..."

# Test de l'API Gateway
echo "Test API Gateway (http://localhost:3000)..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ API Gateway - Réponse OK"
else
    echo "❌ API Gateway - Non accessible"
fi

# Test de Prometheus
echo "Test Prometheus (http://localhost:9090)..."
if curl -s http://localhost:9090/-/healthy > /dev/null; then
    echo "✅ Prometheus - Réponse OK"
else
    echo "❌ Prometheus - Non accessible"
fi

# Test de cAdvisor
echo "Test cAdvisor (http://localhost:8080)..."
if curl -s http://localhost:8080/api/v1.3/docker/ > /dev/null; then
    echo "✅ cAdvisor - Réponse OK"
else
    echo "❌ cAdvisor - Non accessible"
fi

# Test de l'endpoint de personnalisation
echo "Test endpoint personnalisation..."
if curl -s -H "Authorization: Bearer test-token" http://localhost:3000/api/v1/users/customization > /dev/null; then
    echo "✅ Endpoint personnalisation - Accessible"
else
    echo "❌ Endpoint personnalisation - Non accessible"
fi

# Test de l'endpoint Prometheus via API Gateway
echo "Test endpoint Prometheus via API Gateway..."
if curl -s -H "Authorization: Bearer test-token" "http://localhost:3000/api/v1/maintenance/metrics/prometheus/query?query=node_cpu_seconds_total" > /dev/null; then
    echo "✅ Endpoint Prometheus - Accessible"
else
    echo "❌ Endpoint Prometheus - Non accessible"
fi

echo ""
echo "📋 Instructions pour tester l'interface:"
echo ""
echo "1. Ouvrir le navigateur à l'adresse: http://localhost:3000"
echo "2. Se connecter avec les identifiants de développement"
echo "3. Aller dans le backoffice pour voir les métriques système"
echo "4. Aller dans la page des services pour voir les métriques détaillées"
echo ""
echo "🎯 Services disponibles:"
echo "• Frontend: http://localhost:3000"
echo "• API Gateway: http://localhost:3000"
echo "• Prometheus: http://localhost:9090"
echo "• cAdvisor: http://localhost:8080"
echo ""
echo "✅ Système de métriques prêt pour les tests!"
echo ""
echo "💡 Pour arrêter :"
echo "   kill $API_GATEWAY_PID"
echo "   docker-compose down"
