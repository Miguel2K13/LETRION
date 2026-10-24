# AGENTS.md — LETRION

Notas de setup que não estão óbvias nos arquivos do projeto.

## O que é este app

Um **único arquivo HTML autocontido**
(`LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html`, ~8,4 MB) com todo o
CSS e o JavaScript do app. **Não há bundler nem dev server**: edite o HTML direto e
chame `reload_preview` para ver a mudança (não existe hot reload).

As contas e o progresso são de demonstração e ficam no `localStorage` do navegador:
`aluno/aluno123`, `admin/admin123`, `profana/ana123`, `profcaio/caio123`,
`profluiza/luiza123`.

## Como o app roda aqui

```bash
docker compose -f docker-compose.base44.yml up -d --build
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/         # 200 — app (HTML fonte)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/loja/    # 200 — pacote publicado
```

- `build-store` — serviço de uma vez só (`node scripts/build-store.mjs`) que gera `www/`.
- `web` — nginx (`nginx.base44.conf`) na porta **3000**: `/` serve o HTML fonte,
  `/loja/` serve o pacote publicado de `www/`.

Não é preciso `BASE44_PREVIEW_MODE`: o app não tem allowlist de host/origin (o nginx
aceita qualquer `Host`) e nenhum código do app é condicionado a essa flag.

## Versão publicada (lojas)

`npm run build:store` copia o HTML para `www/index.html`, **zera as chaves de IA**
(`OR_KEY`, `OR_LEXI_KEY`, `API_KEY`) e injeta `publish/store-runtime.js`, que bloqueia
chamadas a `openrouter.ai` / `generativelanguage.googleapis.com` e esconde a Lexi
(esconde `.lexi-navBtn` / `[data-action="open-lexi"]`, que são os três acessos à Lexi).
O script **falha** se alguma chave sobrar no pacote. `www/` é gerado e está no
`.gitignore` — o pacote publicado se reconstrói com um comando. As imagens de
`imagens/` (o mascote da tela de entrada) são copiadas para `www/imagens/`; sem isso
o pacote publicado pediria uma imagem que não existe.

A geração de lição por IA degrada bem: `generateCurrent()` já envolve a chamada em
`try/catch` e mantém o banco de lições pré-preparado (60 lições), que é o que o app
usa por padrão. Com a IA bloqueada o app continua completo, só sem a Lexi.

Passo a passo de publicação (Play Console, App Store, ícones, hospedagem grátis):
`PUBLICACAO.md`. Empacotamento nativo: `capacitor.config.json` + scripts do
`package.json` (webDir `www`).

## Chaves de IA

Estão **dentro do HTML** e servem só ao ambiente de desenvolvimento. O pacote de loja
zera as três — nunca distribuir um pacote com chave embutida.
