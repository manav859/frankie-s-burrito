import { BlogCard } from '../components/blog/BlogCard'
import { formatBlogDate, formatReadingTime, getPostBadge } from '../components/blog/blog-helpers'
import { CmsImage } from '../components/ui/CmsImage'
import { withBase } from '../lib/base-path'
import type { PostEntry, SiteContent } from '../types'

export function BlogPostPage({
  content,
  entry,
  loading,
  loadError,
}: {
  content: SiteContent
  entry: PostEntry | null
  loading: boolean
  loadError: string | null
}) {
  if (loading) {
    return <BlogPostSkeleton />
  }

  if (loadError) {
    return <BlogPostNotice tone="error" message={loadError} />
  }

  if (!entry) {
    return <BlogPostNotice tone="empty" message={`No blog story was found for ${content.siteName}.`} />
  }

  const meta = [formatBlogDate(entry.publishedAt), entry.author?.name, formatReadingTime(entry.readingTimeMinutes)]
    .filter(Boolean)
    .join(' | ')
  const categories = entry.categories || []
  const tags = entry.tags || []
  const related = entry.related || []
  const archiveTitle = entry.archive?.title || 'Journal'

  return (
    <article className="mx-auto max-w-[1160px]">
      <header className="relative overflow-hidden rounded-[34px] bg-[var(--red)] px-6 pb-10 pt-8 text-center text-white md:px-10 md:pb-12 md:pt-10">
        <div className="mx-auto max-w-[760px]">
          <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,248,239,0.88)]">
            <a href={withBase('/blog')} className="rounded-full border border-[rgba(255,248,239,0.34)] px-2.5 py-1">
              Back to {archiveTitle}
            </a>
            <span>{getPostBadge(entry)}</span>
            {entry.status && entry.status !== 'publish' ? (
              <span className="rounded-full border border-[rgba(255,248,239,0.34)] px-2.5 py-1">{entry.status}</span>
            ) : null}
          </div>

          <h1 className="mt-5 font-western text-[34px] leading-[1.04] md:text-[54px]">{entry.title}</h1>
          {meta ? <p className="mx-auto mt-4 max-w-[580px] text-sm leading-[1.8] text-[rgba(255,248,239,0.88)] md:text-base">{meta}</p> : null}
        </div>
        <div className="blog-stitch-bar" aria-hidden="true" />
      </header>

      {entry.featuredImage ? (
        <div className="blog-card-shadow mt-8 overflow-hidden rounded-[24px] border border-[rgba(43,33,27,0.18)] bg-black">
          <CmsImage
            src={entry.featuredImage}
            alt={entry.featuredImageAlt || entry.title}
            className="h-[240px] w-full object-cover md:h-[420px] xl:h-[520px]"
            sizes="100vw"
            priority
          />
        </div>
      ) : null}

      <div className="mx-auto mt-8 max-w-[900px]">
        {entry.excerpt ? (
          <div className="blog-card-shadow rounded-[22px] border border-[rgba(43,33,27,0.18)] bg-[var(--card)] px-6 py-5 text-[var(--brick)] md:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--orange)]">From the grill</p>
            <p className="mt-3 font-western text-[22px] leading-[1.35] md:text-[28px]">{entry.excerpt}</p>
          </div>
        ) : null}

        {(categories.length || tags.length) ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category.slug} className="rounded-full border border-[rgba(43,33,27,0.12)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brick)]">
                {category.name}
              </span>
            ))}
            {tags.slice(0, 4).map((tag) => (
              <span key={tag.slug} className="rounded-full bg-[var(--cream-soft)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                #{tag.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="blog-rich-content mt-8" dangerouslySetInnerHTML={{ __html: entry.content }} />
      </div>

      {related.length ? (
        <section className="mt-12 border-t border-[rgba(43,33,27,0.16)] pt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--orange)]">More to read</p>
              <h2 className="mt-2 font-western text-[30px] leading-none text-[var(--cocoa)] md:text-[38px]">More to Read</h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {related.slice(0, 3).map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  )
}

function BlogPostSkeleton() {
  return (
    <div className="mx-auto max-w-[1160px] animate-pulse space-y-8">
      <div className="overflow-hidden rounded-[34px] bg-[var(--red)] px-6 py-12 text-center">
        <div className="mx-auto h-4 w-32 rounded-full bg-[rgba(255,248,239,0.24)]" />
        <div className="mx-auto mt-5 h-16 max-w-[640px] rounded-[18px] bg-[rgba(255,248,239,0.24)]" />
        <div className="mx-auto mt-4 h-4 w-56 rounded-full bg-[rgba(255,248,239,0.24)]" />
      </div>
      <div className="min-h-[280px] rounded-[24px] bg-[rgba(43,33,27,0.08)]" />
      <div className="mx-auto max-w-[900px] space-y-4">
        <div className="h-28 rounded-[24px] bg-[rgba(43,33,27,0.08)]" />
        <div className="h-64 rounded-[24px] bg-[rgba(43,33,27,0.08)]" />
      </div>
    </div>
  )
}

function BlogPostNotice({
  tone,
  message,
}: {
  tone: 'error' | 'empty'
  message: string
}) {
  return (
    <div
      className={[
        'mx-auto mt-8 max-w-[860px] rounded-[24px] border px-6 py-5 shadow-[4px_4px_0_var(--footer)]',
        tone === 'error'
          ? 'border-[rgba(185,49,47,0.32)] bg-[rgba(185,49,47,0.08)] text-[var(--brick)]'
          : 'border-[rgba(43,33,27,0.14)] bg-[var(--card)] text-[var(--muted)]',
      ].join(' ')}
    >
      {message}
    </div>
  )
}
