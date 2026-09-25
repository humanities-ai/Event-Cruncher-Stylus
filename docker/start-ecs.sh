#!/usr/bin/env bash
# Requires Docker Engine + Compose v2.
# Starts MySQL (ecs-mysql), then builds and starts the Debian client and server images.

set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
cd "$repo_root"

server_env_path="$repo_root/server/server.env"
if [[ ! -f "$server_env_path" ]]; then
  touch "$server_env_path"
  echo "Created empty server/server.env. Add NAVIGATOR_TOOLKIT_API_KEY and NAVIGATOR_CLAUDE_API_KEY there for AI features."
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker and try again." >&2
  exit 1
fi

"$script_dir/start-mysql.sh"

echo "Pulling and building Debian Node images if needed..."
docker compose build --pull

echo "Starting Event Cruncher Stylus client and server..."
docker compose up -d

docker compose ps

echo
echo "Client:  http://localhost:3000"
echo "Server:  http://localhost:4000"
echo "MySQL:   localhost:3306  (container ecs-mysql, database ecsdb)"
echo "Stop apps with:  docker/stop-ecs.sh"
echo "Stop MySQL with: docker/stop-mysql.sh"
