import { useEffect, useRef, useState } from 'react'

type Props = {
  value: number
  format?: (value: number) => string
  durationMs?: number
}

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3

/** Número que "conta" até o valor final quando aparece ou muda. */
export function CountUp({ value, format = (v) => String(Math.round(v)), durationMs = 900 }: Props) {
  const [display, setDisplay] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    const initial = from.current
    let frame = 0
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / durationMs)
      const current = initial + (value - initial) * easeOutCubic(t)
      setDisplay(current)
      if (t < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs])

  return <>{format(display)}</>
}
