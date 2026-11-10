# Arquitetura

## Fluxo de uma rodada de varredura

```
Busca salva ─► para cada plataforma marcada ─► aba do Chrome do app ─► cards (link + preço) ─► Listing
                                                                                             │
        Buscapé (preço de novo, cache 24 h) ─────────────────────────────────────────────────┤
                                                                                             ▼
   Anúncios novos ─► Gemini (texto + foto) ─► produto/estado/riscos ─► comparáveis do mesmo modelo
                                                                                             │
   Oportunidade (nota 0–10, lucro por canal, alertas) ◄── mediana de mercado ◄───────────────┘
        │
        └─► opportunities.json ─► tela Oportunidades + notificação do Windows (nota ≥ mínima)
```

## Processos (Electron)

- **Main**: janela, Playwright, agendador, IA, arquivos de dados. Toda chave e todo acesso à rede ficam aqui.
- **Preload**: ponte IPC tipada (`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`).
- **Renderer**: React (Início, Varredura, Oportunidades, Histórico, Configurações).
- **Shared**: contrato IPC (`ipc.ts`), tipos de domínio (`types.ts`) e catálogo de plataformas (`platforms.ts`).

## Módulos (src/main)

| Módulo | Responsabilidade |
|---|---|
| `accounts/` | `BrowserManager` (dono único do Chrome com perfil persistente, operações serializadas), `AccountsService` (status de cada conta), detecção de login por cookie |
| `scan/` | `sources.ts` (URL de busca, padrão de link de anúncio, detecção de bloqueio por plataforma), `pageScraper.ts` (leitura genérica de cards com ritmo humano), `extract.ts` (texto do card → `Listing`), `scanService.ts` (orquestra a rodada e o agendamento) |
| `analysis/` | Funções puras: normalização e comparação de títulos, mediana/outliers, lucro por canal, nota e alertas; `analyzer.ts` junta tudo |
| `ai/` | Cliente do Gemini com saída JSON validada (zod) e download seguro da foto |
| `data/` | Validação (zod) de entrada do IPC e dos arquivos; repositórios JSON (buscas, oportunidades, compras, cache de preço) |
| `settings/` | Configurações e chave do Gemini criptografada com `safeStorage` (DPAPI do Windows) |
| `ipc/` | Registro dos handlers IPC com validação de toda entrada vinda do renderer |
| `store/` | `JsonFile`: leitura validada e escrita atômica |

## Proteção da conta

- Perfil de navegador próprio do app; login manual (a senha nunca passa pelo app).
- Chrome real e visível (minimizado durante a varredura), pausas aleatórias, rolagem gradual,
  limite de anúncios por plataforma e intervalo mínimo de 30 min na varredura automática.
- Ao detectar login, checkpoint ou verificação anti-robô, a plataforma é pulada e o motivo aparece no log.

## Cálculo

```
preço_mercado = mediana(anúncios do mesmo modelo, sem outliers)   # sem usados: 70% do preço de novo
venda         = preço_mercado × (1 − desconto_venda_rápida)
lucro_canal   = venda − venda × comissão% − taxa_fixa − frete − preço_pedido − custo_extra
nota          = margem (≤6) + lucro absoluto (≤2) + confiança (≤2) − riscos
```
