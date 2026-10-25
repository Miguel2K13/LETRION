# LETRION — notas para quem for mexer neste repositório

## O que é
Aplicativo de página única (SPA) em **um único arquivo**: `index.html`
(HTML + CSS + JS embutidos, dados em `localStorage`, sem build e sem backend).
O jogo **Duck Adventure** vive em `games/duck-adventure/` e é carregado por
`<script src>` clássicos (funciona também abrindo o arquivo direto, sem servidor).

## Como rodar no sandbox Base44
```bash
docker compose -f docker-compose.base44.yml up -d      # http://localhost:3000
docker compose -f docker-compose.base44.yml logs -f web
```
* O serviço `web` é um `nginx:alpine` **servindo o próprio repositório montado**
  (nenhuma imagem de aplicação é construída) — editar `index.html` ou o jogo
  aparece ao recarregar a página; use `reload_preview` porque não há live reload.
* `base44/nginx.conf` existe por dois motivos: desligar cache do preview e
  rodar o worker do nginx como root (a raiz do sandbox é `0700`, o usuário
  `nginx` não consegue atravessá-la). O repositório é montado somente leitura.
* `location = /health` responde `ok` e é usado pelo healthcheck do Compose.

## Pegadinhas do arquivo (importante)
* `index.html` é **em camadas**: o arquivo recebeu várias sessões de patches.
  Vence sempre a **última** definição da função. Hoje são efetivas:
  `function appLayout` e `function render` da segunda definição, e
  `window.renderHome` do bloco `<script id="letrion-v11-routes">`.
  Ao mudar uma tela, confirme qual definição está valendo (procure a última).
* O bloco `<style id="letrion-v11-ux">` veio **sem `</style>`** do arquivo
  original e engolia as tags seguintes como texto CSS. Ele foi fechado
  explicitamente; se você inserir marcação perto dele, confira o fechamento.
* O aluno de demonstração (`student_demo`) é apagado de propósito
  (`removeDemoStudentV8`). Para testar telas de aluno, **crie uma conta**
  pela própria tela de login (aba "Criar conta").
* O mascote do login é um **SVG pixel art embutido no próprio HTML** (inline, sem
  arquivo nem requisição). Não há imagens no repositório: apontar o mascote para
  qualquer `src` externo (como o antigo `imagems/letrion-mascote.png`) volta a
  produzir 404 no console.
* A Lexi (assistente de chat, motor de lições com IA, voz e tela de boot) foi
  **removida por completo** em 25/10/2026 — não há mais chaves de API no
  repositório. O lugar dela na navegação agora é o botão **Jogos**.

## Duck Adventure (games/duck-adventure/)
Módulos, na ordem em que `index.html` os carrega:
`da-core.js` (física/entrada/áudio) · `da-art.js` (sprites pixel art e fonte) ·
`da-world.js` (tiles, cenários em camadas e vegetação) · `da-levels.js`
(5 mundos × 2 fases, descritos de forma declarativa) ·
`duck-adventure.js` (motor, estados, telas e controles).

* A rota `games` (bloco `<script id="letrion-games-route">`) mostra o **catálogo
  de jogos** (`GAMES_CATALOG`): `renderGames(el,u)` só desenha os cartões e
  **não** monta jogo nenhum — por isso o menu Jogos não tem controles. Para
  publicar outro jogo basta acrescentar um item em `GAMES_CATALOG` e o `id`
  correspondente em `openGame()`.
* `openGame(id)` cria `#letrionGameHost.gameFull` no `<body>`: tela cheia, com o
  botão **SAIR** fixo no canto superior direito (`.gameExit` → `closeGame()`,
  que chama `DA.Game.unmount()` e remove o host). O jogo monta em `#daStage`,
  que é o próprio `.gameFullStage`. Os controles de toque (`.da-pad`) só existem
  enquanto o jogo está montado, dentro da interface do jogo.
* Com o jogo aberto o `<body>` recebe `.gameOpen`, que esconde a interface do app
  (`body.gameOpen .app{visibility:hidden}`) e trava o scroll. É necessário porque
  o menu inferior usa `z-index:9990 !important` e ficaria por cima do jogo.
* Duck Adventure é horizontal (canvas 16:9): o quadro `.gameFullStage` ocupa a
  tela toda e o jogo fica centralizado, com a tela na horizontal mesmo com o
  aparelho em pé, e os controles embaixo. **Nada de girar o quadro 90°** — a
  versão anterior rotacionava em `orientation:portrait` e o resultado era um
  jogo deitado, com os botões do menu ilegíveis, exigindo virar o aparelho.
  Com o aparelho deitado o quadro é 100vw×100vh e o canvas sobe para múltiplos
  maiores. `resize()` mede o `.da-view` com `offsetWidth/offsetHeight`
  (medida de layout).
* O quadro em tela cheia não muda o escalonamento da pixel art: o canvas segue
  em múltiplos inteiros de 320×180, então em tela estreita o jogo fica no tamanho
  nativo com faixa escura em volta.
* O motor se **desmonta sozinho** se o `#daStage` sair do DOM, parando loop e música.
* Save em `localStorage` (`LETRION_DUCK_ADVENTURE_V1`): fases liberadas,
  recordes e configurações de som/controles.
* Todo quadro de animação é um par `{R, L}` produzido por `both()`. `Art.duck.idle`
  é uma **lista** de dois quadros (o motor usa `duck.idle[Math.floor(anim*2)%2]`);
  `land` e `stomp` também são listas de pares. Passar um `{c,g}` cru de `sheet()`
  para `both()`/`mirror()` derruba o jogo na inicialização e a tela mostra
  "Não foi possível carregar o jogo neste aparelho".
* `DA.Input.attach()` é idempotente e `detach()` remove os listeners de teclado —
  sem isso, qualquer tecla fora do jogo lança TypeError na tela seguinte.
* O estado interno do jogo é exposto em `DA.Game._state` (`player.x`, `player.state`,
  `time`, `objects`): é por aí que se verifica uma fase sem depender de pixels.
* Controles: setas ou A/D, Espaço para pular, S/seta para baixo para mergulhar,
  Esc para pausar; no toque, os botões grandes embaixo do quadro.
* Nada de imagens externas: todos os sprites, tiles e cenários são desenhados
  pixel por pixel em canvas de 1x e ampliados com escalonamento inteiro.

## Como verificar (não existe suíte de testes)
1. Abra `http://localhost:3000`, crie uma conta de aluno.
2. Tela inicial: precisa mostrar o cartão **MISSÃO DE HOJE** com XP/Letrins.
3. Menu inferior: **Jogos** (ocupou o lugar da Lexi) → catálogo de jogos (sem
   controles) → JOGAR abre Duck Adventure em tela cheia, com **SAIR** no canto
   superior direito → JOGAR dentro do jogo → a fase começa; anda, pula, abre
   caixa por baixo, pega fruta, nada, derrota jacaré por cima; Esc pausa.
4. Console do navegador sem erros.
5. Em tela larga a barra superior só oferece **JOGOS**, som, notificações e o chip
   de perfil; o menu inferior (Início/Jornada/Jogos/...) aparece abaixo de 980px.
   Isso vem do arquivo original, não da versão Base44 — ao testar rotas no desktop,
   navegue pelo chip de perfil ou reduza a janela.
