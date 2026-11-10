import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Um arquivo JSON local com leitura validada e escrita atômica (grava em .tmp e renomeia).
 * Conteúdo ausente ou corrompido vira o valor padrão em vez de derrubar o app.
 */
export class JsonFile<T> {
  constructor(
    private readonly path: string,
    private readonly parse: (raw: unknown) => T,
    private readonly fallback: () => T
  ) {}

  read(): T {
    try {
      return this.parse(JSON.parse(readFileSync(this.path, 'utf8')))
    } catch {
      return this.fallback()
    }
  }

  write(value: T): void {
    mkdirSync(dirname(this.path), { recursive: true })
    const tmpPath = `${this.path}.tmp`
    writeFileSync(tmpPath, JSON.stringify(value), 'utf8')
    renameSync(tmpPath, this.path)
  }

  update(change: (current: T) => T): T {
    const next = change(this.read())
    this.write(next)
    return next
  }
}
