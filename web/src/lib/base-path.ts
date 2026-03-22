const BASE_URL = import.meta.env.BASE_URL || '/'

function normalizeBasePath() {
  if (!BASE_URL || BASE_URL === '/') {
    return ''
  }

  return BASE_URL.replace(/\/$/, '')
}

export function withBase(path: string) {
  if (!path || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('mailto:') || path.startsWith('tel:')) {
    return path
  }

  if (path.startsWith('#')) {
    const basePath = normalizeBasePath()
    return basePath ? `${basePath}/${path}` : path
  }

  const basePath = normalizeBasePath()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${basePath}${normalizedPath}` || normalizedPath
}

export function stripBase(pathname: string) {
  const basePath = normalizeBasePath()
  if (!basePath) {
    return pathname || '/'
  }

  if (pathname === basePath) {
    return '/'
  }

  return pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) || '/' : pathname
}
