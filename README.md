# 📡 Radar Revenda

App desktop (Windows) que varre **Facebook Marketplace, OLX, Enjoei, Mercado Livre e Shopee**, identifica o
produto de cada anúncio com IA, compara com o preço de mercado (incluindo o Buscapé para preço de novo) e calcula se
**vale a pena comprar para revender** — com lucro estimado por canal, nota de oportunidade e alertas de risco.

> Foco inicial: **eletrônicos** (celulares, consoles, notebooks, peças de PC), com suporte a outras
> categorias de alta liquidez (ferramentas elétricas, foto/vídeo, instrumentos, eletroportáteis de marca).

## ✨ Funcionalidades

- **Contas conectadas** (aba Configurações): login manual em cada plataforma numa janela do Chrome do app;
  a senha nunca passa pelo app e a sessão pode ser apagada a qualquer momento.

- **Varredura automática** de buscas salvas (termo, raio em km, preço máximo, intervalo) via Playwright,
  com ritmo "humano" para proteger a conta.
- **Identificação com IA** (Gemini): modelo exato, capacidade, estado e sinais de golpe a partir do título,
  descrição e fotos.
- **Pesquisa de preços** em Mercado Livre, OLX, Enjoei, Shopee, Marketplace e Buscapé (mediana de novos e usados).
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

- [x] **Etapa 1** — App base + aba Configurações com contas conectadas (Facebook, Mercado Livre, OLX, Enjoei, Shopee)
- [ ] **Etapa 2** — Varredura de buscas nas plataformas e listagem dos anúncios
- [ ] **Etapa 3** — IA + pesquisa de preços + cálculo de lucro
- [ ] **Etapa 4** — Painel completo, nota, alertas e notificações
- [ ] **Etapa 5** — Histórico de compras/vendas + instalador .exe

Detalhes em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## ⚠️ Aviso

O Facebook Marketplace não possui API pública e a automação pode violar os Termos de Uso da Meta.
O app usa limites conservadores (intervalos aleatórios, poucos anúncios por rodada, pausa em verificações),
mas **o risco de restrição da conta não é zero**. Use por sua conta e risco. Uso pessoal.

## 🔌 Plataformas

| Plataforma | Busca ofertas | Preço de referência | Revenda | Conta |
|---|:-:|:-:|:-:|---|
| Facebook Marketplace | ✅ | ✅ | ✅ | Obrigatória (login detectado automaticamente) |
| Mercado Livre | ✅ | ✅ | ✅ | Opcional |
| OLX | ✅ | ✅ | ✅ | Opcional |
| Enjoei | ✅ | ✅ | ✅ | Opcional |
| Shopee | ✅ | ✅ | ✅ | Opcional |
| Buscapé | — | ✅ | — | Não precisa |

Nas plataformas opcionais você confirma o login ("Já entrei") depois de entrar na janela do Chrome.

## 🚀 Desenvolvimento

Requisitos: Node 20+ e Google Chrome instalado.

```bash
npm install
npm run dev        # abre o app em modo desenvolvimento
npm test           # testes unitários (Vitest)
npm run typecheck  # checagem de tipos
npm run build      # build de produção em out/
```

Os dados locais (perfil do navegador com as sessões e `accounts.json`) ficam em `%APPDATA%\radar-revenda`,
nunca no repositório.
