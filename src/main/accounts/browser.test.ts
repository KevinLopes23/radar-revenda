import { describe, expect, it } from 'vitest'
import { chromeLaunchOptions } from './browser'

describe('chromeLaunchOptions', () => {
  it.each([true, false])('não marca o Chrome como automatizado (headless=%s): Google e Meta bloqueiam o login', (headless) => {
    const options = chromeLaunchOptions({ headless })
    expect(options.ignoreDefaultArgs).toContain('--enable-automation')
    expect(options.args).toContain('--disable-blink-features=AutomationControlled')
  })

  it('usa o Chrome instalado, sem baixar downloads', () => {
    expect(chromeLaunchOptions({ headless: true })).toMatchObject({ channel: 'chrome', headless: true, acceptDownloads: false })
  })

  it.each([true, false])('mantém o sandbox do Chrome ligado (headless=%s): sem --no-sandbox, que a Cloudflare da OLX usa p/ barrar', (headless) => {
    const options = chromeLaunchOptions({ headless })
    expect(options.chromiumSandbox).toBe(true)
    expect(options.args).not.toContain('--no-sandbox')
  })

  it('a janela visível usa o tamanho real e abre minimizada só quando pedido', () => {
    const visible = chromeLaunchOptions({ headless: false })
    expect(visible).toMatchObject({ headless: false, viewport: null, locale: 'pt-BR' })
    expect(visible.args).not.toContain('--start-minimized')
    expect(chromeLaunchOptions({ headless: false, minimized: true }).args).toContain('--start-minimized')
  })
})
