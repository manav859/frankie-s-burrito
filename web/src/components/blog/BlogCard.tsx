import { CmsImage } from '../ui/CmsImage'
import { withBase } from '../../lib/base-path'
import type { PostArchiveItem } from '../../types'
import { formatBlogDate, formatReadingTime, getPostBadge, getPostHref } from './blog-helpers'

export function BlogCard({
  post,
  featured = false,
}: {
  post: PostArchiveItem
  featured?: boolean
}) {
  const href = withBase(getPostHref(post))
  const badge = getPostBadge(post)
  const readingTime = formatReadingTime(post.readingTimeMinutes)
  const meta = [formatBlogDate(post.publishedAt), post.author?.name, readingTime].filter(Boolean).join(' | ')

  if (featured) {
    return (
      <article className="blog-card-shadow overflow-hidden rounded-[26px] border border-[rgba(43,33,27,0.18)] bg-[var(--card)]">
        <div className="grid md:grid-cols-[1.15fr_0.85fr]">
          <a href={href} className="block bg-[rgba(43,33,27,0.06)]">
            {post.featuredImage ? (
              <CmsImage
                src={post.featuredImage}
                media={post.featuredImageMedia}
                alt={post.featuredImageAlt || post.title}
                className="h-[260px] w-full object-cover md:h-full md:min-h-[420px]"
                sizes="(min-width: 768px) 60vw, 100vw"
              />
            ) : (
              <div className="flex h-[260px] items-center justify-center bg-[var(--cream-soft)] text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brick)] md:h-full md:min-h-[420px]">
                Frankie&apos;s Journal
              </div>
            )}
          </a>

          <div className="flex flex-col justify-between gap-6 p-6 md:p-10">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brick)]">
                <span className="rounded-full bg-[var(--cream-soft)] px-3 py-1">{badge}</span>
                {post.status && post.status !== 'publish' ? <span>{post.status}</span> : null}
              </div>

              <h2 className="mt-4 font-western text-[32px] leading-[1.04] text-[var(--cocoa)] md:text-[44px]">
                <a href={href}>{post.title}</a>
              </h2>

              {meta ? <p className="mt-4 text-sm leading-[1.7] text-[var(--muted)]">{meta}</p> : null}

              {post.excerpt ? <p className="blog-card-excerpt mt-5 text-[15px] leading-[1.8] text-[var(--muted)]">{post.excerpt}</p> : null}
            </div>

            <div className="flex items-center justify-between gap-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--red)]">
              <a href={href}>Read More</a>
              <span aria-hidden="true">Open Story</span>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="blog-card-shadow interactive-card overflow-hidden rounded-[22px] border border-[rgba(43,33,27,0.14)] bg-[var(--card)]">
      <a href={href} className="block bg-[rgba(43,33,27,0.06)]">
        {post.featuredImage ? (
          <CmsImage
            src={post.featuredImage}
            media={post.featuredImageMedia}
            alt={post.featuredImageAlt || post.title}
            className="image-zoom aspect-[1.18/1] w-full object-cover"
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
          />
        ) : (
          <div className="flex aspect-[1.18/1] items-center justify-center bg-[var(--cream-soft)] text-center text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brick)]">
            Frankie&apos;s Journal
          </div>
        )}
      </a>

      <div className="p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brick)]">
          <span className="rounded-full bg-[var(--cream-soft)] px-3 py-1">{badge}</span>
          {post.status && post.status !== 'publish' ? <span>{post.status}</span> : null}
        </div>

        <h2 className="mt-4 font-western text-[26px] leading-[1.08] text-[var(--cocoa)]">
          <a href={href}>{post.title}</a>
        </h2>

        {meta ? <p className="mt-3 text-xs leading-[1.7] text-[var(--muted)]">{meta}</p> : null}

        {post.excerpt ? <p className="blog-card-excerpt mt-4 text-[14px] leading-[1.75] text-[var(--muted)]">{post.excerpt}</p> : null}

        <a href={href} className="mt-5 inline-flex text-sm font-semibold uppercase tracking-[0.14em] text-[var(--red)]">
          Read More
        </a>
      </div>
    </article>
  )
}
