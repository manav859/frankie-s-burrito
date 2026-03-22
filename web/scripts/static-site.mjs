import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(__dirname, '..')
const generatedJsonPath = path.join(webRoot, 'src', 'generated', 'site-bootstrap.json')
const publicDir = path.join(webRoot, 'public')
const indexPath = path.join(webRoot, 'index.html')
const siteBasePath = (process.env.VITE_SITE_BASE_PATH || '/').replace(/\/$/, '')

function withBase(value) {
  if (!value || /^([a-z]+:)?\/\//i.test(value) || value.startsWith('mailto:') || value.startsWith('tel:')) {
    return value
  }

  if (value.startsWith('#')) {
    return siteBasePath ? `${siteBasePath}/${value}` : value
  }

  const normalized = value.startsWith('/') ? value : `/${value}`
  return `${siteBasePath}${normalized}` || normalized
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString()
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value.replace(' ', 'T') + 'Z').toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function renderList(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
}

function renderTaxonomyList(terms) {
  if (!terms?.length) {
    return ''
  }

  return `<ul>${terms.map((term) => `<li>${escapeHtml(term.name)}</li>`).join('')}</ul>`
}

function renderNavigation(items) {
  return items
    .map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`)
    .join(' ')
}

function renderBreadcrumbs(items) {
  return `
    <nav aria-label="Breadcrumb">
      <ol>
        ${items
          .map(
            (item) => `
              <li>
                ${item.href ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>` : escapeHtml(item.label)}
              </li>`,
          )
          .join('')}
      </ol>
    </nav>
  `
}

function buildBlogIndexSchema(bootstrap) {
  const siteUrl = bootstrap.seo.canonicalUrl.replace(/\/$/, '')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Journal', item: `${siteUrl}/blog/` },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': `${siteUrl}/blog/#webpage`,
        url: `${siteUrl}/blog/`,
        name: `Journal | ${bootstrap.content.siteName}`,
        description: `Stories, updates, and announcements from ${bootstrap.content.siteName}.`,
      },
    ],
  }
}

function renderHomepageMarkup(bootstrap) {
  const { content } = bootstrap
  const featured = content.featuredItems
    .map(
      (item) => `
        <article>
          ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || item.name)}" loading="lazy" decoding="async" />` : ''}
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <p><strong>${escapeHtml(item.price)}</strong></p>
        </article>`,
    )
    .join('')

  const sections = content.menu.sections
    .map(
      (section) => `
        <section>
          <h3>${escapeHtml(section.title)}</h3>
          <ul>${renderList(section.items)}</ul>
        </section>`,
    )
    .join('')

  return `
    <main>
      <header id="top">
        <nav>${renderNavigation(content.navigation)}</nav>
        <p>${escapeHtml(content.announcement)}</p>
        <h1>${escapeHtml(content.hero.title)}</h1>
        <p>${escapeHtml(content.siteTagline)}</p>
      </header>
      <section id="featured">
        <h2>${escapeHtml(content.featuredIntro.title)}</h2>
        ${featured}
      </section>
      <section id="reasons">
        <h2>${escapeHtml(content.reasons.title)}</h2>
        <p>${escapeHtml(content.reasons.body)}</p>
        ${content.reasons.items
          .map(
            (item) => `
              <article>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.body)}</p>
              </article>`,
          )
          .join('')}
      </section>
      <section id="menu">
        <h2>${escapeHtml(content.menu.title)}</h2>
        ${sections}
      </section>
      <section id="about">
        <h2>${escapeHtml(content.about.title)}</h2>
        ${content.about.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </section>
      <section id="location">
        <h2>${escapeHtml(content.location.title)}</h2>
        <p>${escapeHtml(content.location.name)}</p>
        <p>${escapeHtml(content.location.address)}</p>
        <p>${escapeHtml(content.location.hours)}</p>
      </section>
      <section id="proof">
        <h2>${escapeHtml(content.proof.title)}</h2>
        <p>${escapeHtml(content.proof.body)}</p>
        ${content.proof.items
          .map(
            (item) => `
              <blockquote>
                <p>${escapeHtml(item.body)}</p>
                ${item.source ? `<footer>${escapeHtml(item.source)}</footer>` : ''}
              </blockquote>`,
          )
          .join('')}
      </section>
    </main>
  `
}

function renderBlogIndexMarkup(bootstrap, posts) {
  return `
    <main>
      <section>
        <nav>${renderNavigation(bootstrap.content.navigation)}</nav>
        ${renderBreadcrumbs([
          { label: 'Home', href: withBase('/') },
          { label: 'Journal' },
        ])}
        <p>Journal</p>
        <h1>Stories, updates, and announcements.</h1>
      </section>
      <section>
        ${posts
          .map(
            (post) => `
              <article>
                ${post.featuredImage ? `<img src="${escapeHtml(post.featuredImage)}" alt="${escapeHtml(post.featuredImageAlt || post.title)}" loading="lazy" decoding="async" />` : ''}
                <h2><a href="${withBase(`/blog/${escapeHtml(post.slug)}/`)}">${escapeHtml(post.title)}</a></h2>
                <p><time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))}</time></p>
                <p>${escapeHtml(post.excerpt)}</p>
                ${renderTaxonomyList(post.categories)}
              </article>`,
          )
          .join('')}
      </section>
    </main>
  `
}

function renderEntryMarkup(bootstrap, entry) {
  const breadcrumbs =
    entry.type === 'post'
      ? [
          { label: 'Home', href: withBase('/') },
          { label: 'Journal', href: withBase('/blog/') },
          { label: entry.title },
        ]
      : [{ label: 'Home', href: withBase('/') }, { label: entry.title }]

  return `
    <main>
      <section>
        <nav>${renderNavigation(bootstrap.content.navigation)}</nav>
        ${renderBreadcrumbs(breadcrumbs)}
        <p>${escapeHtml(entry.type === 'post' ? 'Journal' : 'Page')}</p>
        <h1>${escapeHtml(entry.title)}</h1>
        ${'excerpt' in entry && entry.excerpt ? `<p>${escapeHtml(entry.excerpt)}</p>` : ''}
        ${'publishedAt' in entry && entry.publishedAt ? `<p><time datetime="${escapeHtml(entry.publishedAt)}">${escapeHtml(new Date(entry.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))}</time></p>` : ''}
      </section>
      <article>
        ${entry.featuredImage ? `<img src="${escapeHtml(entry.featuredImage)}" alt="${escapeHtml(entry.featuredImageAlt || entry.title)}" decoding="async" fetchpriority="high" />` : ''}
        <div>${entry.content}</div>
        ${'categories' in entry ? renderTaxonomyList(entry.categories) : ''}
        ${'related' in entry && entry.related.length ? `
          <aside>
            <h2>Related stories</h2>
            ${entry.related
              .map(
                (post) => `
                  <article>
                    <h3><a href="${withBase(`/blog/${escapeHtml(post.slug)}/`)}">${escapeHtml(post.title)}</a></h3>
                    <p>${escapeHtml(post.excerpt)}</p>
                  </article>`,
              )
              .join('')}
          </aside>` : ''}
      </article>
    </main>
  `
}

function createHtmlDocument({ seo, rootMarkup }) {
  const ogType =
    seo.schema && typeof seo.schema === 'object' && JSON.stringify(seo.schema).includes('BlogPosting')
      ? 'article'
      : 'website'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rye&display=swap" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(seo.title)}</title>
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <meta name="keywords" content="${escapeHtml(seo.keywords || '')}" />
    <meta name="robots" content="${seo.noindex ? 'noindex,nofollow' : 'index,follow'}" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(seo.ogImage || '')}" />
    <meta name="twitter:card" content="${escapeHtml(seo.twitterCard || 'summary_large_image')}" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    <meta name="twitter:image" content="${escapeHtml(seo.ogImage || '')}" />
    <link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />
    ${seo.schema ? `<script type="application/ld+json">${JSON.stringify(seo.schema)}</script>` : ''}
  </head>
  <body>
    <div id="root">${rootMarkup}</div>
    <script type="module" src="%BASE_URL%src/main.tsx"></script>
  </body>
</html>
`
}

async function writeRouteHtml(routePath, html) {
  const normalized = routePath === '/' ? indexPath : path.join(webRoot, routePath.replace(/^\//, ''), 'index.html')
  await fs.mkdir(path.dirname(normalized), { recursive: true })
  await fs.writeFile(normalized, html)
}

export async function buildStaticSite({ bootstrap, posts = [], pages = [], entries = [] }) {
  const homepageHtml = createHtmlDocument({
    seo: bootstrap.seo,
    rootMarkup: renderHomepageMarkup(bootstrap),
  })

  await fs.mkdir(publicDir, { recursive: true })
  await writeRouteHtml('/', homepageHtml)

  const blogSeo = {
    ...bootstrap.seo,
    title: `Journal | ${bootstrap.content.siteName}`,
    description: `Stories, updates, and announcements from ${bootstrap.content.siteName}.`,
    canonicalUrl: `${bootstrap.seo.canonicalUrl.replace(/\/$/, '')}/blog/`,
    schema: buildBlogIndexSchema(bootstrap),
  }

  await writeRouteHtml(
    '/blog',
    createHtmlDocument({
      seo: blogSeo,
      rootMarkup: renderBlogIndexMarkup(bootstrap, posts),
    }),
  )

  for (const entry of entries) {
    const routePath = entry.type === 'post' ? `/blog/${entry.slug}` : `/${entry.slug}`
    const descriptionFallback =
      entry.seo.description || stripHtml('excerpt' in entry ? entry.excerpt || entry.content : entry.content).slice(0, 160)

    await writeRouteHtml(
      routePath,
      createHtmlDocument({
        seo: {
          ...bootstrap.seo,
          ...entry.seo,
          description: descriptionFallback,
        },
        rootMarkup: renderEntryMarkup(bootstrap, entry),
      }),
    )
  }

  const sitemapUrls = [
    {
      url: bootstrap.seo.canonicalUrl,
      lastmod: toIsoDate(bootstrap.generatedAt),
    },
    {
      url: `${bootstrap.seo.canonicalUrl.replace(/\/$/, '')}/blog/`,
      lastmod: toIsoDate(bootstrap.generatedAt),
    },
    ...posts
      .filter((post) => !post.seo.noindex)
      .map((post) => ({
        url: `${bootstrap.seo.canonicalUrl.replace(/\/$/, '')}/blog/${post.slug}/`,
        lastmod: toIsoDate(post.modifiedAt || post.publishedAt),
      })),
    ...pages
      .filter((page) => !page.seo.noindex)
      .map((page) => ({
        url: `${bootstrap.seo.canonicalUrl.replace(/\/$/, '')}/${page.slug}/`,
        lastmod: toIsoDate(page.modifiedAt || bootstrap.generatedAt),
      })),
  ]

  const robots = bootstrap.seo.noindex
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nSitemap: ${bootstrap.seo.canonicalUrl.replace(/\/$/, '')}/sitemap.xml\n`

  const notFoundHtml = createHtmlDocument({
    seo: {
      ...bootstrap.seo,
      title: `Page not found | ${bootstrap.content.siteName}`,
      description: `The requested page could not be found on ${bootstrap.content.siteName}.`,
      canonicalUrl: `${bootstrap.seo.canonicalUrl.replace(/\/$/, '')}/404/`,
      noindex: true,
      schema: {},
    },
    rootMarkup: `
      <main>
        <section>
          <h1>Page not found</h1>
          <p>The requested page could not be found.</p>
          <p><a href="${withBase('/')}">Return to the homepage</a></p>
        </section>
      </main>
    `,
  })

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (item) => `  <url>
    <loc>${escapeHtml(item.url)}</loc>
    <lastmod>${escapeHtml(item.lastmod)}</lastmod>
  </url>`,
  )
  .join('\n')}
</urlset>
`

  await fs.writeFile(path.join(publicDir, 'robots.txt'), robots)
  await fs.writeFile(path.join(publicDir, 'sitemap.xml'), sitemap)
  await fs.writeFile(path.join(publicDir, '404.html'), notFoundHtml)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = await fs.readFile(generatedJsonPath, 'utf8')
  await buildStaticSite({ bootstrap: JSON.parse(raw) })
}
