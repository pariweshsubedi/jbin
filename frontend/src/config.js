// API URL configuration
// - In development: use VITE_API_URL or default to localhost:3001
// - In production with combined deployment: use empty string (same origin)
// - In production with separate deployment: VITE_API_URL should be set to backend URL

const isDevelopment = import.meta.env.DEV;
const configuredUrl = import.meta.env.VITE_API_URL;

let API_URL;

if (isDevelopment) {
  // Development mode - use configured URL or default to localhost
  API_URL = configuredUrl || 'http://localhost:3001';
} else if (configuredUrl && configuredUrl !== '/') {
  // Production with separate backend - use configured URL
  API_URL = configuredUrl;
} else {
  // Production with combined deployment - use same origin
  API_URL = '';
}

export { API_URL };
