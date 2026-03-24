import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildStaticSite } from './static-site.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(__dirname, '..')
const generatedJsonPath = path.join(webRoot, 'src', 'generated', 'site-bootstrap.json')

async function readLocalBootstrap() {
  const raw = await fs.readFile(generatedJsonPath, 'utf8')
  return JSON.parse(raw)
}

function getBaseUrl() {
  return process.env.WORDPRESS_BASE_URL || process.env.VITE_WORDPRESS_BASE_URL
}

function rewriteUrl(value, siteUrl) {
  if (typeof value !== 'string' || !siteUrl) {
    return value
  }

  if (value.startsWith('/')) {
    return `${siteUrl.replace(/\/$/, '')}${value}`
  }

  return value
}

function rewritePayloadUrls(value, siteUrl) {
  if (typeof value === 'string') {
    return rewriteUrl(value, siteUrl)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => rewritePayloadUrls(entry, siteUrl))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, rewritePayloadUrls(entry, siteUrl)]))
  }

  return value
}

function applyFrontendSiteUrl(snapshot) {
  const siteUrl = process.env.VITE_SITE_URL?.replace(/\/$/, '')
  if (!siteUrl) {
    return snapshot
  }

  return {
    ...snapshot,
    bootstrap: rewritePayloadUrls(
      {
        ...snapshot.bootstrap,
        seo: {
          ...snapshot.bootstrap.seo,
          canonicalUrl: `${siteUrl}/`,
        },
      },
      siteUrl,
    ),
    posts: rewritePayloadUrls(snapshot.posts, siteUrl),
    pages: rewritePayloadUrls(snapshot.pages, siteUrl),
    entries: rewritePayloadUrls(snapshot.entries, siteUrl),
  }
}

async function fetchJson(baseUrl, route) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  const pretty = `${normalizedBaseUrl}/wp-json${route}`
  const fallback = `${normalizedBaseUrl}/?rest_route=${encodeURIComponent(route)}`

  for (const url of [pretty, fallback]) {
    const response = await fetch(url)
    if (!response.ok) {
      continue
    }

    return response.json()
  }

  throw new Error(`Fetch failed for ${route}`)
}

async function fetchContentSnapshot() {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    const bootstrap = await readLocalBootstrap()
    return {
      bootstrap,
      posts: [],
      pages: [],
      entries: [],
    }
  }

  const [bootstrap, postsResponse, pagesResponse] = await Promise.all([
    fetchJson(baseUrl, '/frankies/v1/bootstrap'),
    fetchJson(baseUrl, '/frankies/v1/blog'),
    fetchJson(baseUrl, '/frankies/v1/pages'),
  ])

  const postEntries = await Promise.all(
    (postsResponse.items || []).map((post) => fetchJson(baseUrl, `/frankies/v1/blog/${post.slug}`)),
  )

  const pageEntries = await Promise.all(
    (pagesResponse.items || []).map((page) => fetchJson(baseUrl, `/frankies/v1/pages/${page.slug}`)),
  )

  return {
    bootstrap,
    posts: postsResponse.items || [],
    pages: pagesResponse.items || [],
    entries: [...postEntries, ...pageEntries],
  }
}

try {
  const snapshot = applyFrontendSiteUrl(await fetchContentSnapshot())
  await fs.writeFile(generatedJsonPath, `${JSON.stringify(snapshot.bootstrap, null, 2)}\n`)
  await buildStaticSite(snapshot)
  console.log('WordPress content synced and static assets generated.')
} catch (error) {
  const bootstrap = rewritePayloadUrls(await readLocalBootstrap(), process.env.VITE_SITE_URL?.replace(/\/$/, ''))
  await buildStaticSite({ bootstrap, posts: [], pages: [], entries: [] })
  console.warn(`WordPress sync failed, using local generated bootstrap instead. ${error instanceof Error ? error.message : String(error)}`)
}
