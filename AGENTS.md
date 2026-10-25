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
* A tela de login pede `imagems/letrion-mascote.png` (e `imagens/...`): esses
  arquivos não existem no repositório, então o console mostra 404 no login.
* A Lexi (assistente de chat, motor de lições com IA, voz e tela de boot) foi
  **removida por completo** em 25/10/2026 — não há mais chaves de API no
  repositório. O lugar dela na navegação agora é o botão **Jogos**.

## Duck Adventure (games/duck-adventure/)
Módulos, na ordem em que `index.html` os carrega:
`da-core.js` (física/entrada/áudio) · `da-art.js` (sprites pixel art e fonte) ·
`da-world.js` (tiles, cenários em camadas e vegetação) · `da-levels.js`
(5 mundos × 2 fases, descritos de forma declarativa) ·
`duck-adventure.js` (motor, estados, telas e controles).

* A rota `games` chama `renderGames(el,u)` (bloco
  `<script id="letrion-games-route">`), que monta o jogo em `#daStage` com
  `DA.Game.mount()`. O motor se **desmonta sozinho** quando o `#daStage` sai do
  DOM (troca de rota), parando o loop e a música.
* Save em `localStorage` (`LETRION_DUCK_ADVENTURE_V1`): fases liberadas,
  recordes e configurações de som/controles.
* Controles: setas ou A/D, Espaço para pular, S/seta para baixo para mergulhar,
  Esc para pausar; no toque, os botões grandes embaixo do quadro.
* Nada de imagens externas: todos os sprites, tiles e cenários são desenhados
  pixel por pixel em canvas de 1x e ampliados com escalonamento inteiro.

## Como verificar (não existe suíte de testes)
1. Abra `http://localhost:3000`, crie uma conta de aluno.
2. Tela inicial: precisa mostrar o cartão **MISSÃO DE HOJE** com XP/Letrins.
3. Menu inferior: **Jogos** (ocupou o lugar da Lexi) → Duck Adventure →
   JOGAR → a fase começa; anda, pula, abre caixa por baixo, pega fruta,
   nada, derrota jacaré por cima; Esc pausa; sair da rota para a música.
4. Console do navegador sem erros (exceto o 404 do mascote descrito acima).
