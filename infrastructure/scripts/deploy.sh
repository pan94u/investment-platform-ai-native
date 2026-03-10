#!/bin/bash
set -e

VERSION=${1:-v1}
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DOCKER_DIR="$PROJECT_ROOT/infrastructure/docker"

echo "=== Deploying Filing $VERSION ==="

if [ "$VERSION" = "all" ]; then
  for v in v1 v2 v3 v4; do
    "$0" "$v"
  done
  exit 0
fi

COMPOSE_FILE="$DOCKER_DIR/docker-compose.$VERSION.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: $COMPOSE_FILE not found"
  exit 1
fi

echo "1. Building Docker images..."
docker compose -f "$COMPOSE_FILE" build

echo "2. Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo "3. Waiting for services to be healthy..."
sleep 10

echo "4. Running database migration..."
docker compose -f "$COMPOSE_FILE" exec -T backend sh -c "cd /app && node packages/database/dist/migrate.js" 2>/dev/null || echo "  Migration skipped (may already be up to date)"

echo "5. Seeding demo data..."
docker compose -f "$COMPOSE_FILE" exec -T backend sh -c "cd /app && node packages/database/dist/seed/index.js" 2>/dev/null || echo "  Seed skipped"

echo "6. Running verification..."
"$PROJECT_ROOT/infrastructure/scripts/verify.sh" "$VERSION"

echo "=== $VERSION deployment complete ==="
