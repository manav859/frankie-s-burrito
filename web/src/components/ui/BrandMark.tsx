import type { SiteContent } from '../../types'
import { CmsImage } from './CmsImage'

export function BrandMark({
  content,
  className = '',
  light = false,
}: {
  content: SiteContent
  className?: string
  light?: boolean
}) {
  const logoSrc = light ? content.siteLogoLight || content.siteLogo : content.siteLogo || content.siteLogoLight
  const logoMedia = light ? content.siteLogoLightMedia || content.siteLogoMedia : content.siteLogoMedia || content.siteLogoLightMedia

  if (logoSrc) {
    return (
      <CmsImage
        src={logoSrc}
        media={logoMedia}
        alt={content.siteLogoAlt || content.siteName}
        className={className}
        priority
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
