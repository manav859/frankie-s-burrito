import type { CSSProperties, ImgHTMLAttributes } from 'react'
import type { ResponsiveImageAsset } from '../../lib/media'

export function CmsImage({
  src,
  media,
  alt,
  className,
  sizes,
  priority = false,
  loading,
  style,
  width,
  height,
}: {
  src?: string
  media?: ResponsiveImageAsset
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
  loading?: ImgHTMLAttributes<HTMLImageElement>['loading']
  style?: CSSProperties
  width?: number
  height?: number
}) {
  const resolvedSrc = media?.url || src

  if (!resolvedSrc) {
    return null
  }

  const resolvedWidth = width || media?.width
  const resolvedHeight = height || media?.height
  const normalizedLoading = loading || (priority ? 'eager' : 'lazy')
  const normalizedAlt = media?.alt || alt

  return (
    <img
      src={resolvedSrc}
      alt={normalizedAlt}
      className={className}
      loading={normalizedLoading}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      srcSet={media?.srcset}
      sizes={sizes}
      width={resolvedWidth}
      height={resolvedHeight}
      style={style}
    />
  )
}
