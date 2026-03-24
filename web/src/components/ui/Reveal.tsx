import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || visible) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [visible])

  return { ref, visible }
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  visible = true,
  reducedMotion = false,
  direction = 'up',
}: {
  children: ReactNode
  className?: string
  delay?: number
  visible?: boolean
  reducedMotion?: boolean
  direction?: 'up' | 'left' | 'right' | 'scale'
}) {
  const dirClass = direction !== 'up' ? `reveal-${direction}` : ''

  return (
    <div
      className={[
        'motion-reveal',
        dirClass,
        visible || reducedMotion ? 'is-visible' : '',
        reducedMotion ? 'motion-reduce-safe' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ transitionDelay: reducedMotion ? '0ms' : `${delay}ms` }}
    >
      {children}
    </div>
  )
}
