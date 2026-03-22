import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Helpers ────────────────────────────────────────────────────────────────

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

function getReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

function lerp(start: number, end: number, factor: number) {
  return start + (end - start) * factor
}

// ─── useParallax ────────────────────────────────────────────────────────────
// Gives an element a scroll-linked Y offset for depth effect.
// `speed` controls intensity: 0 = no movement, 0.5 = half scroll speed.

export function useParallax(speed = 0.12) {
  const ref = useRef<HTMLElement | null>(null)
  const rafId = useRef(0)
  const currentY = useRef(0)
  const targetY = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el || getReducedMotion()) return

    const tick = () => {
      const rect = el.getBoundingClientRect()
      const viewH = window.innerHeight
      // Only compute when in or near viewport
      if (rect.bottom > -200 && rect.top < viewH + 200) {
        const center = rect.top + rect.height / 2
        const offset = (center - viewH / 2) * speed
        targetY.current = offset
      }
      currentY.current = lerp(currentY.current, targetY.current, 0.08)
      el.style.transform = `translate3d(0, ${currentY.current.toFixed(2)}px, 0)`
      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId.current)
  }, [speed])

  return ref
}

// ─── useMagnetic ────────────────────────────────────────────────────────────
// Buttons/cards subtly pull toward cursor when it's near.

export function useMagnetic(strength = 0.3, radius = 150) {
  const ref = useRef<HTMLElement | null>(null)
  const rafId = useRef(0)
  const pos = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el || isTouchDevice() || getReducedMotion()) return

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < radius) {
        const pull = (1 - dist / radius) * strength
        target.current = {
          x: dx * pull,
          y: dy * pull,
        }
      } else {
        target.current = { x: 0, y: 0 }
      }
    }

    const onLeave = () => {
      target.current = { x: 0, y: 0 }
    }

    const tick = () => {
      pos.current.x = lerp(pos.current.x, target.current.x, 0.12)
      pos.current.y = lerp(pos.current.y, target.current.y, 0.12)
      el.style.transform = `translate3d(${pos.current.x.toFixed(2)}px, ${pos.current.y.toFixed(2)}px, 0)`
      rafId.current = requestAnimationFrame(tick)
    }

    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    rafId.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId.current)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      el.style.transform = ''
    }
  }, [strength, radius])

  return ref
}

// ─── useTilt3D ──────────────────────────────────────────────────────────────
// Subtle perspective tilt on hover with depth shadow shift.

export function useTilt3D(maxAngle = 6, shadowShift = 12) {
  const ref = useRef<HTMLElement | null>(null)
  const rafId = useRef(0)
  const current = useRef({ rx: 0, ry: 0, sx: 0, sy: 0 })
  const target = useRef({ rx: 0, ry: 0, sx: 0, sy: 0 })
  const hovering = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || isTouchDevice() || getReducedMotion()) return

    el.style.transformStyle = 'preserve-3d'
    el.style.perspective = '800px'

    const onEnter = () => { hovering.current = true }
    const onLeave = () => {
      hovering.current = false
      target.current = { rx: 0, ry: 0, sx: 0, sy: 0 }
    }

    const onMove = (e: MouseEvent) => {
      if (!hovering.current) return
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5   // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5

      target.current = {
        rx: clamp(-y * maxAngle, -maxAngle, maxAngle),
        ry: clamp(x * maxAngle, -maxAngle, maxAngle),
        sx: x * shadowShift,
        sy: y * shadowShift,
      }
    }

    const tick = () => {
      const c = current.current
      const t = target.current
      c.rx = lerp(c.rx, t.rx, 0.1)
      c.ry = lerp(c.ry, t.ry, 0.1)
      c.sx = lerp(c.sx, t.sx, 0.1)
      c.sy = lerp(c.sy, t.sy, 0.1)

      el.style.transform = `perspective(800px) rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg)`
      el.style.boxShadow = `${(-c.sx).toFixed(1)}px ${(c.sy + 12).toFixed(1)}px 32px rgba(31,25,21,0.12)`
      rafId.current = requestAnimationFrame(tick)
    }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('mousemove', onMove, { passive: true })
    rafId.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId.current)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('mousemove', onMove)
      el.style.transform = ''
      el.style.boxShadow = ''
    }
  }, [maxAngle, shadowShift])

  return ref
}

// ─── useScrollProgress ──────────────────────────────────────────────────────
// Returns 0→1 as an element scrolls through the viewport.

export function useScrollProgress() {
  const ref = useRef<HTMLElement | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let rafId = 0
    const update = () => {
      const rect = el.getBoundingClientRect()
      const viewH = window.innerHeight
      const raw = 1 - (rect.top / (viewH + rect.height))
      setProgress(clamp(raw, 0, 1))
      rafId = requestAnimationFrame(update)
    }
    rafId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return { ref, progress }
}

// ─── useStaggerReveal ───────────────────────────────────────────────────────
// Returns IntersectionObserver-based reveal with stagger info for N children.

export function useStaggerReveal<T extends HTMLElement>(count: number, baseDelay = 80, curve = 1.15) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || visible) return

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

  const getDelay = useCallback(
    (index: number) => {
      if (getReducedMotion()) return 0
      const safeIndex = Math.min(index, Math.max(count - 1, 0))
      // Power curve makes early items appear faster, later items get more spacing
      return Math.round(baseDelay * Math.pow(safeIndex + 1, curve))
    },
    [baseDelay, count, curve],
  )

  return { ref, visible, getDelay }
}

// ─── useSmoothCounter ───────────────────────────────────────────────────────
// Animates a number from 0 to target when visible.

export function useSmoothCounter(target: number, duration = 1600) {
  const ref = useRef<HTMLElement | null>(null)
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || started.current) return

    if (getReducedMotion()) {
      setValue(target)
      started.current = true
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          observer.disconnect()
          const start = performance.now()
          const tick = (now: number) => {
            const elapsed = now - start
            const t = clamp(elapsed / duration, 0, 1)
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3)
            setValue(Math.round(eased * target))
            if (t < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return { ref, value }
}

// ─── useFloatingAccent ──────────────────────────────────────────────────────
// Gentle floating motion for decorative elements.

export function useFloatingAccent(amplitude = 8, period = 4000, phase = 0) {
  const ref = useRef<HTMLElement | null>(null)
  const rafId = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el || getReducedMotion()) return

    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start + phase) / period
      const y = Math.sin(t * Math.PI * 2) * amplitude
      const x = Math.cos(t * Math.PI * 2 * 0.7 + 1) * (amplitude * 0.4)
      const rotate = Math.sin(t * Math.PI * 2 * 0.5 + 2) * 3
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rotate.toFixed(1)}deg)`
      rafId.current = requestAnimationFrame(tick)
    }
    rafId.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId.current)
  }, [amplitude, period, phase])

  return ref
}

// ─── Merge refs utility ─────────────────────────────────────────────────────

export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const r of refs) {
      if (typeof r === 'function') r(node)
      else if (r && typeof r === 'object') {
        ;(r as React.MutableRefObject<T | null>).current = node
      }
    }
  }
}
