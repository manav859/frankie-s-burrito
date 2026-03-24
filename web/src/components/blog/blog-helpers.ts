import type { PostArchiveItem, PostEntry } from '../../types'

export function formatBlogDate(value?: string) {
  if (!value) {
    return 'Fresh off the grill'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Fresh off the grill'
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatReadingTime(minutes?: number) {
  if (!minutes || minutes <= 0) {
    return null
  }

  return `${Math.max(1, Math.round(minutes))} min read`
}

export function getPrimaryCategory(post: PostArchiveItem | PostEntry) {
  return post.categories[0]?.name || null
}

export function getPostBadge(post: PostArchiveItem | PostEntry) {
  return getPrimaryCategory(post) || 'Journal'
}

export function getPostHref(post: PostArchiveItem) {
  if (post.url?.startsWith('/')) {
    return post.url
  }

  return `/blog/${post.slug}`
}
