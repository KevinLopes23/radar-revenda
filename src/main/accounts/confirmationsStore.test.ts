import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfirmationsStore, parseConfirmations } from './confirmationsStore'

const ISO = '2026-11-10T22:00:00.000Z'

describe('parseConfirmations', () => {
  it('keeps valid platform ids with ISO dates', () => {
    expect(parseConfirmations({ olx: ISO, enjoei: ISO })).toEqual({ olx: ISO, enjoei: ISO })
  })

  it('drops unknown platforms and invalid dates', () => {
    expect(parseConfirmations({ olx: ISO, hacker: ISO, enjoei: 'ontem', shopee: 42 })).toEqual({ olx: ISO })
  })

  it.each([null, undefined, 'texto', 42, [ISO]])('returns empty object for non-object input %s', (raw) => {
    expect(parseConfirmations(raw)).toEqual({})
  })
})

describe('ConfirmationsStore', () => {
  let dir = ''

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  const makeStore = (): { store: ConfirmationsStore; file: string } => {
    dir = mkdtempSync(join(tmpdir(), 'radar-store-'))
    const file = join(dir, 'accounts.json')
    return { store: new ConfirmationsStore(file), file }
  }

  it('returns empty confirmations when the file does not exist', () => {
    const { store } = makeStore()
    expect(store.load()).toEqual({})
  })

  it('persists and reloads confirmations', () => {
    const { store, file } = makeStore()
    store.save({ olx: ISO })
    expect(new ConfirmationsStore(file).load()).toEqual({ olx: ISO })
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ olx: ISO })
  })

  it('returns empty confirmations when the file is corrupted', () => {
    const { store, file } = makeStore()
    writeFileSync(file, '{ not json')
    expect(store.load()).toEqual({})
  })
})
