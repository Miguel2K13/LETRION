# LETRION — notas de setup

## O que é este repositório

Aplicativo LETRION em **um único arquivo HTML autocontido**:
`LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html` (~8 MB, CSS/JS inline).

- Sem build, sem `package.json`, sem dependências instaláveis.
- Dados do aluno ficam em `localStorage` (a fila de sincronização `LessonDB.flush(apiBase)` é um protótipo e não é chamada com URL).
- O arquivo referencia `imagems/letrion-mascote.png` (com fallback para `imagens/...`); nenhuma das duas pastas existe no repositório, então a imagem do mascote aparece quebrada.

## Rodar no sandbox

```bash
docker compose -f docker-compose.base44.yml up -d
curl -I http://localhost:3000/
```

`web` (nginx:alpine) serve o HTML montado como `index.html` na porta 3000, com gzip ligado.
Alterações no HTML aparecem ao recarregar; não há dev server nem rebuild.

## Ponto de atenção antes de publicar

O HTML contém uma **chave de API do Google AI Studio em texto puro** (constante `API_KEY`, usada em `generativelanguage.googleapis.com`) e variáveis `OR_KEY` / `OR_LEXI_KEY` para OpenRouter.
Qualquer deploy público deste arquivo expõe essas credenciais a quem abrir o código-fonte, e a chave pode ser usada/abusada por terceiros. Antes de publicar, a chave deve ser revogada/rotacionada e as chamadas de IA devem passar por um backend que guarde a chave em variável de ambiente.

## Estado do deploy

Não há configuração de deploy no repositório (sem Dockerfile de produção, sem workflow de CI/CD, sem config de Vercel/Netlify/Pages).
