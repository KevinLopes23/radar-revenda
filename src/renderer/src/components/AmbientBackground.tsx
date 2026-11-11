/** Fundo vivo: manchas de luz em movimento lento, grade sutil e granulado de filme. */
export function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient__blob ambient__blob--lime" />
      <div className="ambient__blob ambient__blob--violet" />
      <div className="ambient__blob ambient__blob--cyan" />
      <div className="ambient__grid" />
      <div className="ambient__grain" />
    </div>
  )
}
