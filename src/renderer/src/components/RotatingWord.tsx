import { useEffect, useState } from 'react'

type Props = {
  words: readonly string[]
  intervalMs?: number
}

const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Palavra que troca sozinha com animação de "rolar para cima". */
export function RotatingWord({ words, intervalMs = 2200 }: Props) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (words.length < 2 || prefersReducedMotion()) return
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs)
    return () => clearInterval(id)
  }, [words.length, intervalMs])

  return (
    <span className="rotating" aria-live="off">
      <span key={index} className="rotating__word">
        {words[index]}
      </span>
    </span>
  )
}
