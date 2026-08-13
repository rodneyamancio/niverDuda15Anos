#!/bin/bash
# Deploy/atualização em produção — rode no servidor, dentro da pasta do projeto
set -e
cd "$(dirname "$0")"

echo "📥 1/3 Atualizando o código..."
git pull

echo "🐳 2/3 Rebuild e subida (migrations rodam automaticamente)..."
docker compose -f docker-compose.prod.yml up -d --build

echo "🧹 3/3 Limpando imagens antigas..."
docker image prune -f

echo ""
echo "✅ Deploy concluído!"
echo "   Logs: docker compose -f docker-compose.prod.yml logs -f app"
