#!/usr/bin/env bash
# Pulls mysql:8 if needed, then creates and starts the ecs-mysql container.
# Publishes 3306 on the host and joins Docker network ecs-net so the ECS server can reach it.

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

container_name="ecs-mysql"
network_name="ecs-net"
volume_name="ecs-mysql-data"
init_sql="$repo_root/docker/init-ecsdb.sql"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker and try again." >&2
  exit 1
fi

echo "Pulling mysql:8 if it is not already present..."
docker pull mysql:8

if ! docker network inspect "$network_name" >/dev/null 2>&1; then
  echo "Creating Docker network $network_name..."
  docker network create "$network_name" >/dev/null
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$container_name"; then
  if ! docker ps --format '{{.Names}}' | grep -qx "$container_name"; then
    echo "Starting existing container $container_name..."
    docker start "$container_name" >/dev/null
  else
    echo "Container $container_name is already running."
  fi
  docker network connect --alias mysql "$network_name" "$container_name" >/dev/null 2>&1 || true
else
  echo "Creating container $container_name..."
  docker run -d \
    --name "$container_name" \
    --network "$network_name" \
    --network-alias mysql \
    --restart unless-stopped \
    -e MYSQL_ROOT_PASSWORD=mysql \
    -e MYSQL_DATABASE=ecsdb \
    -p 3306:3306 \
    -v "${volume_name}:/var/lib/mysql" \
    -v "${init_sql}:/docker-entrypoint-initdb.d/01-init-ecsdb.sql:ro" \
    mysql:8 >/dev/null
fi

echo "Waiting for MySQL to accept connections..."
ready=0
for _ in $(seq 1 40); do
  if docker exec "$container_name" mysqladmin ping -h 127.0.0.1 -uroot -pmysql --silent >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  echo "MySQL did not become ready in time. Check: docker logs $container_name" >&2
  exit 1
fi

echo "Applying ECS schema (safe to re-run)..."
docker exec -i "$container_name" mysql -uroot -pmysql ecsdb < "$init_sql"

echo
echo "MySQL is running."
echo "  Container: $container_name"
echo "  Host port: 3306"
echo "  Database:  ecsdb"
echo "  User:      root"
echo "  Password:  mysql"
echo "  Docker DNS: ecs-mysql  (alias: mysql)"
echo "Stop with:  docker/stop-mysql.sh"
