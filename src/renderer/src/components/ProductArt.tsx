import { useId, type ReactElement } from 'react'

export type ProductKind = 'phone' | 'gamepad' | 'camera' | 'headphones' | 'watch' | 'drill' | 'laptop' | 'sneaker'

export const PRODUCT_KINDS: readonly ProductKind[] = ['phone', 'gamepad', 'camera', 'headphones', 'watch', 'drill', 'laptop', 'sneaker']

type Props = {
  kind: ProductKind
  className?: string
}

type Ids = { metal: string; glow: string; screen: string }

/** Ilustrações vetoriais dos produtos mais revendidos (sem dependência de imagens externas). */
const SHAPES: Record<ProductKind, (ids: Ids) => ReactElement> = {
  phone: ({ metal, screen }) => (
    <g>
      <rect x="62" y="22" width="76" height="156" rx="18" fill={`url(#${metal})`} />
      <rect x="68" y="30" width="64" height="140" rx="13" fill={`url(#${screen})`} />
      <rect x="88" y="34" width="24" height="6" rx="3" fill="#05070a" />
      <path d="M74 120 Q100 92 126 120" stroke="#ffffff" strokeOpacity=".35" strokeWidth="3" fill="none" />
      <circle cx="100" cy="88" r="16" fill="#ffffff" fillOpacity=".12" />
    </g>
  ),
  gamepad: ({ metal }) => (
    <g>
      <path d="M48 82 C30 82 22 120 28 146 C33 166 54 166 64 146 L74 128 H126 L136 146 C146 166 167 166 172 146 C178 120 170 82 152 82 Z" fill={`url(#${metal})`} />
      <rect x="54" y="100" width="22" height="7" rx="2" fill="#05070a" />
      <rect x="61.5" y="92.5" width="7" height="22" rx="2" fill="#05070a" />
      <circle cx="138" cy="96" r="5" fill="#c6ff3d" />
      <circle cx="150" cy="108" r="5" fill="#7c5cff" />
      <circle cx="126" cy="108" r="5" fill="#3de0ff" />
      <circle cx="138" cy="120" r="5" fill="#ff5c8a" />
    </g>
  ),
  camera: ({ metal, glow }) => (
    <g>
      <rect x="30" y="66" width="140" height="92" rx="16" fill={`url(#${metal})`} />
      <rect x="58" y="52" width="42" height="20" rx="6" fill={`url(#${metal})`} />
      <circle cx="100" cy="112" r="34" fill="#05070a" />
      <circle cx="100" cy="112" r="24" fill={`url(#${glow})`} />
      <circle cx="92" cy="104" r="6" fill="#ffffff" fillOpacity=".55" />
      <circle cx="150" cy="82" r="5" fill="#c6ff3d" />
    </g>
  ),
  headphones: ({ metal }) => (
    <g>
      <path d="M46 120 V104 C46 70 70 44 100 44 C130 44 154 70 154 104 V120" stroke={`url(#${metal})`} strokeWidth="12" fill="none" strokeLinecap="round" />
      <rect x="32" y="110" width="34" height="56" rx="14" fill={`url(#${metal})`} />
      <rect x="134" y="110" width="34" height="56" rx="14" fill={`url(#${metal})`} />
      <rect x="40" y="120" width="10" height="36" rx="5" fill="#c6ff3d" fillOpacity=".8" />
      <rect x="150" y="120" width="10" height="36" rx="5" fill="#c6ff3d" fillOpacity=".8" />
    </g>
  ),
  watch: ({ metal, screen }) => (
    <g>
      <rect x="76" y="20" width="48" height="50" rx="10" fill="#1d2433" />
      <rect x="76" y="130" width="48" height="50" rx="10" fill="#1d2433" />
      <rect x="58" y="56" width="84" height="88" rx="24" fill={`url(#${metal})`} />
      <rect x="66" y="64" width="68" height="72" rx="18" fill={`url(#${screen})`} />
      <text x="100" y="108" textAnchor="middle" fontSize="20" fontWeight="700" fill="#05070a" fontFamily="sans-serif">
        10:09
      </text>
      <rect x="142" y="86" width="6" height="18" rx="3" fill="#c6ff3d" />
    </g>
  ),
  drill: ({ metal }) => (
    <g>
      <rect x="40" y="56" width="100" height="44" rx="16" fill="#c6ff3d" />
      <rect x="140" y="68" width="22" height="20" rx="4" fill={`url(#${metal})`} />
      <rect x="162" y="74" width="24" height="8" rx="3" fill="#c9d1e0" />
      <path d="M70 100 L96 100 L104 150 L72 150 Z" fill="#141a26" />
      <rect x="56" y="148" width="66" height="28" rx="8" fill={`url(#${metal})`} />
      <circle cx="62" cy="78" r="8" fill="#05070a" fillOpacity=".6" />
    </g>
  ),
  laptop: ({ metal, screen }) => (
    <g>
      <rect x="44" y="46" width="112" height="78" rx="8" fill={`url(#${metal})`} />
      <rect x="51" y="53" width="98" height="64" rx="4" fill={`url(#${screen})`} />
      <path d="M28 132 H172 L162 150 H38 Z" fill={`url(#${metal})`} />
      <rect x="86" y="132" width="28" height="5" rx="2.5" fill="#05070a" fillOpacity=".5" />
    </g>
  ),
  sneaker: ({ metal }) => (
    <g>
      <path d="M26 124 C26 104 40 96 56 94 L84 70 C92 64 100 70 104 78 L114 96 C134 100 160 108 170 124 C176 134 172 146 160 146 H38 C30 146 26 138 26 124 Z" fill={`url(#${metal})`} />
      <path d="M26 132 H174" stroke="#c6ff3d" strokeWidth="10" strokeLinecap="round" />
      <path d="M64 92 L74 104 M76 82 L86 94 M88 74 L98 86" stroke="#05070a" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

export function ProductArt({ kind, className }: Props) {
  const base = useId().replace(/:/g, '')
  const ids: Ids = { metal: `${base}m`, glow: `${base}g`, screen: `${base}s` }
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={`Ilustração: ${kind}`}>
      <defs>
        <linearGradient id={ids.metal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4560" />
          <stop offset=".55" stopColor="#1a2130" />
          <stop offset="1" stopColor="#0c1018" />
        </linearGradient>
        <radialGradient id={ids.glow}>
          <stop offset="0" stopColor="#c6ff3d" />
          <stop offset=".6" stopColor="#3de0ff" />
          <stop offset="1" stopColor="#7c5cff" />
        </radialGradient>
        <linearGradient id={ids.screen} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c6ff3d" />
          <stop offset=".5" stopColor="#3de0ff" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      {SHAPES[kind](ids)}
    </svg>
  )
}
