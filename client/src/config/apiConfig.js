// Base URL the client uses to reach the ECS backend API.
//
// Defaults to the local development server so nothing changes for
// developers running `npm start` on their own machine. Any other
// environment (docker-compose, staging, production) should set
// REACT_APP_API_BASE_URL so the browser talks to the correct host instead
// of the hardcoded developer machine address.
//
// Create React App only exposes environment variables prefixed with
// REACT_APP_ to client code, and it inlines their values when the
// development server (or build) starts, so this variable must be present
// in the environment before `npm start`/`npm run build` runs.
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
