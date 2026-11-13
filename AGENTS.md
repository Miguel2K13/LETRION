# LETRION — notas de setup

## O que é este repositório

Aplicativo LETRION em **um único arquivo HTML autocontido**:
`LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html` (~8 MB, CSS/JS inline).

- Sem build de aplicação, sem `package.json`, sem dependências instaláveis.
- Dados do aluno ficam em `localStorage` (a fila de sincronização `LessonDB.flush(apiBase)` é um protótipo e não é chamada com URL).
- O arquivo referencia `imagems/letrion-mascote.png` (com fallback para `imagens/...`); nenhuma das duas pastas existe nesta branch, então a imagem do mascote aparece quebrada (o console mostra dois erros de imagem; é pré-existente, não é erro de código).

## Rodar no sandbox

```bash
docker compose -f docker-compose.base44.yml up -d
curl -I http://localhost:3000/
```

`web` (nginx:alpine) monta o **repositório inteiro** em `/site` e serve o HTML pelo `docker/nginx.conf` (config nginx completa, com gzip).

Importante: o mount é do diretório, não do arquivo. Montar o arquivo isolado prende o container ao inode antigo e edições (`sed -i`, editores que salvam por rename) deixam de aparecer. Com o diretório montado, basta recarregar para ver a alteração.

## Recursos de IA

As chaves de API foram **removidas** do HTML para permitir deploy público (`OR_KEY`, `OR_LEXI_KEY` e `API_KEY` agora são strings vazias):

- A Lexi (chat) mostra "A Lexi está desativada nesta versão publicada do LETRION." e não faz chamada de rede.
- `LEXI LESSON ENGINE` (`generateCurrent`) retorna `null` sem chave e o banco de lições pré-preparado continua em uso.
- `lexiStartLesson` mostra um aviso em vez de tentar a chamada.

Para reativar a IA sem expor credenciais, as chamadas precisam sair do navegador e passar por um backend que guarde as chaves em variável de ambiente.

## Deploy (Netlify)

`netlify.toml` define:

- build: `sh scripts/build-site.sh` — copia o HTML para `dist/index.html`;
- publish: `dist` (`dist/` está no `.gitignore`);
- redirect `/* → /index.html` (200), porque o app é uma única página.

Passos: Netlify → _Add new site → Import an existing project_ → GitHub → repositório `LETRION` → branch a publicar → Build command e publish directory vêm do `netlify.toml`.

Não há Dockerfile de produção nem workflow de CI/CD.
