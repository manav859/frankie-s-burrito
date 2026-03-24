import type { RefObject } from 'react'
import { useMagnetic } from '../../lib/animations'
import type { Cta } from '../../types'

export function Button({
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
      ref={magneticRef as RefObject<HTMLAnchorElement>}
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
