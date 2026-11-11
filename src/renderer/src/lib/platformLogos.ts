import type { PlatformId } from '../../../shared/platforms'
import buscape from '../assets/platforms/buscape.png'
import enjoei from '../assets/platforms/enjoei.png'
import facebook from '../assets/platforms/facebook.svg'
import mercadolivre from '../assets/platforms/mercadolivre.png'
import olx from '../assets/platforms/olx.png'
import shopee from '../assets/platforms/shopee.svg'

type PlatformLogo = {
  readonly src: string
  /** Ícone monocromático (SVG branco) que precisa do fundo na cor da marca. */
  readonly onBrand: boolean
}

/** Ícones oficiais das plataformas (favicons/ícones de app), empacotados com o app. */
export const PLATFORM_LOGOS: Readonly<Record<PlatformId, PlatformLogo>> = {
  facebook: { src: facebook, onBrand: true },
  mercadolivre: { src: mercadolivre, onBrand: false },
  olx: { src: olx, onBrand: false },
  enjoei: { src: enjoei, onBrand: false },
  shopee: { src: shopee, onBrand: true },
  buscape: { src: buscape, onBrand: false }
}
