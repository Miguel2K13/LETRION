# LETRION — notas de desenvolvimento (sandbox Base44)

## O que é

Não há build, backend nem dependências. O app é **um único arquivo HTML** na raiz do
repositório (`LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html`) com CSS,
JavaScript e banco de aulas embutidos. Todo o estado (usuários, turmas, progresso) fica
em `localStorage` (chave `letrion_v1`); não existe API.

Assets estáticos (hoje só a arte do mascote do login, em `imagens/`) vivem em pastas
normais ao lado do HTML e são servidos pelo mesmo servidor estático.

## Como rodar

```bash
docker compose -f docker-compose.base44.yml up -d
```

O serviço `web` (porta 3000) roda um servidor estático definido dentro do próprio
`docker-compose.base44.yml`. Ele lê os arquivos por requisição, então **qualquer edição
no HTML ou troca de imagem aparece ao recarregar**, sem rebuild. `GET /` devolve o
arquivo do app e as rotas sem extensão também caem nele; arquivos que não existem (por
exemplo um `.png` ausente) devolvem 404 de verdade — de propósito, para não esconder
erro de conteúdo.

Verificação rápida: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`

## Convenções que valem saber

- O HTML tem vários blocos `<script>`, cada um dentro de uma IIFE. **Nada é global por
  acidente**: o que um bloco precisa usar de outro deve ser atribuído a `window`
  (`window.openLexi`, `window.sendLexiMessage`, `window.refreshLetrionContext`, …).
  Referência "solta" a uma função de outro bloco só aparece em tempo de execução, e
  dentro de um `MutationObserver` o erro é lançado depois do `try/catch`, aparecendo
  como `Uncaught ReferenceError` no console.
- Não há suíte de testes. A verificação é abrir o app na porta 3000 e olhar o console.

## Arte do login

A tela de login (função `renderAuth`) exibe a arte do mascote com
`src="imagens/letrion-mascote.png"` dentro de `<div class="authVisual">`. O arquivo é
`imagens/letrion-mascote.png` (PNG 1024×1536, RGBA) e é versionado no repositório.

Dois detalhes importantes da CSS (`.loginMascot`, `@media (max-width:980px)`):

- a imagem usa `mix-blend-mode:screen`, ou seja, é desenhada sobre o gradiente roxo do
  painel esquerdo: fundo preto/escuro da arte some e o mascote fica integrado;
- em telas estreitas (o preview abre em ~506px) o layout vira uma coluna, `.authVisual`
  fica com `min-height:350px` e o mascote é reduzido para 245px de largura,
  deslocado para a direita (`right:-18px;bottom:-24px;opacity:.92`).

Trocar a arte = substituir `imagens/letrion-mascote.png` mantendo o mesmo nome; não é
preciso mexer no HTML.
