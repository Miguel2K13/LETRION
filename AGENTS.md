# LETRION — notas de ambiente (Base44)

## Como rodar aqui

```bash
docker compose -f docker-compose.base44.yml up -d     # http://localhost:3000
docker compose -f docker-compose.base44.yml logs -f web
```

O serviço `web` roda o **código do repositório** (`node:22` + `npm install` +
`node --watch server.js`), com o checkout montado em `/app`. Editar
`server.js` reinicia o servidor automaticamente; editar `public/*` é servido
direto (sem build). `node_modules` fica num volume nomeado.

## Estrutura esperada pelo servidor

`server.js` usa caminhos fixos a partir da raiz do repo:

- estáticos: `public/` (é o único diretório exposto por HTTP)
- banco: `data/banco de dados.txt` (criado automaticamente se não existir)

O README documenta essa mesma estrutura. No primeiro import os arquivos
estavam soltos na raiz (`index.html`, `style.css`, `banco de dados.txt`) — um
upload "achatado" pelo GitHub. Eles foram movidos para `public/` e `data/`
para o servidor conseguir servi-los.

## Pendência conhecida

`public/index.html` carrega `script.js`, mas **esse arquivo não existe no
repositório** (nem nenhum outro `.js` além do `server.js`), e a ilustração do
login (`loginMascot` em `style.css`) também está ausente. Sem `script.js` a
div `#root` fica vazia: a página carrega (HTTP 200) mas não renderiza a
interface. O fallback do Express devolve `index.html` para qualquer GET não
`/api/`, então `GET /script.js` responde 200 com HTML em vez de 404 — o
navegador apenas registra erro de sintaxe.

## Verificação

```bash
curl -s http://localhost:3000/api/health          # {"ok":true,"app":"LETRION",...}
curl -s http://localhost:3000/api/database/meta   # contagens do banco
```

`POST /api/sync` recebe o snapshot do cliente e grava o banco; senhas são
removidas antes da gravação (ver `sanitizeUser`).

## Secrets

Nenhum. Não há serviço externo: o "banco" é o arquivo JSON em `data/`.
