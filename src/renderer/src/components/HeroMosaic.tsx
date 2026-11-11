import { PRODUCT_KINDS, ProductArt } from './ProductArt'

type Props = {
  /** Fotos reais de anúncios encontrados; completadas com ilustrações. */
  images: readonly string[]
}

type Tile = { key: string; image: string | null; kind: (typeof PRODUCT_KINDS)[number] }

const COLUMNS = 3
const TILES_PER_COLUMN = 5

function buildColumns(images: readonly string[]): Tile[][] {
  return Array.from({ length: COLUMNS }, (_, col) =>
    Array.from({ length: TILES_PER_COLUMN }, (_, row) => {
      const index = col * TILES_PER_COLUMN + row
      const image = images.length > 0 && (row + col) % 2 === 0 ? (images[index % images.length] ?? null) : null
      const kind = PRODUCT_KINDS[(index * 3 + col) % PRODUCT_KINDS.length] ?? 'phone'
      return { key: `${col}-${row}`, image, kind }
    })
  )
}

/** Mosaico em movimento contínuo (estilo galeria), com fotos reais e ilustrações. */
export function HeroMosaic({ images }: Props) {
  const columns = buildColumns(images)
  return (
    <div className="mosaic" aria-hidden="true">
      {columns.map((tiles, col) => (
        <div key={col} className={`mosaic__col mosaic__col--${col}`}>
          <div className="mosaic__track">
            {[...tiles, ...tiles].map((tile, i) => (
              <div key={`${tile.key}-${i}`} className={`mosaic__tile mosaic__tile--${tile.kind}`}>
                {tile.image ? (
                  <img src={tile.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <ProductArt kind={tile.kind} className="mosaic__art" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="mosaic__fade" />
    </div>
  )
}
