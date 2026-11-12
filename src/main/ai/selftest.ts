/**
 * Diagnóstico da IA, rodado só com a flag --ai-selftest. Dispara chamadas controladas ao Gemini
 * (trivial, só texto, texto+schema, com imagem) e grava o resultado num arquivo, para descobrir
 * por que a análise falha (sobrecarga real, peso da imagem, schema, modelo). Não entra na varredura.
 */
import { writeFileSync } from 'node:fs'
import { createGenAI, FALLBACK_MODEL, INSTRUCTIONS, RESPONSE_JSON_SCHEMA } from './gemini'

/** JPEG 1x1 válido, para testar o caminho multimodal sem baixar foto. */
const TINY_JPEG =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wgARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQAAAAH/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k='

const SAMPLE_TEXT = `<anuncio>
Plataforma: olx
Título: iPhone 12 Pro Max 128 GB
Preço: R$ 1900
Descrição completa do anúncio:
iPhone 12 Pro Max 128GB, usado, com pequena trinca no canto da tela que não atrapalha o uso.
Bateria em 82%. Acompanha caixa e cabo. Face ID funcionando. Sem detalhes na traseira.
</anuncio>`

interface StepResult {
  readonly label: string
  readonly model: string
  readonly ms: number
  readonly outcome: string
}

type Ai = ReturnType<typeof createGenAI>

async function runStep(ai: Ai, label: string, model: string, params: Record<string, unknown>): Promise<StepResult> {
  const started = Date.now()
  try {
    const r = await ai.models.generateContent({ ...params, model } as never)
    const text = (r as { text?: string }).text ?? ''
    return { label, model, ms: Date.now() - started, outcome: `OK (${text.length} chars)` }
  } catch (error) {
    const status = (error as { status?: number }).status ?? '—'
    const message = (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').slice(0, 120)
    return { label, model, ms: Date.now() - started, outcome: `ERRO status=${status} ${message}` }
  }
}

const fullConfig = {
  systemInstruction: INSTRUCTIONS,
  responseMimeType: 'application/json',
  responseJsonSchema: RESPONSE_JSON_SCHEMA,
  temperature: 0.1
}

const textParts = [{ text: SAMPLE_TEXT }]
const imageParts = [{ text: SAMPLE_TEXT }, { inlineData: { mimeType: 'image/jpeg', data: TINY_JPEG } }]

export async function runAiSelftest(key: string | null, model: string, outPath: string): Promise<void> {
  const lines: string[] = [`Diagnóstico IA — modelo configurado: ${model} — ${new Date().toISOString()}`]
  if (!key) {
    writeFileSync(outPath, lines.concat('SEM CHAVE do Gemini salva em Configurações.').join('\n'))
    return
  }
  lines.push(`Chave: OK (${key.length} chars, não exibida)\n`)
  const ai = createGenAI(key)

  const steps: StepResult[] = []
  steps.push(await runStep(ai, 'A trivial (sem schema/imagem)', model, { contents: 'Responda apenas: ok' }))
  steps.push(await runStep(ai, 'B só texto + schema', model, { contents: [{ role: 'user', parts: textParts }], config: fullConfig }))
  steps.push(await runStep(ai, 'C texto + imagem + schema', model, { contents: [{ role: 'user', parts: imageParts }], config: fullConfig }))
  steps.push(
    await runStep(ai, 'D só texto, JSON sem schema', model, {
      contents: [{ role: 'user', parts: textParts }],
      config: { systemInstruction: INSTRUCTIONS, responseMimeType: 'application/json', temperature: 0.1 }
    })
  )
  steps.push(await runStep(ai, 'E só texto + schema (modelo reserva)', FALLBACK_MODEL, { contents: [{ role: 'user', parts: textParts }], config: fullConfig }))
  steps.push(await runStep(ai, 'F trivial (modelo reserva)', FALLBACK_MODEL, { contents: 'Responda apenas: ok' }))

  for (const s of steps) lines.push(`${s.label} [${s.model}]: ${s.ms}ms → ${s.outcome}`)
  writeFileSync(outPath, lines.join('\n'))
}
