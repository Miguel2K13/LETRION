# AGENTS.md — LETRION

Notas de setup que não estão óbvias nos arquivos do projeto.

## O que é este app

Um **único arquivo HTML autocontido** (`LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html`,
~6,7 MB) com todo o CSS e o JavaScript embutidos. Não há build, bundler, backend nem banco
de dados: o CSS/JS do app, a persistência (`localStorage`) e o conteúdo das lições vivem nesse
arquivo. Portanto **toda edição é feita direto nele** e passa a valer no próximo carregamento da
página.

## Como o app roda aqui

`docker-compose.base44.yml` sobe um nginx que serve o repositório montado (`:ro`) na porta 3000
do host, com `nginx.base44.conf` definindo o arquivo HTML como `index`. Não há hot reload — depois
de editar, é preciso recarregar a página no preview.

```bash
docker compose -f docker-compose.base44.yml up -d
curl -s http://localhost:3000/ | head -c 200
```

## Banco de questões (`LETRION_BANK`)

O conteúdo das lições é um **literal JavaScript gigante** dentro de um `<script>`:

```js
const LETRION_BANK = [ /* 960 séries × 8 questões = 7680 questões */ ];
```

Estrutura: cada série tem `id, type, year, bim, level, contents, questions`; cada questão tem
`id ("Q0001"...), passage, prompt, options[{text, correct}], answer ("A".."D"), contentId,
habilidadeBNCC`. O app usa esse array em `loadLetrionBank()`, `bankLessonsForUser(u)` (filtra por
`year` + `bimestre`), `makeBankLessonRecord()` e no pacote diário (`createDailyPackage`).

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

## Pontos de atenção

- `applyTheme()` força o tema `navy`; as melhorias de legibilidade ficam no último `<style>`
  (`id="letrion-readability"`), acrescentado ao final do documento para vencer as regras anteriores.
- O arquivo contém **uma chave da OpenRouter embutida em texto claro** (constante `OR_KEY` no script
  "LEXI LESSON ENGINE"). Ela é visível para qualquer visitante da página e deve ser trocada por uma
  chave própria, restrita e rotacionada antes de uso público.
- O bloco de busca é feito no cliente (as chaves são públicas por natureza): não há nada a proteger
  no servidor, por isso o compose não declara segredos.
