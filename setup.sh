#!/bin/bash
# Sobe tudo (banco + app) no Docker. Requer Docker Desktop aberto.
set -e

echo "🚀 Subindo banco + app no Docker..."
docker compose up -d

echo ""
echo "✅ Containers no ar! Na primeira vez o app demora alguns minutos"
echo "   (npm install + migrations). Acompanhe com:"
echo ""
echo "   docker compose logs -f app"
echo ""
echo "Quando aparecer 'Ready', acesse:"
echo "   Painel admin: http://localhost:3000/admin"
