export type ResponsiveImageSource = {
  url: string
  width?: number
  height?: number
}

export type ResponsiveImageAsset = {
  id?: number
  url: string
  alt?: string
  width?: number
  height?: number
  mimeType?: string
  srcset?: string
  sources?: Record<string, ResponsiveImageSource>
}

type SourceEntry = [string, ResponsiveImageSource]

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeResponsiveImageAsset(input: unknown): ResponsiveImageAsset | undefined {
  if (!input || typeof input !== 'object') {
    return undefined
  }

  const record = input as Record<string, unknown>
  const url = asString(record.url)

  if (!url) {
    return undefined
  }

  const sources = record.sources && typeof record.sources === 'object'
    ? Object.fromEntries(
        Object.entries(record.sources as Record<string, unknown>)
          .reduce<SourceEntry[]>((entries, [key, value]) => {
            if (!value || typeof value !== 'object') {
              return entries
            }

            const source = value as Record<string, unknown>
            const sourceUrl = asString(source.url)

            if (!sourceUrl) {
              return entries
            }

            entries.push([
              key,
              {
                url: sourceUrl,
                width: asNumber(source.width) || undefined,
                height: asNumber(source.height) || undefined,
              },
            ])

            return entries
          }, []),
      )
    : undefined

  return {
    id: asNumber(record.id) || undefined,
    url,
    alt: asString(record.alt) || undefined,
    width: asNumber(record.width) || undefined,
    height: asNumber(record.height) || undefined,
    mimeType: asString(record.mimeType) || undefined,
    srcset: asString(record.srcset) || undefined,
    sources: sources && Object.keys(sources).length ? sources : undefined,
  }
}
