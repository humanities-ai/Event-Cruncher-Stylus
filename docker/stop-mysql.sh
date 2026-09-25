#!/usr/bin/env bash
set -euo pipefail

container_name="ecs-mysql"

if ! docker ps -a --format '{{.Names}}' | grep -qx "$container_name"; then
  echo "Container $container_name does not exist."
  exit 0
fi

docker stop "$container_name" >/dev/null
echo "Stopped $container_name. Data volume ecs-mysql-data was kept."
echo "Start again with:  docker/start-mysql.sh"
