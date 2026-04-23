// frontend/src/config/env.js

/**
 * Helper to clean and trim environment variables.
 */
function clean(v) {
  if (v == null) return "";
  return String(v).trim();
}

const DEFAULT_BACKEND_URL = "https://tsu-thesis-backend.onrender.com";

/**
 * Centralized environment configuration.
 * Values are baked in at build-time by Vite.
 */
export const ENV = {
  // Main API Endpoint
  API_BASE_URL: clean(import.meta.env.VITE_API_BASE_URL) || `${DEFAULT_BACKEND_URL}/api`,

  // Base URL for Images/Static files from backend
  API_BASE_URL_IMAGE: clean(import.meta.env.VITE_API_BASE_URL_IMAGE) || DEFAULT_BACKEND_URL,

  // EmailJS Configuration
  EMAILJS_SERVICE_ID: clean(import.meta.env.VITE_EMAILJS_SERVICE_ID),
  EMAILJS_TEMPLATE_ID: clean(import.meta.env.VITE_EMAILJS_TEMPLATE_ID),
  EMAILJS_PUBLIC_KEY: clean(import.meta.env.VITE_EMAILJS_PUBLIC_KEY),

  // Google Maps Configuration
  GOOGLE_MAPS_API_KEY: clean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
};

/**
 * Log warnings for missing critical environment variables.
 */
export function warnMissingEnv() {
  const critical = ["VITE_API_BASE_URL", "VITE_GOOGLE_MAPS_API_KEY"];
  const missing = critical.filter(key => !import.meta.env[key]);

  if (missing.length) {
    console.warn("[ENV] Missing recommended env vars:", missing.join(", "));
    console.warn(`[ENV] Using default API URL: ${ENV.API_BASE_URL}`);
  }
}