import { useEffect } from 'react'
import type { SiteIntegration, SiteSeo } from '../types'

const STRUCTURED_DATA_ID = 'frankies-structured-data'
const GA_SCRIPT_ID = 'frankies-ga-loader'

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    document.head.appendChild(element)
  }
  element.href = href
}

function upsertStructuredData(schema: unknown) {
  let element = document.getElementById(STRUCTURED_DATA_ID) as HTMLScriptElement | null
  if (!element) {
    element = document.createElement('script')
    element.type = 'application/ld+json'
    element.id = STRUCTURED_DATA_ID
    document.head.appendChild(element)
  }
  element.textContent = JSON.stringify(schema)
}

function ensureGa(measurementId: string) {
  if (!measurementId || document.getElementById(GA_SCRIPT_ID)) {
    return
  }

  const bootstrap = document.createElement('script')
  bootstrap.id = GA_SCRIPT_ID
  bootstrap.async = true
  bootstrap.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(bootstrap)

  const inline = document.createElement('script')
  inline.textContent = [
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){dataLayer.push(arguments);}',
    "gtag('js', new Date());",
    `gtag('config', '${measurementId}', { send_page_view: true });`,
  ].join('')
  document.head.appendChild(inline)
}

function resolveOgType(schema: unknown) {
  if (!schema) {
    return 'website'
  }

  const serialized = JSON.stringify(schema)
  return serialized.includes('BlogPosting') ? 'article' : 'website'
}

export function useSeo(payload: { seo: Partial<SiteSeo>; integration: SiteIntegration }) {
  useEffect(() => {
    const { seo, integration } = payload
    const resolvedSeo: SiteSeo = {
      title: seo.title || '',
      description: seo.description || '',
      canonicalUrl: seo.canonicalUrl || '',
      ogImage: seo.ogImage || '',
      keywords: seo.keywords || '',
      noindex: Boolean(seo.noindex),
      twitterCard: seo.twitterCard || 'summary_large_image',
      schema: seo.schema || {},
    }

    document.title = resolvedSeo.title
    upsertMeta('description', resolvedSeo.description)
    upsertMeta('keywords', resolvedSeo.keywords)
    upsertMeta('robots', resolvedSeo.noindex ? 'noindex,nofollow' : 'index,follow')
    upsertMeta('og:title', resolvedSeo.title, 'property')
    upsertMeta('og:description', resolvedSeo.description, 'property')
    upsertMeta('og:type', resolveOgType(resolvedSeo.schema), 'property')
    upsertMeta('og:url', resolvedSeo.canonicalUrl, 'property')
    upsertMeta('og:image', resolvedSeo.ogImage, 'property')
    upsertMeta('twitter:card', resolvedSeo.twitterCard)
    upsertMeta('twitter:title', resolvedSeo.title)
    upsertMeta('twitter:description', resolvedSeo.description)
    upsertMeta('twitter:image', resolvedSeo.ogImage)
    upsertLink('canonical', resolvedSeo.canonicalUrl)
    upsertStructuredData(resolvedSeo.schema)

    if (integration.gaMeasurementId) {
      ensureGa(integration.gaMeasurementId)
    }
  }, [payload])
}
