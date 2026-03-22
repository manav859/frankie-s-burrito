import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  getGeneratedBootstrap,
  getPageBySlug,
  getPages,
  getPostBySlug,
  getPosts,
  getSiteBootstrap,
  hasWordPressBase,
} from './lib/wordpress'
import { useCurrentRoute } from './lib/hooks'
import { useSeo } from './lib/seo'
import {
  useFloatingAccent,
  useMagnetic,
  useTilt3D,
} from './lib/animations'
import { withBase } from './lib/base-path'
import type {
  Cta,
  FeaturedItem,
  InfoCard,
  PageArchiveItem,
  PageEntry,
  PostArchiveItem,
  PostEntry,
  SiteBootstrap,
  SiteContent,
} from './types'

const CowboyRider = () => (
  <svg viewBox="0 0 100 100" className="h-[90px] w-[90px] fill-[var(--ink)]">
    {/* Abstract Geometric Cowboy on Horse */}
    <ellipse cx="50" cy="65" rx="22" ry="14" />
    <path d="M 68 60 Q 85 45 85 40 L 78 40 Q 73 55 60 60 Z" />
    <path d="M 35 65 Q 20 70 15 90 L 22 90 Q 28 80 32 75 Z" />
    <path d="M 60 70 Q 65 85 60 95 L 67 95 Q 73 80 65 72 Z" />
    <rect x="42" y="32" width="12" height="22" rx="3" />
    <circle cx="48" cy="25" r="6" />
    <ellipse cx="48" cy="22" rx="14" ry="3" />
    <path d="M 42 22 Q 48 8 54 22 Z" />
    <path d="M 52 42 Q 68 55 65 65 L 58 60 Q 60 50 45 42 Z" />
    <path d="M 30 60 Q 12 50 5 75 Q 15 65 28 66 Z" />
  </svg>
)

const CactusSVG = () => (
  <svg viewBox="0 0 100 100" className="h-[100px] w-[100px] fill-[#4a5d23]">
    <rect x="40" y="20" width="20" height="70" rx="10" />
    <path d="M 45 55 Q 15 55 15 30 L 25 30 Q 25 45 40 45 Z" />
    <path d="M 55 65 Q 85 65 85 40 L 75 40 Q 75 55 60 55 Z" />
    <circle cx="15" cy="30" r="5px" />
    <circle cx="85" cy="40" r="5px" />
  </svg>
)

const CrossedGuns = () => (
  <svg viewBox="0 0 100 100" className="h-[80px] w-[80px] fill-[var(--ink)]" style={{ opacity: 0.15 }}>
    <g transform="translate(50, 50) rotate(45) translate(-50, -50)">
      <rect x="15" y="46" width="45" height="8" rx="2" />
      <rect x="60" y="42" width="16" height="16" rx="3" />
      <path d="M 72 45 L 85 70 A 5 5 0 0 1 78 75 L 65 55 Z" />
      <circle cx="20" cy="50" r="2" fill="white" />
    </g>
    <g transform="translate(50, 50) rotate(-45) translate(-50, -50)">
      <rect x="15" y="46" width="45" height="8" rx="2" />
      <rect x="60" y="42" width="16" height="16" rx="3" />
      <path d="M 72 45 L 85 70 A 5 5 0 0 1 78 75 L 65 55 Z" />
      <circle cx="20" cy="50" r="2" fill="white" />
    </g>
  </svg>
)

const SheriffBadge = () => (
  <svg viewBox="0 0 100 100" className="h-[90px] w-[90px] fill-[var(--gold)]">
    <path d="M50 5 L62 35 L95 35 L68 55 L78 85 L50 65 L22 85 L32 55 L5 35 L38 35 Z" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
    <circle cx="50" cy="50" r="16" fill="none" stroke="var(--ink)" strokeWidth="3" />
    <circle cx="50" cy="50" r="9" fill="var(--ink)" />
    <circle cx="50" cy="15" r="3" fill="var(--ink)"/>
    <circle cx="82" cy="38" r="3" fill="var(--ink)"/>
    <circle cx="70" cy="74" r="3" fill="var(--ink)"/>
    <circle cx="30" cy="74" r="3" fill="var(--ink)"/>
    <circle cx="18" cy="38" r="3" fill="var(--ink)"/>
  </svg>
)

const Horseshoe = () => (
  <svg viewBox="0 0 100 100" className="h-[80px] w-[80px] fill-none stroke-[var(--ink)] stroke-linecap-round">
    <path d="M 30 80 L 30 40 A 20 20 0 0 1 70 40 L 70 80" strokeWidth="12" />
    <path d="M 22 80 L 38 80" strokeWidth="10"/>
    <path d="M 62 80 L 78 80" strokeWidth="10"/>
    <circle cx="20" cy="50" r="4" fill="var(--ink)" stroke="none"/>
    <circle cx="25" cy="35" r="4" fill="var(--ink)" stroke="none"/>
    <circle cx="80" cy="50" r="4" fill="var(--ink)" stroke="none"/>
    <circle cx="75" cy="35" r="4" fill="var(--ink)" stroke="none"/>
  </svg>
)

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

function CmsImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
}: {
  src?: string
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
}) {
  if (!src) {
    return null
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      sizes={sizes}
    />
  )
}

function BrandMark({
  content,
  className = '',
  light = false,
}: {
  content: SiteContent
  className?: string
  light?: boolean
}) {
  if (content.siteLogo) {
    return (
      <img
        src={content.siteLogo}
        alt={content.siteLogoAlt || content.siteName}
        className={className}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    )
  }

  return (
    <div className={className}>
      <div className={['text-lg font-bold leading-none tracking-[-0.03em]', light ? 'text-white' : 'text-[var(--ink)]'].join(' ')}>
        {content.siteName}
      </div>
      <div className={['mt-1 text-[13px]', light ? 'text-[var(--cream)]' : 'text-[var(--muted)]'].join(' ')}>
        {content.siteTagline}
      </div>
    </div>
  )
}

function App() {
  const [bootstrap, setBootstrap] = useState<SiteBootstrap>(getGeneratedBootstrap())
  const [posts, setPosts] = useState<PostArchiveItem[]>([])
  const [pages, setPages] = useState<PageArchiveItem[]>([])
  const [entry, setEntry] = useState<PostEntry | PageEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()
  const route = useCurrentRoute()
  const content: SiteContent = bootstrap.content
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
    let activeController: AbortController | null = null

    const refreshBootstrap = async () => {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller

      try {
        const nextBootstrap = await getSiteBootstrap(controller.signal)
        setBootstrap(nextBootstrap)
      } catch {
        // Keep the last successful bootstrap when live refresh fails.
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
  }, [])

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
          return
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
      ? entry?.seo ?? bootstrap.seo
      : route.kind === 'blog'
        ? buildBlogRouteSeo(content, bootstrap.seo)
        : bootstrap.seo

  useSeo({
    ...bootstrap,
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
          <BlogIndexPage content={shellContent} posts={posts} pages={pages} loading={loading} loadError={loadError} />
        ) : (
          <EntryPage content={shellContent} entry={entry} loading={loading} loadError={loadError} />
        )}
      </main>
      <Footer content={shellContent} prefersReducedMotion={prefersReducedMotion} />
    </div>
  )
}

function HomePage({
  bootstrap,
  isScrolled,
  prefersReducedMotion,
}: {
  bootstrap: SiteBootstrap
  isScrolled: boolean
  prefersReducedMotion: boolean
}) {
  const content = bootstrap.content

  return (
    <div id="top" className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <DesktopHero content={content} isScrolled={isScrolled} prefersReducedMotion={prefersReducedMotion} />
      <MobileHero content={content} isScrolled={isScrolled} prefersReducedMotion={prefersReducedMotion} />
      <main>
        {content.featuredItems.length ? <FeaturedSection content={content} prefersReducedMotion={prefersReducedMotion} /> : null}
        <ReasonsSection content={content} prefersReducedMotion={prefersReducedMotion} />
        <MenuSection content={content} prefersReducedMotion={prefersReducedMotion} />
        <AboutSection content={content} prefersReducedMotion={prefersReducedMotion} />
        <ProofSection content={content} prefersReducedMotion={prefersReducedMotion} />
        <LocationSection content={content} prefersReducedMotion={prefersReducedMotion} />
        <FinalCtaSection content={content} prefersReducedMotion={prefersReducedMotion} />
      </main>
      <Footer content={content} prefersReducedMotion={prefersReducedMotion} />
      <MobileStickyCta cta={content.finalCta.primaryCta} />
    </div>
  )
}

function SiteHeader({
  content,
  isScrolled,
  prefersReducedMotion,
}: {
  content: SiteContent
  isScrolled: boolean
  prefersReducedMotion: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          isScrolled ? 'bg-white shadow-[0_10px_30px_rgba(31,31,31,0.10)]' : 'bg-[rgba(255,255,255,0.92)] backdrop-blur',
        ].join(' ')}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-8 py-4 md:px-16">
          <a href="/" className="block">
            <BrandMark content={content} className="max-h-14 w-auto object-contain" />
          </a>

          <nav className="hidden items-center gap-6 text-[15px] font-medium text-[var(--ink)] md:flex">
            {content.navigation.map((item) => (
              <a key={item.label} href={item.href} className="nav-link transition hover:text-[var(--gold)]">
                {item.label}
              </a>
            ))}
            <a href="/blog" className="nav-link transition hover:text-[var(--gold)]">
              Journal
            </a>
            <Button cta={content.hero.primaryCta} />
          </nav>

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-[14px] md:hidden"
          >
            <span className="h-0.5 w-5 rounded-full bg-[var(--ink)]" />
            <span className="h-0.5 w-5 rounded-full bg-[var(--ink)]" />
            <span className="h-0.5 w-5 rounded-full bg-[var(--ink)]" />
          </button>
        </div>
      </header>

      <MobileMenu content={{ ...content, navigation: [...content.navigation, { label: 'Journal', href: '/blog' }] }} open={menuOpen} onClose={() => setMenuOpen(false)} prefersReducedMotion={prefersReducedMotion} />
    </>
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
      <div className="rounded-[32px] bg-[var(--card)] p-6 md:p-10 shadow-[0_14px_28px_rgba(31,31,31,0.06)]">
        <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--brick)]">
          {entry.type === 'post' ? formatDate(entry.publishedAt) : 'Page'}
        </div>
        <h1 className="mt-3 text-[38px] font-semibold leading-[1.05] text-[var(--ink)] md:text-[56px]">{entry.title}</h1>
        {'excerpt' in entry && entry.excerpt ? <p className="mt-4 text-lg leading-[1.7] text-[var(--muted)]">{entry.excerpt}</p> : null}
        {entry.featuredImage ? (
          <div className="mt-8 overflow-hidden rounded-[24px]">
            <CmsImage
              src={entry.featuredImage}
              alt={entry.featuredImageAlt || entry.title}
              className="h-[320px] w-full object-cover md:h-[460px]"
              sizes="(min-width: 1024px) 960px, 100vw"
              priority
            />
          </div>
        ) : null}
        <div className="prose prose-neutral mt-8 max-w-none text-[var(--ink)]" dangerouslySetInnerHTML={{ __html: entry.content }} />

        {entry.type === 'post' && entry.related.length ? (
          <div className="mt-12 border-t border-[rgba(27,19,13,0.08)] pt-8">
            <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--brick)]">Related reading</div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {entry.related.map((item) => (
                <a key={item.slug} href={withBase(`/blog/${item.slug}`)} className="rounded-[20px] bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[var(--ink)]">{item.title}</div>
                  <p className="mt-2 text-sm leading-[1.6] text-[var(--muted)]">{item.excerpt}</p>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function LoadingState() {
  return <div className="mt-10 rounded-[24px] bg-white p-6 text-[var(--muted)] shadow-sm">Loading CMS content…</div>
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

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reducedMotion
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || visible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  return { ref, visible }
}

function Reveal({
  children,
  className = '',
  delay = 0,
  visible = true,
  reducedMotion = false,
  direction = 'up',
}: {
  children: ReactNode
  className?: string
  delay?: number
  visible?: boolean
  reducedMotion?: boolean
  direction?: 'up' | 'left' | 'right' | 'scale'
}) {
  const dirClass = direction !== 'up' ? `reveal-${direction}` : ''
  return (
    <div
      className={[
        'motion-reveal',
        dirClass,
        visible || reducedMotion ? 'is-visible' : '',
        reducedMotion ? 'motion-reduce-safe' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ transitionDelay: reducedMotion ? '0ms' : `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function DesktopHero({
  content,
  isScrolled,
  prefersReducedMotion,
}: {
  content: SiteContent
  isScrolled: boolean
  prefersReducedMotion: boolean
}) {
  const heroReveal = useReveal<HTMLDivElement>()
  const floatRef1 = useFloatingAccent(10, 5000, 0)
  const floatRef2 = useFloatingAccent(7, 4200, 1400)
  const floatRef3 = useFloatingAccent(9, 4800, 2800)

  return (
    <section
      className="relative hidden min-h-[100dvh] flex-col overflow-hidden bg-cover bg-center bg-no-repeat md:flex"
      style={{
        backgroundImage: `linear-gradient(rgba(27, 19, 13, 0.18), rgba(27, 19, 13, 0.18)), url(${content.hero.backgroundImage})`,
      }}
    >
      {/* Floating decorative accents */}
      {!prefersReducedMotion && (
        <>
          <div ref={floatRef1 as React.RefObject<HTMLDivElement>} className="floating-accent left-[8%] top-[22%] text-5xl">🌶️</div>
          <div ref={floatRef2 as React.RefObject<HTMLDivElement>} className="floating-accent right-[12%] top-[35%] text-4xl">🍋</div>
          <div ref={floatRef3 as React.RefObject<HTMLDivElement>} className="floating-accent left-[15%] bottom-[18%] text-3xl">⭐</div>
          
          {/* Animated Cowboy on Horse */}
          <div className="cowboy-wrapper">
            <div className="cowboy-inner">
              <CowboyRider />
            </div>
          </div>
        </>
      )}

      <header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          isScrolled ? 'bg-white shadow-[0_10px_30px_rgba(31,31,31,0.10)]' : 'bg-transparent',
        ].join(' ')}
      >
        <div
          className={[
            'mx-auto flex w-full max-w-[1440px] items-center justify-between px-16 transition-all duration-500',
            isScrolled ? 'py-3' : 'py-5',
          ].join(' ')}
        >
          <BrandMark
            content={content}
            className={['max-h-16 w-auto object-contain transition-opacity duration-300', isScrolled ? 'opacity-100' : 'opacity-100'].join(' ')}
            light={!isScrolled}
          />
          <nav
            className={[
              'flex items-center gap-6 text-[15px] font-medium transition-colors duration-300',
              isScrolled ? 'text-[var(--ink)]' : 'text-white',
            ].join(' ')}
          >
            {content.navigation.map((item) => (
              <a key={item.label} href={item.href} className="nav-link transition hover:text-[var(--gold)]">
                {item.label}
              </a>
            ))}
            <Button cta={content.hero.primaryCta} attention={!isScrolled} />
          </nav>
        </div>
      </header>

      <div ref={heroReveal.ref} className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 items-center justify-center px-16 pb-14 pt-6">
        <div className="w-full max-w-[1100px] rounded-[28px] px-6 py-6 text-center">
          {/* Masked headline reveal */}
          <div className={['mask-reveal', heroReveal.visible || prefersReducedMotion ? 'is-visible' : ''].join(' ')}>
            <h1 className="mask-reveal-inner whitespace-pre-line font-western text-[56px] leading-[1.05] tracking-normal text-[var(--cream)] md:text-[76px] md:leading-[1.1]">
              {content.hero.title}
            </h1>
          </div>
          <Reveal reducedMotion={prefersReducedMotion} visible={heroReveal.visible} delay={300}>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button cta={content.hero.primaryCta} attention />
              <Button cta={content.hero.secondaryCta} />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function MobileHero({
  content,
  isScrolled,
  prefersReducedMotion,
}: {
  content: SiteContent
  isScrolled: boolean
  prefersReducedMotion: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <section
      className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-cover bg-center bg-no-repeat md:hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(27, 19, 13, 0.2), rgba(27, 19, 13, 0.28)), url(${content.hero.mobileImage})`,
      }}
    >
      <header
        className={[
          'fixed inset-x-0 top-0 z-50 flex items-start justify-between px-8 py-[18px] transition-all duration-300',
          isScrolled ? 'bg-white shadow-[0_10px_30px_rgba(31,21,11,0.1)]' : 'bg-transparent',
        ].join(' ')}
      >
        <BrandMark content={content} className="max-h-14 w-auto object-contain" light={!isScrolled} />
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-[14px] transition hover:bg-white/10"
        >
          <span className={['h-0.5 w-5 rounded-full transition-colors duration-300', isScrolled ? 'bg-[var(--ink)]' : 'bg-white'].join(' ')} />
          <span className={['h-0.5 w-5 rounded-full transition-colors duration-300', isScrolled ? 'bg-[var(--ink)]' : 'bg-white'].join(' ')} />
          <span className={['h-0.5 w-5 rounded-full transition-colors duration-300', isScrolled ? 'bg-[var(--ink)]' : 'bg-white'].join(' ')} />
        </button>
      </header>

      <MobileMenu
        content={content}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        prefersReducedMotion={prefersReducedMotion}
      />

      <div className="px-8 pt-8 text-center w-full">
        <Reveal reducedMotion={prefersReducedMotion} delay={40}>
          <h1 className="mx-auto w-full max-w-[460px] whitespace-pre-line font-western text-[clamp(28px,9.5vw,44px)] leading-[1.05] tracking-normal text-[var(--cream)] md:text-[44px]">
            {content.hero.title}
          </h1>
        </Reveal>
        <Reveal reducedMotion={prefersReducedMotion} delay={180}>
          <div className="mx-auto mt-9 flex w-[300px] flex-col gap-3">
            <Button cta={content.hero.primaryCta} fullWidth attention />
            <Button cta={content.hero.secondaryCta} fullWidth />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function MobileMenu({
  content,
  open,
  onClose,
  prefersReducedMotion,
}: {
  content: SiteContent
  open: boolean
  onClose: () => void
  prefersReducedMotion: boolean
}) {
  return (
    <div
      className={[
        'pointer-events-none absolute inset-0 z-50 bg-[rgba(31,25,21,0.35)] transition-opacity duration-300',
        open ? 'pointer-events-auto opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      <div
        className={[
          'ml-auto flex h-full w-[85%] max-w-[320px] flex-col bg-[var(--paper)] px-6 py-6 shadow-[-24px_0_40px_rgba(0,0,0,0.18)] transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
          prefersReducedMotion ? 'duration-0' : '',
        ].join(' ')}
      >
        <div className="flex items-center justify-between">
          <BrandMark content={content} className="max-h-12 w-auto object-contain" />
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--brick)] transition-transform hover:rotate-90">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {content.navigation.map((item, index) => (
            <a
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={[
                'rounded-2xl bg-white px-4 py-4 text-lg font-medium text-[var(--ink)] transition-all duration-300',
                open ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0',
              ].join(' ')}
              style={{ transitionDelay: prefersReducedMotion ? '0ms' : `${index * 45}ms` }}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <Button cta={content.hero.primaryCta} fullWidth attention />
        </div>
      </div>
    </div>
  )
}

function FeaturedSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <section id="featured" className="section-divider deferred-section bg-[var(--paper)] px-8 py-14 md:px-16 md:py-24">
      <div ref={reveal.ref} className="mx-auto max-w-[1312px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left" className="max-w-[760px]">
            <p className="section-eyebrow">{content.featuredIntro.eyebrow}</p>
            <h2 className="section-title mt-1.5 md:text-[46px]">{content.featuredIntro.title}</h2>
          </Reveal>
          <Reveal
            visible={reveal.visible}
            reducedMotion={prefersReducedMotion}
            delay={160}
            direction="right"
            className="hidden md:block"
          >
            <Button cta={content.featuredIntro.cta} />
          </Reveal>
        </div>
        <div className="mt-5 grid gap-4 md:mt-8 md:grid-cols-3 md:gap-6">
          {content.featuredItems.map((item, index) => (
            <Reveal
              key={item.name}
              visible={reveal.visible}
              reducedMotion={prefersReducedMotion}
              delay={160 + index * 100}
              direction="scale"
            >
              <FeaturedCard item={item} menu={content.menu} prefersReducedMotion={prefersReducedMotion} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedCard({
  item,
  menu,
  prefersReducedMotion,
}: {
  item: FeaturedItem
  menu: SiteContent['menu']
  prefersReducedMotion: boolean
}) {
  const tiltRef = useTilt3D(5, 10)

  return (
    <article
      ref={prefersReducedMotion ? undefined : tiltRef as React.RefObject<HTMLElement>}
      className={[
        'interactive-card group rounded-[24px] border p-[18px] pb-5',
        item.dark
          ? 'border-transparent bg-[var(--cocoa)] text-[var(--cream)]'
          : 'border-[var(--stroke)] bg-[var(--card)] text-[var(--ink)]',
      ].join(' ')}
    >
      <div className="overflow-hidden rounded-[20px]">
        <CmsImage
          src={item.image}
          alt={item.imageAlt || item.name}
          className="image-zoom h-60 w-full rounded-[20px] object-cover"
          sizes="(min-width: 768px) 33vw, 100vw"
        />
      </div>
      <h3 className="mt-[18px] text-[22px] font-semibold leading-[1.1] md:text-[26px]">{item.name}</h3>
      <p className={['mt-1.5 text-[15px] leading-[1.55]', item.dark ? 'text-[var(--cream-dim)]' : 'text-[var(--muted)]'].join(' ')}>
        {item.description}
      </p>
      <div className={['mt-2.5 text-[18px] font-semibold md:text-[22px]', item.dark ? 'text-[var(--gold)]' : 'text-[var(--red)]'].join(' ')}>
        {item.price}
      </div>
      <a
        href={item.orderUrl || '#location'}
        className="mt-2.5 flex items-center justify-between rounded-[18px] bg-[var(--cream-soft)] px-[18px] py-4 text-[15px] font-semibold text-[var(--red)] transition duration-300 group-hover:bg-white"
      >
        <span>{menu.itemCtaLabel || 'Order this burrito'}</span>
        <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1">
          +
        </span>
      </a>
    </article>
  )
}

function ReasonsSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <section 
      className="section-divider deferred-section relative overflow-hidden px-8 py-20 md:px-16 md:py-32"
      style={{ backgroundColor: 'var(--leather)' }}
    >
      <div className="absolute top-10 left-10 md:left-24 -rotate-12 opacity-40 pointer-events-none stroke-white">
        <Horseshoe />
      </div>
      <div ref={reveal.ref} className="mx-auto max-w-[1312px] relative z-10">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left" className="max-w-[760px]">
          <p className="section-eyebrow !text-[var(--gold)]">{content.reasons.eyebrow}</p>
          <h2 className="section-title mt-1.5 !text-white md:text-[44px]">{content.reasons.title}</h2>
          <p className="mt-2.5 hidden max-w-[640px] text-base leading-[1.6] text-[var(--cream-dim)] md:block md:text-lg">{content.reasons.body}</p>
        </Reveal>
        <div className="mt-5 grid gap-4 md:mt-8 md:grid-cols-4 md:gap-5">
          {content.reasons.items.map((item, index) => (
            <Reveal
              key={item.title}
              visible={reveal.visible}
              reducedMotion={prefersReducedMotion}
              delay={100 + index * 80}
              direction="scale"
            >
              <InfoCardView item={item} prefersReducedMotion={prefersReducedMotion} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function MenuSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <section id="menu" className="deferred-section relative overflow-hidden border-t border-[rgba(27,19,13,0.06)] bg-[var(--sand)] px-8 py-14 md:px-16 md:py-24">
      <div className="absolute top-10 right-10 md:right-32 rotate-12 pointer-events-none">
        <CrossedGuns />
      </div>
      <div ref={reveal.ref} className="mx-auto grid max-w-[1312px] gap-[18px] md:grid-cols-[360px_minmax(0,1fr)] md:gap-7 relative z-10">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion}>
          <div className="rounded-[22px] bg-[var(--cream-soft)] p-[18px] md:rounded-[28px] md:px-6 md:py-7">
            <p className="section-eyebrow">{content.menu.eyebrow}</p>
            <h2 className="section-title mt-1.5 text-[28px] md:text-[38px]">{content.menu.title}</h2>
            <p className="mt-2.5 hidden text-[15px] leading-[1.6] text-[var(--muted)] md:block md:text-[17px]">{content.menu.body}</p>
            <p className="mt-2.5 text-[14px] font-medium text-[var(--brick)]">{content.menu.note}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="icon-float grid h-[42px] w-[42px] place-items-center rounded-full bg-[var(--gold)] text-lg">*</div>
              <div className="icon-float-delayed grid h-[54px] w-9 place-items-end text-3xl text-[var(--sage)]">I</div>
            </div>
          </div>
        </Reveal>

        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={100}>
          <div className="rounded-[24px] bg-[var(--card)] p-[18px] md:rounded-[30px] md:p-[30px]">
            <div>
              <BrandMark content={content} className="max-h-14 w-auto object-contain" />
              <div className="mt-1 text-[13px] font-medium text-[var(--brick)]">
                {content.location.city ? `${content.location.city} menu board` : 'Menu board'}
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] bg-white shadow-[0_14px_28px_rgba(31,31,31,0.06)]">
              {content.menu.image ? (
                <CmsImage
                  src={content.menu.image}
                  alt={content.menu.imageAlt || `${content.siteName} menu`}
                  className="w-full object-cover"
                  sizes="(min-width: 768px) 60vw, 100vw"
                />
              ) : (
                <div className="px-6 py-10 text-center text-[15px] text-[var(--muted)]">
                  Add a menu image URL in WordPress to display the menu here.
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-[18px] bg-[var(--cream-soft)] px-4 py-[14px] md:flex-row md:items-center md:justify-between md:px-[22px] md:py-[18px]">
              <p className="max-w-[380px] text-[14px] font-medium text-[var(--ink)]">{content.menu.footerNote}</p>
              <Button cta={content.menu.footerCta} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function AboutSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <section id="about" className="section-divider deferred-section bg-[var(--blush)] px-8 py-14 md:px-16 md:py-24">
      <div ref={reveal.ref} className="mx-auto grid max-w-[1312px] gap-12 md:grid-cols-[1fr_1.4fr] md:items-start">
        {/* Column 1: Headings & Description (Side) */}
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left" className="text-left">
          <p className="section-eyebrow">{content.about.eyebrow}</p>
          <h2 className="section-title mt-1.5 md:text-[38px] lg:text-[44px]">{content.about.title}</h2>
          {content.about.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 hidden max-w-[480px] text-base leading-[1.65] text-[var(--muted)] md:block">
              {paragraph}
            </p>
          ))}
        </Reveal>

        {/* Column 2: Middle Stack (Facts above Image) */}
        <div className="flex flex-col items-center">
          {/* Facts (Above Image, Centered) */}
          <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={180} direction="scale" className="w-full">
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {content.about.facts.map((fact) => (
                <div key={fact.label} className="interactive-card leather-stitch min-w-[170px] flex-1 rounded-[20px] bg-[var(--card)] p-5 text-center shadow-sm md:max-w-[220px]">
                  <div className="text-base font-semibold text-[var(--ink)]">{fact.value}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{fact.label}</div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Image (Below Facts, Centered) */}
          <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={300} direction="up" className="w-full">
            <div className="overflow-hidden rounded-[28px] shadow-xl">
              <CmsImage
                src={content.about.image}
                alt={content.about.title}
                className="image-zoom min-h-[320px] w-full object-cover md:min-h-[500px]"
                sizes="(min-width: 768px) 60vw, 100vw"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function ProofSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()
  const backgroundImage = content.proof.backgroundImage

  return (
    <section 
      className="section-divider deferred-section relative bg-cover bg-center px-8 py-20 overflow-hidden md:bg-fixed md:px-16 md:py-32"
      style={{
        backgroundImage: backgroundImage
          ? `linear-gradient(rgba(244,234,225,0.85), rgba(244,234,225,0.92)), url('${backgroundImage}')`
          : 'linear-gradient(rgba(244,234,225,0.96), rgba(244,234,225,0.96))',
      }}
    >
      <div className="absolute top-10 right-10 md:right-32 rotate-12 opacity-60 pointer-events-none">
        <SheriffBadge />
      </div>
      <div ref={reveal.ref} className="mx-auto max-w-[1312px] relative z-10">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left" className="max-w-[760px]">
          <p className="section-eyebrow">{content.proof.eyebrow}</p>
          <h2 className="section-title mt-1.5 md:text-[44px]">{content.proof.title}</h2>
          <p className="mt-2.5 hidden max-w-[680px] text-base leading-[1.6] text-[var(--ink)] font-medium md:block md:text-lg">{content.proof.body}</p>
        </Reveal>
        <div className="mt-5 grid gap-4 md:mt-8 md:grid-cols-3 md:gap-5">
          {content.proof.items.map((item, index) => (
            <Reveal key={item.title} visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={100 + index * 90} direction="scale">
              <InfoCardView item={item} prefersReducedMotion={prefersReducedMotion} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function LocationSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <section id="location" className="section-divider deferred-section relative overflow-hidden bg-[var(--tan)] px-8 py-14 md:px-16 md:py-24">
      {!prefersReducedMotion && (
        <div className="cactus-idle">
          <CactusSVG />
        </div>
      )}
      <div ref={reveal.ref} className="mx-auto max-w-[900px] flex flex-col items-center text-center">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="up" className="w-full">
          <p className="section-eyebrow">{content.location.eyebrow}</p>
          <h2 className="section-title mt-1.5 text-[30px] md:text-[48px]">{content.location.title}</h2>
          <div className="mt-8 flex flex-col items-center gap-4 text-[16px] md:text-[20px]">
            <p className="text-2xl font-bold text-[var(--ink)]">{content.location.name}</p>
            <div className="flex flex-col gap-2 text-[var(--muted)] md:flex-row md:gap-6">
              <p>{content.location.address}</p>
              <p>{content.location.hours}</p>
            </div>
            <p className="max-w-[560px] text-[var(--muted)]">{content.location.ordering}</p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button cta={content.location.primaryCta} attention />
            <Button cta={content.location.secondaryCta} />
          </div>
        </Reveal>

        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={200} direction="up" className="mt-12 w-full">
          <div className="interactive-card overflow-hidden rounded-[32px] bg-white p-6 md:p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-[var(--ink)]">{content.location.mapTitle}</h3>
            <p className="mx-auto mt-2 max-w-[420px] text-base text-[var(--muted)]">{content.location.mapBody}</p>
            <div className="mt-6 overflow-hidden rounded-[24px] bg-[var(--cream-soft)] border-4 border-[var(--tan-dark)]">
              <iframe
                title={`${content.siteName} map`}
                src={content.location.mapEmbedUrl}
                className="h-[360px] w-full border-0 md:h-[480px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </Reveal>

        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={350} direction="up" className="mt-8 w-full max-w-[800px]">
          <div className="interactive-card flex flex-col gap-6 rounded-[28px] bg-[var(--orange)] px-8 py-8 md:flex-row md:items-center md:justify-between shadow-lg">
            <p className="text-lg font-bold text-white md:text-xl">{content.location.cateringText}</p>
            <Button cta={content.location.cateringCta} />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function FinalCtaSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <>
      {/* Mexican Serape Motif Divider */}
      <div 
        className="w-full h-3"
        style={{
          background: 'repeating-linear-gradient(90deg, var(--red) 0px, var(--red) 12px, var(--gold) 12px, var(--gold) 18px, #3d6b35 18px, #3d6b35 30px, var(--orange) 30px, var(--orange) 36px, var(--ink) 36px, var(--ink) 42px)'
        }}
      />
      <section className="deferred-section bg-[#19522f] px-8 py-14 text-white md:px-16 md:py-24">
        <div ref={reveal.ref} className="mx-auto max-w-[1312px]">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left">
          <p className="section-eyebrow !text-[var(--cream)]">{content.finalCta.eyebrow}</p>
        </Reveal>
        <div className={['mask-reveal', reveal.visible || prefersReducedMotion ? 'is-visible' : ''].join(' ')}>
          <h2 className="mask-reveal-inner mt-1.5 max-w-[900px] text-[34px] font-semibold leading-[1.05] md:text-[54px]">
            {content.finalCta.title}
          </h2>
        </div>
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={200}>
          <p className="mt-5 hidden max-w-[760px] text-lg leading-[1.6] text-[#fdf4e8] md:block">{content.finalCta.body}</p>
        </Reveal>
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={320}>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button cta={content.finalCta.primaryCta} attention />
            <Button cta={content.finalCta.secondaryCta} />
          </div>
        </Reveal>
      </div>
      </section>
    </>
  )
}

function Footer({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLElement>()

  return (
    <footer ref={reveal.ref} className="deferred-section bg-[var(--footer)] px-8 py-10 pb-28 text-[var(--cream-dim)] md:px-16 md:py-14">
      <div className="mx-auto grid max-w-[1312px] gap-8 md:grid-cols-[360px_220px_260px_260px] md:gap-12">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left">
          <div>
          <BrandMark content={content} className="max-h-16 w-auto object-contain" light />
          <p className="mt-1.5 max-w-[360px] text-base leading-[1.6]">{content.footer.description}</p>
          </div>
        </Reveal>
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={90}>
          <div>
          <div className="text-base font-semibold text-white">{content.footer.navigateHeading || 'Navigate'}</div>
          <div className="mt-1.5 space-y-2 text-[15px]">
            {content.navigation.map((item) => (
              <div key={item.label}>
                <a href={item.href}>{item.label}</a>
              </div>
            ))}
          </div>
          </div>
        </Reveal>
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={180}>
          <div>
          <div className="text-base font-semibold text-white">{content.footer.visitHeading || 'Visit'}</div>
          <div className="mt-1.5 space-y-2 text-[15px]">
            {content.footer.visit.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          </div>
        </Reveal>
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={270}>
          <div>
          <div className="text-base font-semibold text-white">{content.footer.orderHeading || 'Order and Social'}</div>
          <div className="mt-1.5 space-y-2 text-[15px]">
            {content.footer.order.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          </div>
        </Reveal>
      </div>
    </footer>
  )
}

function MobileStickyCta({ cta }: { cta: Cta }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-[var(--sand)] px-8 py-[14px] md:hidden">
      <Button cta={cta} fullWidth attention />
    </div>
  )
}

function InfoCardView({ item, prefersReducedMotion }: { item: InfoCard; prefersReducedMotion: boolean }) {
  const tiltRef = useTilt3D(4, 8)

  return (
    <article
      ref={prefersReducedMotion ? undefined : tiltRef as React.RefObject<HTMLElement>}
      className="interactive-card leather-stitch rounded-[24px] bg-white p-5 text-[var(--ink)]"
    >
      {item.number ? <div className="text-sm font-semibold text-[var(--orange)]">{item.number}</div> : null}
      <h3 className="mt-1 text-xl font-semibold leading-[1.2] md:text-2xl">{item.title}</h3>
      <p className="mt-1.5 text-[15px] leading-[1.6] text-[var(--muted)]">{item.body}</p>
      {item.source ? <p className="mt-2 text-sm font-medium text-[var(--brick)]">{item.source}</p> : null}
    </article>
  )
}

function Button({
  cta,
  fullWidth = false,
  forceVariant,
  attention = false,
}: {
  cta: Cta
  fullWidth?: boolean
  forceVariant?: Cta['variant']
  attention?: boolean
}) {
  const magneticRef = useMagnetic(0.25, 120)
  const variant = forceVariant || cta.variant
  const href = (cta.href || '').trim() || '#'
  const isExternal = /^https?:\/\//i.test(href)
  const isPrimary = variant !== 'secondary' && variant !== 'light'
  const style =
    variant === 'secondary'
      ? 'border border-[var(--red)] bg-[var(--cream-soft)] text-[var(--red)] hover:bg-white'
      : variant === 'light'
        ? 'border border-transparent bg-white text-[var(--red)] hover:shadow-[0_10px_28px_rgba(255,255,255,0.24)]'
        : 'border border-transparent bg-[var(--red)] text-white hover:shadow-[0_12px_28px_rgba(185,49,47,0.28)]'

  return (
    <a
      ref={magneticRef as React.RefObject<HTMLAnchorElement>}
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noreferrer' : undefined}
      className={[
        'interactive-button inline-flex items-center justify-center rounded-full px-6 py-[15px] text-[16px] font-semibold',
        style,
        fullWidth ? 'w-full' : '',
        attention ? 'attention-once' : '',
        isPrimary && !attention ? 'cta-glow' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {cta.label}
    </a>
  )
}

export default App
