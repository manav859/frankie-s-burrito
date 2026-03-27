import { withBase } from './base-path'

export const APP_ROUTES = {
  home: '/',
  blog: '/blog',
  menu: '/menu',
  order: '/order',
  cart: '/cart',
  checkout: '/checkout',
  orderSuccess: '/order-success',
} as const

function normalizePath(path: string) {
  const trimmed = path.trim()

  if (!trimmed) {
    return ''
  }

  if (trimmed === '/') {
    return '/'
  }

  return trimmed.replace(/\/+$/, '') || '/'
}

function normalizeLabel(label?: string) {
  return (label || '').trim().toLowerCase()
}

function isExternalHref(href: string) {
  return /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')
}

function getKnownInternalHosts() {
  const hosts = new Set<string>()

  if (typeof window !== 'undefined' && /^https?:$/i.test(window.location.protocol)) {
    hosts.add(window.location.host.toLowerCase())
  }

  for (const candidate of [
    import.meta.env.VITE_WORDPRESS_BASE_URL,
    import.meta.env.WORDPRESS_BASE_URL,
    'http://localhost:8080',
    'https://localhost:8080',
    'http://127.0.0.1:8080',
    'https://127.0.0.1:8080',
  ]) {
    if (!candidate) {
      continue
    }

    try {
      hosts.add(new URL(candidate).host.toLowerCase())
    } catch {
      // Ignore malformed local env values.
    }
  }

  return hosts
}

function mapKnownRoute(path: string, label?: string) {
  const normalizedPath = normalizePath(path)
  const normalizedLabel = normalizeLabel(label)

  if (normalizedPath === '#' || !normalizedPath) {
    return ''
  }

  if (
    normalizedPath === '#top' ||
    normalizedPath === '/#top' ||
    normalizedLabel === 'home'
  ) {
    return APP_ROUTES.home
  }

  if (
    normalizedPath === '#blog' ||
    normalizedPath === '/#blog' ||
    normalizedPath === APP_ROUTES.blog ||
    normalizedLabel === 'blog' ||
    normalizedLabel === 'journal'
  ) {
    return APP_ROUTES.blog
  }

  if (
    normalizedPath === '#menu' ||
    normalizedPath === '/#menu' ||
    normalizedPath === APP_ROUTES.menu ||
    /\bmenu\b/.test(normalizedLabel)
  ) {
    return APP_ROUTES.menu
  }

  if (
    normalizedPath === '#location' ||
    normalizedPath === '/#location' ||
    normalizedPath === APP_ROUTES.order ||
    /\border\b/.test(normalizedLabel)
  ) {
    return APP_ROUTES.order
  }

  return normalizedPath
}

export function resolveAppHref(href: string, label?: string) {
  const trimmedHref = (href || '').trim()

  if (!trimmedHref) {
    return '#'
  }

  if (trimmedHref.startsWith('mailto:') || trimmedHref.startsWith('tel:')) {
    return trimmedHref
  }

  if (trimmedHref.startsWith('#')) {
    const mappedHash = mapKnownRoute(trimmedHref, label)

    if (mappedHash.startsWith('/')) {
      return withBase(mappedHash)
    }

    return withBase(`/${trimmedHref}`)
  }

  if (isExternalHref(trimmedHref)) {
    try {
      const parsed = new URL(trimmedHref)
      if (!getKnownInternalHosts().has(parsed.host.toLowerCase())) {
        return trimmedHref
      }

      const mappedPath = mapKnownRoute(`${parsed.pathname}${parsed.search}${parsed.hash}`, label)
      return mappedPath.startsWith('/') ? withBase(mappedPath) : mappedPath
    } catch {
      return trimmedHref
    }
  }

  const mappedPath = mapKnownRoute(trimmedHref.startsWith('/') ? trimmedHref : `/${trimmedHref}`, label)
  return mappedPath.startsWith('/') ? withBase(mappedPath) : mappedPath
}
