/**
 * Centralized utility for accessing environment variables in the Vite-powered frontend.
 * This ensures consistency and provides a single source of truth for backend origins.
 */

/**
 * The base URL of the WordPress backend.
 * Prioritizes VITE_WORDPRESS_BASE_URL from the environment.
 */
export const WORDPRESS_BASE_URL = (import.meta.env.VITE_WORDPRESS_BASE_URL || '').replace(/\/$/, '')

/**
 * Returns the current browser origin (without trailing slash).
 */
export function getBrowserOrigin() {
  if (typeof window === 'undefined' || !/^https?:$/i.test(window.location.protocol)) {
    return ''
  }

  return window.location.origin.replace(/\/$/, '')
}

/**
 * Checks if the WordPress backend is being proxied through the frontend dev server.
 * This is typically true during local development with the Vite proxy.
 */
export function isProxyingWordPressThroughFrontend() {
  if (!import.meta.env.DEV) {
    return false
  }

  const browserOrigin = getBrowserOrigin()
  // If we're on localhost but not on the typical WP port, we might be proxying.
  return Boolean(browserOrigin) && !browserOrigin.endsWith(':8080')
}

/**
 * Resolves the absolute WordPress origin to use for API requests.
 * 1. If proxying, use the browser origin (Vite will handle the /wp-json prefix).
 * 2. If VITE_WORDPRESS_BASE_URL is set, use it.
 * 3. Otherwise, return empty (requests will likely fail or use relative paths).
 */
export function getWordPressOrigin() {
  if (isProxyingWordPressThroughFrontend()) {
    return getBrowserOrigin()
  }

  return WORDPRESS_BASE_URL
}
