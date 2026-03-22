import { stripBase } from './base-path'

export type AppRoute =
  | { kind: 'home' }
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

  if (normalized.startsWith('/blog/')) {
    return { kind: 'post', slug: normalized.replace('/blog/', '') }
  }

  return { kind: 'page', slug: normalized.replace(/^\//, '') }
}
