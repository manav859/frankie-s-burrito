import { withBase } from './base-path'
import { WORDPRESS_BASE_URL } from './env'

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

function shouldForceMenuHref(href: string, label?: string) {
  const normalizedHref = normalizePath(href)
  const normalizedLabel = normalizeLabel(label)

  if (normalizedHref === APP_ROUTES.order) {
    return true
  }

  if (/^order(?:\s+online|\s+now)?$/.test(normalizedLabel)) {
    return true
  }

  if (!isExternalHref(href)) {
    return false
  }

  try {
    const { host } = new URL(href)
    return /(?:^|\.)toasttab\.com$/i.test(host) || /(?:^|\.)toasttakeout\.com$/i.test(host)
  } catch {
    return false
  }
}

function getKnownInternalHosts() {
  const hosts = new Set<string>()

  if (typeof window !== 'undefined' && /^https?:$/i.test(window.location.protocol)) {
    hosts.add(window.location.host.toLowerCase())
  }

  if (WORDPRESS_BASE_URL) {
    try {
      hosts.add(new URL(WORDPRESS_BASE_URL).host.toLowerCase())
    } catch {
      // Ignore malformed env value.
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

  if (shouldForceMenuHref(trimmedHref, label)) {
    return withBase(APP_ROUTES.menu)
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
