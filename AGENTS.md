# LETRION — notas de desenvolvimento (sandbox Base44)

## O que é

Não há build, backend nem dependências. O app é **um único arquivo HTML** na raiz do
repositório (`LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html`) com CSS,
JavaScript e banco de aulas embutidos. Todo o estado (usuários, turmas, progresso) fica
em `localStorage` (chave `letrion_v1`); não existe API.

## Como rodar

```bash
docker compose -f docker-compose.base44.yml up -d
```

O serviço `web` (porta 3000) roda um servidor estático definido dentro do próprio
`docker-compose.base44.yml`. Ele lê os arquivos por requisição, então **qualquer edição
no HTML aparece ao recarregar**, sem rebuild. `GET /` devolve o arquivo do app e as
rotas sem extensão também caem nele; arquivos que não existem (por exemplo um `.png`
ausente) devolvem 404 de verdade — de propósito, para não esconder erro de conteúdo.

Verificação rápida: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`

## Convenções que valem saber

- O HTML tem vários blocos `<script>`, cada um dentro de uma IIFE. **Nada é global por
  acidente**: o que um bloco precisa usar de outro deve ser atribuído a `window`
  (`window.openLexi`, `window.sendLexiMessage`, `window.refreshLetrionContext`, …).
  Referência "solta" a uma função de outro bloco só aparece em tempo de execução, e
  dentro de um `MutationObserver` o erro é lançado depois do `try/catch`, aparecendo
  como `Uncaught ReferenceError` no console.
- Não há suíte de testes. A verificação é abrir o app na porta 3000 e olhar o console.

## Pendência de conteúdo conhecida

A tela de login referencia uma imagem que **nunca existiu em nenhum commit** deste
repositório: `imagems/letrion-mascote.png`, com fallback para `imagens/letrion-mascote.png`.
Os dois caminhos retornam 404 e por isso o console acusa dois erros de rede ao abrir o
app. Enquanto o arquivo não for enviado para o repositório (ou a referência removida),
esse 404 continua. Enviar o arquivo para `imagens/letrion-mascote.png` já resolve.
