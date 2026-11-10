# 📡 Radar Revenda

App desktop (Windows) que varre o **Facebook Marketplace**, identifica o produto de cada anúncio com IA,
pesquisa o preço de mercado (Mercado Livre, OLX, Marketplace) e calcula se **vale a pena comprar para revender** —
com lucro estimado por canal, nota de oportunidade e alertas de risco.

> Foco inicial: **eletrônicos** (celulares, consoles, notebooks, peças de PC), com suporte a outras
> categorias de alta liquidez (ferramentas elétricas, foto/vídeo, instrumentos, eletroportáteis de marca).

## ✨ Funcionalidades (planejadas)

- **Varredura automática** de buscas salvas (termo, raio em km, preço máximo, intervalo) via Playwright,
  com ritmo "humano" para proteger a conta.
- **Identificação com IA** (Gemini): modelo exato, capacidade, estado e sinais de golpe a partir do título,
  descrição e fotos.
- **Pesquisa de preços** em Mercado Livre, OLX e no próprio Marketplace (mediana de novos e usados).
- **Cálculo de lucro por canal** (taxas configuráveis de cada plataforma + custos extras).
- **Painel de oportunidades** ordenado por lucro, com nota 0–10, comparativo de preços e link do anúncio.
- **Caçador de anúncios subvalorizados**: palavras como "urgente"/"mudança", títulos com erro de digitação,
  anúncios recém-postados.
- **Histórico** de compras e vendas com lucro real.
- **Notificações do Windows** quando aparecer uma oferta acima do lucro mínimo.

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| App desktop | Electron + React + TypeScript (Vite) |
| Automação | Playwright (Chrome com perfil próprio do app) |
| IA | Google Gemini API (`@google/genai`) |
| Banco local | SQLite |
| Instalador | electron-builder (.exe) |

## 🗺️ Roadmap

- [ ] **Etapa 1** — Esqueleto do app + login no Facebook pela janela do Playwright
- [ ] **Etapa 2** — Varredura de uma busca e listagem dos anúncios
- [ ] **Etapa 3** — IA + pesquisa de preços + cálculo de lucro
- [ ] **Etapa 4** — Painel completo, nota, alertas e notificações
- [ ] **Etapa 5** — Histórico de compras/vendas + instalador .exe

Detalhes em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## ⚠️ Aviso

O Facebook Marketplace não possui API pública e a automação pode violar os Termos de Uso da Meta.
O app usa limites conservadores (intervalos aleatórios, poucos anúncios por rodada, pausa em verificações),
mas **o risco de restrição da conta não é zero**. Use por sua conta e risco. Uso pessoal.

## 🚀 Desenvolvimento

> Instruções serão adicionadas na Etapa 1.

```bash
cp .env.example .env   # preencha GEMINI_API_KEY
npm install
npm run dev
```
