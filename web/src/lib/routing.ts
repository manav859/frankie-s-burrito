import { stripBase } from './base-path'
import { APP_ROUTES } from './routes'

export type AppRoute =
  | { kind: 'home' }
  | { kind: 'menu' }
  | { kind: 'order' }
  | { kind: 'menu-item'; slug: string }
  | { kind: 'cart' }
  | { kind: 'checkout' }
  | { kind: 'order-success' }
  | { kind: 'blog' }
  | { kind: 'post'; slug: string }
  | { kind: 'page'; slug: string }

function normalizePathname(pathname: string) {
  const unbasedPath = stripBase(pathname)

  if (!unbasedPath || unbasedPath === '/') {
    return '/'
  }

  return unbasedPath.replace(/\/+$/, '') || '/'
}

export function getAppRoute(pathname: string): AppRoute {
  const normalized = normalizePathname(pathname)

  if (normalized === '/') {
    return { kind: 'home' }
  }

  if (normalized === APP_ROUTES.blog) {
    return { kind: 'blog' }
  }

  if (normalized === APP_ROUTES.menu) {
    return { kind: 'menu' }
  }

  if (normalized === APP_ROUTES.order) {
    return { kind: 'order' }
  }

  if (normalized.startsWith(`${APP_ROUTES.menu}/`)) {
    return { kind: 'menu-item', slug: normalized.replace(`${APP_ROUTES.menu}/`, '') }
  }

  if (normalized === APP_ROUTES.cart) {
    return { kind: 'cart' }
  }

  if (normalized === APP_ROUTES.checkout) {
    return { kind: 'checkout' }
  }

  if (normalized === APP_ROUTES.orderSuccess) {
    return { kind: 'order-success' }
  }

  if (normalized.startsWith(`${APP_ROUTES.blog}/`)) {
    return { kind: 'post', slug: normalized.replace(`${APP_ROUTES.blog}/`, '') }
  }

  return { kind: 'page', slug: normalized.replace(/^\//, '') }
}
