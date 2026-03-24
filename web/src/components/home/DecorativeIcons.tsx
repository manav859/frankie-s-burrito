export const CowboyRider = () => (
  <svg viewBox="0 0 100 100" className="h-[90px] w-[90px] fill-[var(--ink)]">
    <ellipse cx="50" cy="65" rx="22" ry="14" />
    <path d="M 68 60 Q 85 45 85 40 L 78 40 Q 73 55 60 60 Z" />
    <path d="M 35 65 Q 20 70 15 90 L 22 90 Q 28 80 32 75 Z" />
    <path d="M 60 70 Q 65 85 60 95 L 67 95 Q 73 80 65 72 Z" />
    <rect x="42" y="32" width="12" height="22" rx="3" />
    <circle cx="48" cy="25" r="6" />
    <ellipse cx="48" cy="22" rx="14" ry="3" />
    <path d="M 42 22 Q 48 8 54 22 Z" />
    <path d="M 52 42 Q 68 55 65 65 L 58 60 Q 60 50 45 42 Z" />
    <path d="M 30 60 Q 12 50 5 75 Q 15 65 28 66 Z" />
  </svg>
)

export const CactusSVG = () => (
  <svg viewBox="0 0 100 100" className="h-[100px] w-[100px] fill-[#4a5d23]">
    <rect x="40" y="20" width="20" height="70" rx="10" />
    <path d="M 45 55 Q 15 55 15 30 L 25 30 Q 25 45 40 45 Z" />
    <path d="M 55 65 Q 85 65 85 40 L 75 40 Q 75 55 60 55 Z" />
    <circle cx="15" cy="30" r="5px" />
    <circle cx="85" cy="40" r="5px" />
  </svg>
)

export const CrossedGuns = () => (
  <svg viewBox="0 0 100 100" className="h-[80px] w-[80px] fill-[var(--ink)]" style={{ opacity: 0.15 }}>
    <g transform="translate(50, 50) rotate(45) translate(-50, -50)">
      <rect x="15" y="46" width="45" height="8" rx="2" />
      <rect x="60" y="42" width="16" height="16" rx="3" />
      <path d="M 72 45 L 85 70 A 5 5 0 0 1 78 75 L 65 55 Z" />
      <circle cx="20" cy="50" r="2" fill="white" />
    </g>
    <g transform="translate(50, 50) rotate(-45) translate(-50, -50)">
      <rect x="15" y="46" width="45" height="8" rx="2" />
      <rect x="60" y="42" width="16" height="16" rx="3" />
      <path d="M 72 45 L 85 70 A 5 5 0 0 1 78 75 L 65 55 Z" />
      <circle cx="20" cy="50" r="2" fill="white" />
    </g>
  </svg>
)

export const SheriffBadge = () => (
  <svg viewBox="0 0 100 100" className="h-[90px] w-[90px] fill-[var(--gold)]">
    <path d="M50 5 L62 35 L95 35 L68 55 L78 85 L50 65 L22 85 L32 55 L5 35 L38 35 Z" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
    <circle cx="50" cy="50" r="16" fill="none" stroke="var(--ink)" strokeWidth="3" />
    <circle cx="50" cy="50" r="9" fill="var(--ink)" />
    <circle cx="50" cy="15" r="3" fill="var(--ink)" />
    <circle cx="82" cy="38" r="3" fill="var(--ink)" />
    <circle cx="70" cy="74" r="3" fill="var(--ink)" />
    <circle cx="30" cy="74" r="3" fill="var(--ink)" />
    <circle cx="18" cy="38" r="3" fill="var(--ink)" />
  </svg>
)

export const Horseshoe = () => (
  <svg viewBox="0 0 100 100" className="h-[80px] w-[80px] fill-none stroke-[var(--ink)] stroke-linecap-round">
    <path d="M 30 80 L 30 40 A 20 20 0 0 1 70 40 L 70 80" strokeWidth="12" />
    <path d="M 22 80 L 38 80" strokeWidth="10" />
    <path d="M 62 80 L 78 80" strokeWidth="10" />
    <circle cx="20" cy="50" r="4" fill="var(--ink)" stroke="none" />
    <circle cx="25" cy="35" r="4" fill="var(--ink)" stroke="none" />
    <circle cx="80" cy="50" r="4" fill="var(--ink)" stroke="none" />
    <circle cx="75" cy="35" r="4" fill="var(--ink)" stroke="none" />
  </svg>
)
