# LETRION — servidor de sincronização

Estrutura:

- `server.js`: API Express e gravação atômica do banco.
- `public/index.html`: aplicação.
- `public/style.css`: estilos.
- `public/script.js`: lógica e sincronização automática.
- `data/banco de dados.txt`: banco em JSON dentro de um arquivo `.txt`.

## Instalação

Requer Node.js 20+.

```bash
npm install
npm start
```

Depois abra `http://localhost:3000`.

Quando o LETRION é servido pelo próprio Express, `script.js` usa automaticamente a mesma origem para `/api/sync`. Não é necessário o usuário selecionar o arquivo do banco.

## Como funciona

1. O navegador continua usando `localStorage` para funcionamento offline.
2. `saveData()` agenda uma sincronização automática.
3. O cliente envia um snapshot sanitizado para `POST /api/sync`.
4. O servidor grava os dados em `data/banco de dados.txt`.
5. Uma fila de escrita evita duas gravações concorrentes no mesmo arquivo.
6. Senhas não são gravadas pelo endpoint de sincronização.
7. Quando a conexão cai, os dados continuam no `localStorage`; ao voltar online, uma nova sincronização é tentada.

## Importante para produção

Este servidor é uma camada de sincronização para o projeto atual. Autenticação, autorização, hash de senha, HTTPS, rate limiting e um banco de dados real devem ser adicionados antes de uso público em escala. O arquivo `.txt` é adequado como armazenamento simples/backup, não como banco concorrente de produção.
