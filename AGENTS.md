# AGENTS.md — LETRION

Notas de setup que não estão óbvias nos arquivos do projeto.

## O que é este app

Um **único arquivo HTML autocontido** (`LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html`,
~6,7 MB) com todo o CSS e o JavaScript do app. **Não há build nem bundler**: toda edição de
interface é feita direto nesse arquivo e passa a valer no próximo carregamento da página
(não há hot reload — depois de editar, recarregue o preview).

Desde a migração de backend, o app também conversa com uma **API própria** (`server/`,
Node/Express + Postgres) que guarda contas, senhas (hash bcrypt), sessões, progresso e o
banco de lições. O `localStorage` continua sendo usado como cache local do app.

## Como o app roda aqui

```bash
docker compose -f docker-compose.base44.yml up -d --build
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/          # 200
curl -s http://localhost:3000/api/health                                 # {"ok":true,...}
```

Serviços:

- `web` — nginx (`nginx.base44.conf`) na porta **3000** do host: serve o HTML e faz proxy de
  `/api/` para `api:3000`. É o único ponto de entrada público (cookie de sessão same-origin).
- `api` — Express (`server/src/index.js`) com `node --watch`; bind mount de `server/` e
  `node_modules` em volume.
- `setup` — serviço de uma vez só: `npm ci`/`npm install` + `db/migrate.mjs` + `db/seed.mjs`
  (importa as 960 séries do HTML para a tabela `lessons`). Sai quando termina; a `api` espera
  por ele com `service_completed_successfully`.
- `db` — Postgres 16 (volume `db_data`).

## Contas e sessão

O `seed` cria contas de demonstração com senha **hasheada** (bcrypt) — as mesmas credenciais
que antes ficavam soltas no HTML: `aluno/aluno123`, `admin/admin123`, `profana/ana123`,
`profcaio/caio123`, `profluiza/luiza123`. O seed nunca sobrescreve senha já existente; para
trocar use:

```bash
docker compose -f docker-compose.base44.yml exec -T api \
  node db/set-password.mjs <usuario> <nova-senha> --confirm
```

`GET /api/auth/me` responde **sempre 200** (`{user:null}` para visitante anônimo) — é assim que
o app descobre se há sessão sem gerar erro no console do navegador. Os demais endpoints de
usuário (`/api/me`, `/api/me/state`, `/api/me/progress`, `/api/ai/*`) exigem sessão e
respondem 401 quando não há.

## Chaves de IA (Lexi)

As chaves **não ficam mais no HTML** (a constante `OR_KEY` foi removida). A `api` lê
`OPENROUTER_API_KEY` (rota `/api/ai/lesson`) e `GOOGLE_API_KEY` (rota `/api/ai/stream`) do
`env_file /run/base44/app.env`; sem elas a Lexi responde 503 e o resto do app funciona
normalmente. Cadastre as chaves na página de segredos da plataforma — não coloque valores em
`docker-compose.base44.yml` nem em `.env.base44-defaults`.

## Banco de questões (`LETRION_BANK`)

O conteúdo das lições é um **literal JavaScript gigante** dentro de um `<script>`:

```js
const LETRION_BANK = [ /* 960 séries × 8 questões = 7680 questões */ ];
```

Estrutura: cada série tem `id, type, year, bim, level, contents, questions`; cada questão tem
`id ("Q0001"...), passage, prompt, options[{text, correct}], answer ("A".."D"), contentId,
habilidadeBNCC`. O app carrega o banco por `loadLetrionBank()`: tenta `GET /api/lessons` (dados
do Postgres) e, se a API não responder, usa o literal embutido como reserva
(`letrionActiveBank`).

Ao mexer no banco:

- Como é uma linha com ~6 MB, **não edite com find/replace de texto** — leia o arquivo em Python,
  faça `json.loads` do trecho entre `const LETRION_BANK = ` e `];`, altere a estrutura, e escreva de
  volta com `json.dumps(..., ensure_ascii=False, separators=(',',':'))`.
- Mantenha `id`, `type`, `year`, `bim`, `level`, `contents` das séries e a sequência `Q0001..Q7680`
  (o app usa `id` em `structureId` e nas chaves de armazenamento).
- Os `contentId` são as **8 etiquetas canônicas de conteúdo por ano/bimestre**; cada série traz
  exatamente as 8, uma por questão (a ordem gira por série). Em dois conjuntos a etiqueta combina
  duas entradas de `contents` (`substantivo, adjetivo e artigo` e `estatutos, leis e regimentos`).
- Validação obrigatória depois de gerar: 960 séries × 8 questões, ids sequenciais, uma única
  alternativa correta por questão, `answer` coerente com `correct`, sem opções repetidas na mesma
  questão, e `passage` única em todo o banco.
- `node --check` em cada bloco `<script>` é a forma rápida de garantir que o arquivo continua válido
  (os scripts usam APIs do navegador, mas o parse é suficiente).
- Depois de mudar o banco, rode o `setup` de novo (`docker compose -f docker-compose.base44.yml
  up -d setup`) para reimportar as lições: o seed compara o hash do banco e só reescreve quando
  ele muda.

## Pontos de atenção

- `applyTheme()` força o tema `navy`; as melhorias de legibilidade ficam no último `<style>`
  (`id="letrion-readability"`), acrescentado ao final do documento para vencer as regras anteriores.
- **`assets/letrion-mascote.svg`**: só comentários XML (`<!-- -->`) podem vir antes de `<svg>`.
  Linhas de comentário com `#` (como em shell) deixam o arquivo inválido e o navegador recusa a
  imagem (`Failed to load img ...`), mesmo com HTTP 200.
- `/favicon.ico` é servido pelo nginx a partir do mesmo SVG.
- O `web` faz proxy de `/api/` usando `resolver 127.0.0.11` + variável: sem isso o nginx guarda o
  IP antigo quando a `api` é recriada.
