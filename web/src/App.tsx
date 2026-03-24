import { startTransition, useEffect, useState } from 'react'
import { Footer } from './components/site/Footer'
import { SiteHeader } from './components/site/SiteHeader'
import { Button } from './components/ui/Button'
import { CmsImage } from './components/ui/CmsImage'
import { usePrefersReducedMotion } from './lib/accessibility'
import { withBase } from './lib/base-path'
import { useCurrentRoute } from './lib/hooks'
import { useSeo } from './lib/seo'
import {
  getGeneratedBootstrap,
  getInitialBootstrap,
  getPageBySlug,
  getPostBySlug,
  getPosts,
  getSiteBootstrap,
  hasWordPressBase,
  isAbortError,
} from './lib/wordpress'
import { BlogIndexPage } from './pages/BlogIndexPage'
import { BlogPostPage } from './pages/BlogPostPage'
import { HomePage } from './pages/HomePage'
import type {
  PageEntry,
  PostArchiveResponse,
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

function buildBlogArchiveSeo(content: SiteContent, archive: PostArchiveResponse | null, seo: SiteBootstrap['seo']) {
  if (archive?.archive?.seo) {
    return archive.archive.seo
  }

  return buildBlogRouteSeo(content, seo)
}

function App() {
  const liveCmsEnabled = hasWordPressBase()
  const [bootstrap, setBootstrap] = useState<SiteBootstrap>(() => (liveCmsEnabled ? getInitialBootstrap() : getGeneratedBootstrap()))
  const [postArchive, setPostArchive] = useState<PostArchiveResponse | null>(null)
  const [entry, setEntry] = useState<PostEntry | PageEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()
  const route = useCurrentRoute()
  const currentBootstrap = bootstrap
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
        startTransition(() => {
          setBootstrap(nextBootstrap)
        })
      } catch (error) {
        if (isAbortError(error)) {
          return
        }

        if (!controller.signal.aborted) {
          console.warn('Unable to refresh homepage CMS content.', error)
        }
      }
    }

    void refreshBootstrap()

    const intervalId = window.setInterval(() => {
      void refreshBootstrap()
    }, 15000)

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
      setPostArchive(null)
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
          const nextArchive = await getPosts(undefined, controller.signal)
          setPostArchive(nextArchive)
          setEntry(null)
          return
        }

        setPostArchive(null)
        setEntry(null)

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
        if (isAbortError(error) || controller.signal.aborted) {
          return
        }

        setLoadError(error instanceof Error ? error.message : 'Unable to load CMS content.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadRouteData()

    return () => controller.abort()
  }, [route])

  const routeSeo =
    route.kind === 'post' || route.kind === 'page'
      ? entry?.seo ?? currentBootstrap.seo
      : route.kind === 'blog'
        ? buildBlogArchiveSeo(content, postArchive, currentBootstrap.seo)
        : currentBootstrap.seo

  useSeo({
    ...currentBootstrap,
    seo: routeSeo,
  })

  if (route.kind === 'home') {
    return <HomePage bootstrap={bootstrap} isScrolled={isScrolled} prefersReducedMotion={prefersReducedMotion} />
  }

  return (
    <div id="top" className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <SiteHeader content={shellContent} isScrolled={isScrolled} prefersReducedMotion={prefersReducedMotion} />
      <main className="px-8 pb-20 pt-28 md:px-16 md:pt-36">
        {route.kind === 'blog' ? (
          <BlogIndexPage content={shellContent} archive={postArchive} loading={loading} loadError={loadError} />
        ) : route.kind === 'post' ? (
          <BlogPostPage content={shellContent} entry={entry as PostEntry | null} loading={loading} loadError={loadError} />
        ) : (
          <EntryPage content={shellContent} entry={entry} loading={loading} loadError={loadError} />
        )}
      </main>
      <Footer content={shellContent} prefersReducedMotion={prefersReducedMotion} />
    </div>
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
              className="h-[280px] w-full object-cover md:h-[520px]"
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
