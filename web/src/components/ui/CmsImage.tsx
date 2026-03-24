export function CmsImage({
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
