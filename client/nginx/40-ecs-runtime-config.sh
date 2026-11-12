#!/bin/sh
# Runs when the production client container starts (the nginx image executes
# every script in /docker-entrypoint.d/ before launching nginx).
#
# Writes env-config.js, which the browser loads before the application bundle,
# so settings come from the host running the container rather than from the
# image. An unset or empty API_BASE_URL means "same origin".

set -eu

runtime_config_path="/usr/share/nginx/html/env-config.js"

# Escape backslashes and double quotes so the value is a valid JavaScript string.
escaped_api_base_url="$(printf '%s' "${API_BASE_URL:-}" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"

cat > "${runtime_config_path}" <<EOF
window.__ECS_CONFIG__ = {
  API_BASE_URL: "${escaped_api_base_url}"
};
EOF

echo "ecs-runtime-config: wrote ${runtime_config_path} (API_BASE_URL='${API_BASE_URL:-}')"
