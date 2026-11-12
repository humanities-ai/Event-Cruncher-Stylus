// Base URL the client uses to reach the ECS backend API.
//
// The value is resolved in this order:
//
//   1. Runtime configuration (window.__ECS_CONFIG__.API_BASE_URL), written by
//      the production client container when it starts (see
//      client/nginx/40-ecs-runtime-config.sh). An empty string is a valid
//      value and means "same origin", so requests go to /api/... on whatever
//      host served the page. This lets the host that runs the container
//      change the setting without rebuilding the image.
//   2. REACT_APP_API_BASE_URL, which Create React App inlines when the
//      development server starts (or when `npm run build` runs). The docker
//      compose setup used for local development relies on this.
//   3. The local development server, so nothing changes for developers
//      running `npm start` on their own machine.
//
// Create React App only exposes environment variables prefixed with
// REACT_APP_ to client code.
const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:4000';

function resolveApiBaseUrl() {
  const runtimeConfiguration = window.__ECS_CONFIG__;
  if (runtimeConfiguration && typeof runtimeConfiguration.API_BASE_URL === 'string') {
    return runtimeConfiguration.API_BASE_URL.trim().replace(/\/+$/, '');
  }

  return process.env.REACT_APP_API_BASE_URL || DEFAULT_LOCAL_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
