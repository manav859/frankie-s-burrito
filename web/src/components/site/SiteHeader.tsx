import { useEffect, useState } from 'react'
import type { SiteContent } from '../../types'
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

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          isScrolled ? 'bg-white shadow-[0_10px_30px_rgba(31,31,31,0.10)]' : 'bg-[rgba(255,255,255,0.92)] backdrop-blur',
        ].join(' ')}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-8 py-4 md:px-16">
          <a href="/" className="block">
            <BrandMark content={content} className="max-h-14 w-auto object-contain" />
          </a>

          <nav className="hidden items-center gap-6 text-[15px] font-medium text-[var(--ink)] md:flex">
            {content.navigation.map((item) => (
              <a key={item.label} href={item.href} className="nav-link transition hover:text-[var(--gold)]">
                {item.label}
              </a>
            ))}
            <a href="/blog" className="nav-link transition hover:text-[var(--gold)]">
              Journal
            </a>
            <Button cta={content.hero.primaryCta} />
          </nav>

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-[14px] md:hidden"
          >
            <span className="h-0.5 w-5 rounded-full bg-[var(--ink)]" />
            <span className="h-0.5 w-5 rounded-full bg-[var(--ink)]" />
            <span className="h-0.5 w-5 rounded-full bg-[var(--ink)]" />
          </button>
        </div>
      </header>

      <MobileMenu
        content={{ ...content, navigation: [...content.navigation, { label: 'Journal', href: '/blog' }] }}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        prefersReducedMotion={prefersReducedMotion}
      />
    </>
  )
}
