#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

docker compose down

echo "Client and server containers are stopped."
echo "MySQL (ecs-mysql) is still running. Stop it with: docker/stop-mysql.sh"
