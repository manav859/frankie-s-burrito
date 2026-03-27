import { stripBase } from './base-path'

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

  if (normalized === '/blog') {
    return { kind: 'blog' }
  }

  if (normalized === '/menu') {
    return { kind: 'menu' }
  }

  if (normalized === '/order') {
    return { kind: 'order' }
  }

  if (normalized.startsWith('/menu/')) {
    return { kind: 'menu-item', slug: normalized.replace('/menu/', '') }
  }

  if (normalized === '/cart') {
    return { kind: 'cart' }
  }

  if (normalized === '/checkout') {
    return { kind: 'checkout' }
  }

  if (normalized === '/order-success') {
    return { kind: 'order-success' }
  }

  if (normalized.startsWith('/blog/')) {
    return { kind: 'post', slug: normalized.replace('/blog/', '') }
  }

  return { kind: 'page', slug: normalized.replace(/^\//, '') }
}
