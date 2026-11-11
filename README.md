# 🏷️ Achadão

**Seu achadão do dia.** App desktop (Windows) que varre **Facebook Marketplace, OLX, Enjoei, Mercado Livre e Shopee**, identifica o
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
- **Alertas de risco**: preço bom demais (possível golpe), defeito/bloqueio (iCloud, "não liga", "para peças"),
  réplica/sem nota, poucos anúncios para comparar — e sinal positivo quando o vendedor tem pressa ("urgente", "mudança").
- **Histórico** de compras e vendas com lucro real.
- **Notificações do Windows** quando aparece uma oportunidade acima da nota mínima.

## 📖 Como usar

1. **Configurações** → conecte o Facebook (obrigatório para o Marketplace) e, se quiser, as outras contas.
   Cole a chave do Gemini (grátis em aistudio.google.com/apikey) e confira as taxas de cada canal.
2. **Varredura** → "+ Nova busca" (ex.: `iphone 13`, de R$ 800 a R$ 2.000, nas plataformas que quiser) → "Rodar agora".
   Ative a varredura automática em Configurações para rodar sozinho a cada X minutos.
3. **Oportunidades** → cards ordenados pela nota. "Detalhes" mostra o lucro por canal, os anúncios usados na
   comparação e os alertas. "Comprei" manda para o Histórico.
4. **Histórico** → quando vender, clique em "Vendi" para registrar o lucro real.

### Como a nota (0–10) é calculada

- Preço de mercado = mediana dos anúncios **do mesmo modelo** (mesmo número, capacidade e variante; cores ignoradas;
  acessórios e outliers descartados). Sem usados para comparar, usa 70% do preço de novo do Buscapé.
- Lucro por canal = preço de mercado − desconto para vender rápido − comissão − taxa fixa − frete − preço pedido − custo extra.
- Nota = margem (até 6) + lucro absoluto (até 2) + confiança na comparação (até 2) − riscos.

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| App desktop | Electron + React + TypeScript (electron-vite), animações em CSS, fontes Unbounded + Inter embutidas |
| Automação | Playwright (`playwright-core`) usando o Google Chrome instalado, com perfil próprio do app |
| IA | Google Gemini API (`@google/genai`), modelo configurável (padrão `gemini-flash-latest`) |
| Dados locais | Arquivos JSON validados com zod (`%APPDATA%\radar-revenda`) |
| Instalador | electron-builder (NSIS .exe) |

## 🗺️ Roadmap

- [x] **Etapa 1** — App base + aba Configurações com contas conectadas
- [x] **Etapa 2** — Varredura de buscas nas plataformas (com ritmo humano e detecção de bloqueio)
- [x] **Etapa 3** — IA (Gemini) + pesquisa de preços + cálculo de lucro por canal
- [x] **Etapa 4** — Painel de oportunidades, nota, alertas e notificações
- [x] **Etapa 5** — Histórico de compras/vendas + instalador .exe

## 🧪 Limitações conhecidas

- Sites mudam o layout com frequência; a leitura é genérica (links de anúncio + preço), mas pode precisar de ajuste.
- Mercado Livre, OLX e Shopee às vezes pedem login/verificação anti-robô. O app avisa no log da varredura;
  basta abrir a plataforma em Configurações e resolver a verificação uma vez.
- Sem chave do Gemini, a identificação do produto é feita só pelo título (menos precisa).

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
npm run dist       # gera o instalador em release/Achadao-Setup-<versão>.exe
```

Os dados locais (perfil do navegador com as sessões, buscas, oportunidades, histórico e a chave do Gemini
criptografada pelo Windows) ficam em `%APPDATA%\radar-revenda` (modo dev) ou `%APPDATA%\Radar Revenda`
(app instalado), nunca no repositório.
