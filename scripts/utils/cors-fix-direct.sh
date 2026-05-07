#!/bin/bash

set -euo pipefail

echo "🔧 Correction CORS"
echo "Ce projet centralise maintenant les origines dans .env / .env.example."
echo "Vérifie surtout ALLOWED_ORIGINS, FRONTEND_URL et CORS_ORIGIN, puis relance la gateway."
echo ""
echo "Pour diagnostiquer : make diagnostic-cors"
