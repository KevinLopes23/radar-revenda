type Props = {
  size?: number
}

/** Marca do Achadão: etiqueta de preço com brilho de "achado". */
export function Logo({ size = 36 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9ff70" />
          <stop offset="1" stopColor="#8fe000" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#logo-bg)" />
      <path d="M17 31 L31 17 H45 a2 2 0 0 1 2 2 V33 L33 47 a3 3 0 0 1 -4.2 0 L17 35.2 a3 3 0 0 1 0 -4.2 Z" fill="#0b1200" />
      <circle cx="39.5" cy="24.5" r="3.6" fill="#c6ff3d" />
      <path className="logo__spark" d="M50 6 L52 12 L58 14 L52 16 L50 22 L48 16 L42 14 L48 12 Z" fill="#ffffff" />
    </svg>
  )
}
