import { Button } from '../components/ui/Button'
import { BlogCard } from '../components/blog/BlogCard'
import type { PostArchiveResponse, SiteContent } from '../types'

export function BlogIndexPage({
  content,
  archive,
  loading,
  loadError,
}: {
  content: SiteContent
  archive: PostArchiveResponse | null
  loading: boolean
  loadError: string | null
}) {
  const archiveMeta = archive?.archive
  const posts = archive?.items ?? []
  const featuredPost = posts[0]
  const remainingPosts = posts.slice(1)
  const archiveTitle = archiveMeta?.title || "Frankie's Journal"
  const archiveBody =
    archiveMeta?.excerpt || `Stories, updates, and announcements from ${content.siteName}.`

  return (
    <section className="mx-auto max-w-[1180px]">
      <header className="relative overflow-hidden rounded-[34px] bg-[var(--red)] px-6 pb-10 pt-12 text-center text-white md:px-10 md:pb-14 md:pt-16">
        <div className="mx-auto max-w-[760px]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(255,248,239,0.82)]">{archiveMeta?.title || 'Journal'}</p>
          <h1 className="mt-5 font-western text-[40px] leading-[0.98] md:text-[56px]">{archiveTitle}</h1>
          <p className="mx-auto mt-4 max-w-[520px] text-sm leading-[1.8] text-[rgba(255,248,239,0.86)] md:text-base">
            {archiveBody}
          </p>
        </div>
        <div className="blog-stitch-bar" aria-hidden="true" />
      </header>

      {loading ? <BlogArchiveSkeleton /> : null}
      {loadError ? <BlogArchiveNotice tone="error" message={loadError} /> : null}

      {!loading && !loadError ? (
        <>
          {featuredPost ? (
            <div className="mt-8">
              <BlogCard post={featuredPost} featured />
            </div>
          ) : null}

          {remainingPosts.length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {remainingPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          ) : null}

          {!posts.length ? <BlogArchiveNotice tone="empty" message={`No published blog posts are available yet for ${content.siteName}.`} /> : null}

          {posts.length ? (
            <div className="mt-8 rounded-[28px] border border-[rgba(95,56,16,0.18)] bg-[var(--gold)] px-6 py-7 text-[var(--cocoa)] shadow-[4px_4px_0_var(--footer)] md:px-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="max-w-[560px]">
                  <p className="font-western text-[28px] leading-none">Don&apos;t miss a bite.</p>
                  <p className="mt-3 text-sm leading-[1.7] text-[rgba(43,33,27,0.9)] md:text-base">
                    Keep exploring the stories behind the grill, then jump straight back into the ordering flow when hunger wins.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button cta={content.hero.secondaryCta} forceVariant="light" />
                  <Button cta={content.hero.primaryCta} />
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function BlogArchiveSkeleton() {
  return (
    <div className="mt-8 space-y-6">
      <div className="animate-pulse overflow-hidden rounded-[26px] border border-[rgba(43,33,27,0.12)] bg-[var(--card)] p-6 shadow-[4px_4px_0_var(--footer)] md:grid md:grid-cols-[1.2fr_0.8fr] md:gap-6">
        <div className="min-h-[240px] rounded-[20px] bg-[rgba(43,33,27,0.08)]" />
        <div className="mt-6 space-y-4 md:mt-0">
          <div className="h-4 w-32 rounded-full bg-[rgba(43,33,27,0.08)]" />
          <div className="h-10 w-5/6 rounded-[14px] bg-[rgba(43,33,27,0.08)]" />
          <div className="h-24 rounded-[18px] bg-[rgba(43,33,27,0.08)]" />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`blog-skeleton-${index}`}
            className="animate-pulse overflow-hidden rounded-[22px] border border-[rgba(43,33,27,0.12)] bg-[var(--card)] p-4 shadow-[4px_4px_0_var(--footer)]"
          >
            <div className="aspect-[1.18/1] rounded-[18px] bg-[rgba(43,33,27,0.08)]" />
            <div className="mt-4 h-4 w-24 rounded-full bg-[rgba(43,33,27,0.08)]" />
            <div className="mt-3 h-8 w-4/5 rounded-[14px] bg-[rgba(43,33,27,0.08)]" />
            <div className="mt-3 h-16 rounded-[18px] bg-[rgba(43,33,27,0.08)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function BlogArchiveNotice({
  tone,
  message,
}: {
  tone: 'error' | 'empty'
  message: string
}) {
  return (
    <div
      className={[
        'mt-8 rounded-[24px] border px-6 py-5 shadow-[4px_4px_0_var(--footer)]',
        tone === 'error'
          ? 'border-[rgba(185,49,47,0.32)] bg-[rgba(185,49,47,0.08)] text-[var(--brick)]'
          : 'border-[rgba(43,33,27,0.14)] bg-[var(--card)] text-[var(--muted)]',
      ].join(' ')}
    >
      {message}
    </div>
  )
}
