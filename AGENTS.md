# LETRION — notas de ambiente

## Como o app roda aqui

- O repositório inteiro é **um único arquivo HTML autocontido** na raiz
  (`LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html`). Não há build,
  bundler, package.json nem banco: o estado é salvo em `localStorage`
  (chave `letrion_v1`).
- `docker-compose.base44.yml` sobe `nginx:alpine` e publica esse arquivo em
  `http://localhost:3000/` via bind mount (`base44/nginx.conf` serve o arquivo
  como `index.html`). Editar o HTML e recarregar já mostra a mudança; não é
  preciso reconstruir nada.

## Como testar telas internas

- O app começa na tela de acesso. As contas demo do seed (`aluno`/`aluno123`)
  podem ter sido removidas pelo estado salvo no navegador; o caminho confiável é
  criar uma conta pela aba **Criar conta**, que já entra no app.
- A primeira entrada mostra um modal “Cadastro concluído” — feche com
  `[data-action="close-modal"]` antes de olhar as telas.

## Particularidades conhecidas (pré-existentes)

- A imagem `imagens/letrion-mascote.png` não existe no repositório: o
  `onerror` troca por `imagems/...` e também falha (404 inofensivo, só afeta a
  tela de acesso).
- O console registra `refreshLetrionContext is not defined` em alguns cliques
  (camadas v11/v12). Não impede navegação nem renderização.
- Muitas camadas de CSS foram anexadas ao arquivo ao longo das versões
  (`lexi-*`, `letrion-nav-v3-fix`, `letrion-v11-ux`, `letrion-v12-*`). Para
  mudanças visuais, a camada final `#letrion-ui-polish` (CSS) e o script
  `#letrion-ui-motion` no fim do arquivo vencem a cascata — prefira ajustar ali
  em vez de editar blocos antigos.
- `applyTheme()` fixa o tema em `navy`; os outros temas existentes não são
  aplicados.

## Verificação rápida

```bash
docker compose -f docker-compose.base44.yml up -d
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # 200
```
