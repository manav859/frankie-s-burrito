import { useEffect, useRef, useState } from 'react'
import { Footer } from './components/site/Footer'
import { SiteHeader } from './components/site/SiteHeader'
import { Button } from './components/ui/Button'
import { CmsImage } from './components/ui/CmsImage'
import { usePrefersReducedMotion } from './lib/accessibility'
import { withBase } from './lib/base-path'
import { useCurrentRoute } from './lib/hooks'
import { useSeo } from './lib/seo'
import {
  getCachedBootstrap,
  getGeneratedBootstrap,
  getPageBySlug,
  getPages,
  getPostBySlug,
  getPosts,
  getSiteBootstrap,
  hasWordPressBase,
} from './lib/wordpress'
import { HomePage } from './pages/HomePage'
import type {
  PageArchiveItem,
  PageEntry,
  PostArchiveItem,
  PostEntry,
  SiteBootstrap,
  SiteContent,
} from './types'

function buildBlogRouteSeo(content: SiteContent, seo: SiteBootstrap['seo']) {
  const siteUrl = seo.canonicalUrl.replace(/\/$/, '')

  return {
    ...seo,
    title: `Journal | ${content.siteName}`,
    description: `Stories, updates, and announcements from ${content.siteName}.`,
    canonicalUrl: `${siteUrl}/blog/`,
    schema: {
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
          name: `Journal | ${content.siteName}`,
          description: `Stories, updates, and announcements from ${content.siteName}.`,
        },
      ],
    },
  }
}

function App() {
  const liveCmsEnabled = hasWordPressBase()
  const [bootstrap, setBootstrap] = useState<SiteBootstrap | null>(() =>
    liveCmsEnabled ? getCachedBootstrap() : getGeneratedBootstrap(),
  )
  const [posts, setPosts] = useState<PostArchiveItem[]>([])
  const [pages, setPages] = useState<PageArchiveItem[]>([])
  const [entry, setEntry] = useState<PostEntry | PageEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const hadInitialBootstrap = useRef(bootstrap !== null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const route = useCurrentRoute()
  const currentBootstrap = bootstrap ?? getGeneratedBootstrap()
  const content: SiteContent = currentBootstrap.content
  const shellContent: SiteContent =
    route.kind === 'home'
      ? content
      : {
          ...content,
          hero: {
            ...content.hero,
            primaryCta: {
              ...content.hero.primaryCta,
              href: content.hero.primaryCta.href.startsWith('#') ? withBase(`/${content.hero.primaryCta.href}`) : content.hero.primaryCta.href,
            },
            secondaryCta: {
              ...content.hero.secondaryCta,
              href: content.hero.secondaryCta.href.startsWith('#') ? withBase(`/${content.hero.secondaryCta.href}`) : content.hero.secondaryCta.href,
            },
          },
          navigation: content.navigation.map((item) => ({
            ...item,
            href: item.href.startsWith('#') ? withBase(`/${item.href}`) : item.href,
          })),
        }

  useEffect(() => {
    if (!liveCmsEnabled) {
      return
    }

    let activeController: AbortController | null = null

    const refreshBootstrap = async () => {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller

      try {
        const nextBootstrap = await getSiteBootstrap(controller.signal)
        setBootstrap(nextBootstrap)
        setBootstrapError(null)
      } catch (error) {
        if (!controller.signal.aborted && !hadInitialBootstrap.current) {
          setBootstrapError(error instanceof Error ? error.message : 'Unable to load CMS content.')
        }
      }
    }

    void refreshBootstrap()

    const intervalId = window.setInterval(() => {
      void refreshBootstrap()
    }, 30000)

    const handleFocus = () => {
      void refreshBootstrap()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshBootstrap()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      activeController?.abort()
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [liveCmsEnabled])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!hasWordPressBase() || route.kind === 'home') {
      setLoading(false)
      setLoadError(null)
      if (route.kind !== 'blog') {
        setPosts([])
        setPages([])
      }
      if (route.kind === 'home') {
        setEntry(null)
      }
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)

    const loadRouteData = async () => {
      try {
        if (route.kind === 'blog') {
          const [postArchive, pageArchive] = await Promise.all([
            getPosts(undefined, controller.signal),
            getPages(controller.signal),
          ])
          setPosts(postArchive.items)
          setPages(pageArchive.items)
          setEntry(null)
          return
        }

        if (route.kind === 'post') {
          const post = await getPostBySlug(route.slug, controller.signal)
          setEntry(post)
          return
        }

        if (route.kind === 'page') {
          const page = await getPageBySlug(route.slug, controller.signal)
          setEntry(page)
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load CMS content.')
      } finally {
        setLoading(false)
      }
    }

    void loadRouteData()

    return () => controller.abort()
  }, [route])

  const routeSeo =
    route.kind === 'post' || route.kind === 'page'
      ? entry?.seo ?? currentBootstrap.seo
      : route.kind === 'blog'
        ? buildBlogRouteSeo(content, currentBootstrap.seo)
        : currentBootstrap.seo

  useSeo({
    ...currentBootstrap,
    seo: routeSeo,
  })

  if (bootstrap === null) {
    return bootstrapError ? <ErrorState message={bootstrapError} /> : <LoadingState />
  }

  if (route.kind === 'home') {
    return <HomePage bootstrap={bootstrap} isScrolled={isScrolled} prefersReducedMotion={prefersReducedMotion} />
  }

  return (
    <div id="top" className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <SiteHeader content={shellContent} isScrolled={isScrolled} prefersReducedMotion={prefersReducedMotion} />
      <main className="px-8 pb-20 pt-28 md:px-16 md:pt-36">
        {route.kind === 'blog' ? (
          <BlogIndexPage content={shellContent} posts={posts} pages={pages} loading={loading} loadError={loadError} />
        ) : (
          <EntryPage content={shellContent} entry={entry} loading={loading} loadError={loadError} />
        )}
      </main>
      <Footer content={shellContent} prefersReducedMotion={prefersReducedMotion} />
    </div>
  )
}

function BlogIndexPage({
  content,
  posts,
  pages,
  loading,
  loadError,
}: {
  content: SiteContent
  posts: PostArchiveItem[]
  pages: PageArchiveItem[]
  loading: boolean
  loadError: string | null
}) {
  return (
    <section className="mx-auto max-w-[1312px]">
      <div className="max-w-[860px]">
        <p className="section-eyebrow">JOURNAL</p>
        <h1 className="section-title mt-1.5 md:text-[52px]">News, updates, and pages from the CMS.</h1>
        <p className="mt-4 max-w-[640px] text-[var(--muted)]">
          This route is now powered by WordPress content and uses the same headless API layer as the homepage.
        </p>
      </div>

      {loading ? <LoadingState /> : null}
      {loadError ? <ErrorState message={loadError} /> : null}

      {!loading && !loadError ? (
        <>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {posts.map((post) => (
              <article key={post.slug} className="rounded-[28px] bg-[var(--card)] p-6 shadow-[0_14px_28px_rgba(31,31,31,0.06)]">
                {post.featuredImage ? (
                  <div className="mb-5 overflow-hidden rounded-[20px]">
                    <CmsImage
                      src={post.featuredImage}
                      alt={post.featuredImageAlt || post.title}
                      className="h-56 w-full object-cover"
                      sizes="(min-width: 768px) 50vw, 100vw"
                    />
                  </div>
                ) : null}
                <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brick)]">
                  {formatDate(post.publishedAt)}
                </div>
                <h2 className="mt-2 text-[28px] font-semibold leading-[1.1] text-[var(--ink)]">
                  <a href={withBase(`/blog/${post.slug}`)}>{post.title}</a>
                </h2>
                <p className="mt-3 text-[15px] leading-[1.7] text-[var(--muted)]">{post.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.categories.map((category) => (
                    <span key={category.slug} className="rounded-full bg-[var(--cream-soft)] px-3 py-1 text-xs font-semibold text-[var(--brick)]">
                      {category.name}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {pages.length ? (
            <div className="mt-14">
              <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--brick)]">Standalone pages</div>
              <div className="mt-4 flex flex-wrap gap-3">
                {pages.map((page) => (
                  <a key={page.slug} href={`/${page.slug}`} className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] shadow-sm">
                    {page.title}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {!posts.length && !pages.length ? <EmptyState body={`WordPress is connected, but there is no article or page content published yet for ${content.siteName}.`} /> : null}
        </>
      ) : null}
    </section>
  )
}

function EntryPage({
  content,
  entry,
  loading,
  loadError,
}: {
  content: SiteContent
  entry: PostEntry | PageEntry | null
  loading: boolean
  loadError: string | null
}) {
  if (loading) {
    return <LoadingState />
  }

  if (loadError) {
    return <ErrorState message={loadError} />
  }

  if (!entry) {
    return <EmptyState body={`No CMS entry was found for this route on ${content.siteName}.`} />
  }

  return (
    <article className="mx-auto max-w-[960px]">
      <div className="rounded-[32px] bg-[var(--card)] p-6 shadow-[0_14px_28px_rgba(31,31,31,0.06)] md:p-10">
        <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--brick)]">
          {entry.type === 'post' ? formatDate(entry.publishedAt) : 'Page'}
        </div>
        <h1 className="mt-3 text-[38px] font-semibold leading-[1.05] text-[var(--ink)] md:text-[56px]">{entry.title}</h1>
        {'excerpt' in entry && entry.excerpt ? <p className="mt-4 text-lg leading-[1.7] text-[var(--muted)]">{entry.excerpt}</p> : null}

        {entry.featuredImage ? (
          <div className="mt-8 overflow-hidden rounded-[28px]">
            <CmsImage
              src={entry.featuredImage}
              alt={entry.featuredImageAlt || entry.title}
              className="max-h-[520px] w-full object-cover"
              sizes="100vw"
              priority
            />
          </div>
        ) : null}

        <div className="prose prose-stone mt-8 max-w-none prose-headings:font-semibold prose-a:text-[var(--red)]" dangerouslySetInnerHTML={{ __html: entry.content }} />

        {'related' in entry && entry.related.length ? (
          <div className="mt-10 border-t border-[rgba(31,31,31,0.08)] pt-8">
            <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--brick)]">Related posts</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {entry.related.map((item) => (
                <a key={item.slug} href={withBase(`/blog/${item.slug}`)} className="rounded-[22px] bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-[var(--brick)]">{formatDate(item.publishedAt)}</div>
                  <div className="mt-2 text-xl font-semibold text-[var(--ink)]">{item.title}</div>
                  <p className="mt-2 text-[15px] leading-[1.6] text-[var(--muted)]">{item.excerpt}</p>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button cta={content.hero.primaryCta} />
          <Button cta={content.hero.secondaryCta} forceVariant="secondary" />
        </div>
      </div>
    </article>
  )
}

function LoadingState() {
  return <div className="mt-10 rounded-[24px] bg-white p-6 text-[var(--muted)] shadow-sm">Loading CMS content...</div>
}

function ErrorState({ message }: { message: string }) {
  return <div className="mt-10 rounded-[24px] bg-white p-6 text-[var(--red)] shadow-sm">{message}</div>
}

function EmptyState({ body }: { body: string }) {
  return <div className="mt-10 rounded-[24px] bg-white p-6 text-[var(--muted)] shadow-sm">{body}</div>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default App
