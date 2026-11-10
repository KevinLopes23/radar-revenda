# Arquitetura

## Fluxo

```
Busca salva ──► Varredura (Playwright) ──► Anúncio bruto ──► Identificação (Claude)
                                                                   │
        Painel ◄── Oportunidade (nota + lucro) ◄── Cálculo ◄── Pesquisa de preços
                                                              (ML · OLX · Marketplace)
```

## Processos (Electron)

- **Main**: janela, banco SQLite, agendador de varreduras, Playwright, chamadas à IA e às fontes de preço.
  Toda chave de API e todo acesso à rede ficam aqui.
- **Preload**: ponte IPC tipada e mínima (`contextIsolation: true`, `nodeIntegration: false`).
- **Renderer**: React (telas: Varredura, Oportunidades, Detalhe, Histórico, Configurações).

## Módulos (main)

| Módulo | Responsabilidade |
|---|---|
| `scanner/` | Abre o Marketplace com perfil persistente, executa buscas, extrai anúncios, respeita limites |
| `ai/` | Normaliza o anúncio em produto estruturado (modelo, variante, estado, riscos) |
| `pricing/` | Fontes de preço (uma por plataforma) atrás de uma interface comum |
| `analysis/` | Mediana de mercado, preço sugerido, lucro por canal, nota 0–10 |
| `db/` | Repositórios SQLite (buscas, anúncios, cotações, oportunidades, histórico) |

## Proteção da conta

- Perfil de navegador próprio do app; login manual uma única vez (senha nunca é armazenada pelo app).
- Navegador visível, atrasos aleatórios, limite de anúncios por rodada, intervalo mínimo entre varreduras.
- Pausa automática ao detectar checkpoint/captcha.

## Cálculo de lucro

```
lucro_canal = preço_revenda_sugerido × (1 − taxa_%) − taxa_fixa − frete − preço_pedido − custos_extras
```

Taxas por canal são configuráveis (Marketplace, OLX, Mercado Livre).
