import { useEffect, useState } from 'react'
import type { SiteContent } from '../../types'
import { withBase } from '../../lib/base-path'
import { resolveAppHref } from '../../lib/routes'
import { useCart } from '../../features/ordering/cart'
import { BrandMark } from '../ui/BrandMark'
import { Button } from '../ui/Button'
import { MobileMenu } from './MobileMenu'

export function SiteHeader({
  content,
  isScrolled,
  prefersReducedMotion,
}: {
  content: SiteContent
  isScrolled: boolean
  prefersReducedMotion: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { cart } = useCart()
  const blogNavItem = { label: 'Journal', href: withBase('/blog') }
  const navigationItems = content.navigation.some((item) => item.href === blogNavItem.href || item.label === blogNavItem.label)
    ? content.navigation
    : [...content.navigation, blogNavItem]

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const cartCount = cart?.item_count || 0

  return (
    <>
      <header
        className={[
          'sticky top-0 z-50 w-full overflow-x-clip transition-all duration-500',
          isScrolled ? 'bg-white shadow-[0_10px_30px_rgba(31,31,31,0.10)]' : 'bg-[rgba(255,255,255,0.92)] backdrop-blur',
        ].join(' ')}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-2 py-3 sm:px-4 md:px-16 md:py-4">
          <a href={withBase('/')} className="block">
            <BrandMark content={content} className="max-h-11 w-auto object-contain sm:max-h-12 md:max-h-14" />
          </a>

          <nav className="hidden items-center gap-6 text-[15px] font-medium text-[var(--ink)] md:flex">
            {navigationItems.map((item) => (
              <a key={item.label} href={resolveAppHref(item.href, item.label)} className="nav-link transition hover:text-[var(--gold)]">
                {item.label}
              </a>
            ))}
            <a
              href={withBase('/cart')}
              className="relative inline-flex h-12 min-w-12 items-center justify-center rounded-full border border-[rgba(31,31,31,0.08)] bg-white px-4 text-sm font-semibold text-[var(--ink)] shadow-[0_10px_24px_rgba(31,31,31,0.08)]"
              aria-label={`Cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            >
              Cart
              {cartCount > 0 ? (
                <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--red)] px-2 py-0.5 text-[11px] font-bold text-white">
                  {cartCount}
                </span>
              ) : null}
            </a>
            <Button cta={content.hero.primaryCta} />
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <a
              href={withBase('/cart')}
              className="relative inline-flex h-10 min-w-10 items-center justify-center rounded-[12px] border border-[rgba(31,31,31,0.08)] bg-white px-2.5 text-xs font-semibold text-[var(--ink)] sm:h-11 sm:min-w-11 sm:px-3 sm:text-sm"
              aria-label={`Cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            >
              Cart
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--red)] px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              ) : null}
            </a>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-[12px] sm:h-11 sm:w-11"
            >
              <span className="h-0.5 w-5 rounded-full bg-[var(--ink)]" />
              <span className="h-0.5 w-5 rounded-full bg-[var(--ink)]" />
              <span className="h-0.5 w-5 rounded-full bg-[var(--ink)]" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        content={{ ...content, navigation: navigationItems }}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        prefersReducedMotion={prefersReducedMotion}
      />
    </>
  )
}
