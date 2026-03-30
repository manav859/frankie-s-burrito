import type { SiteContent } from '../../types'
import { BrandMark } from '../ui/BrandMark'
import { Button } from '../ui/Button'
import { resolveAppHref } from '../../lib/routes'

export function MobileMenu({
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
        'pointer-events-none fixed inset-0 z-[60] bg-[rgba(31,25,21,0.35)] transition-opacity duration-300',
        open ? 'pointer-events-auto opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      <div
        className={[
          'ml-auto flex h-full w-[88vw] max-w-[340px] flex-col overflow-y-auto bg-[var(--paper)] px-4 py-5 shadow-[-24px_0_40px_rgba(0,0,0,0.18)] transition-transform duration-300 min-[380px]:px-6 min-[380px]:py-6',
          open ? 'translate-x-0' : 'translate-x-full',
          prefersReducedMotion ? 'duration-0' : '',
        ].join(' ')}
        >
        <div className="flex items-center justify-between gap-3">
          <BrandMark content={content} className="block h-auto max-h-10 w-auto max-w-full object-contain min-[380px]:max-h-12" />
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--brick)] transition-transform hover:rotate-90">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {content.navigation.map((item, index) => (
            <a
              key={item.label}
              href={resolveAppHref(item.href, item.label)}
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
