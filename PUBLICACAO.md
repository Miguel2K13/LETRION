# Publicar o LETRION na Google Play e na App Store

O LETRION é um **app web de arquivo único** (um HTML autocontido). As lojas não
aceitam sites — elas exigem um pacote nativo (`.aab` no Android, `.ipa` no iPhone).
Este repositório usa o **Capacitor** para embrulhar esse mesmo HTML em um app
Android e um app iOS, sem reescrever o app.

O fluxo é sempre:

```
npm run build:store   ->  www/ (versão publicada)
npx cap sync          ->  copia www/ para dentro dos projetos nativos
Android Studio / Xcode ->  gera o pacote assinado
Play Console / App Store Connect ->  envia para revisão
```

## O que é a "versão publicada"

`npm run build:store` gera a pasta `www/` (fora do Git) a partir do HTML do app:

- **zera as chaves de IA** (`OR_KEY`, `OR_LEXI_KEY`, `API_KEY`) — nenhum segredo vai no pacote;
- injeta `publish/store-runtime.js`, que bloqueia chamadas para os serviços de IA e **esconde a Lexi**;
- falha o build se alguma chave sobrar.

O banco de lições pré-preparado continua inteiro: aluno, missões, jornada e
correção funcionam normalmente offline. Só a Lexi (chat) e a geração de novas
lições por IA ficam de fora — foi a escolha feita para não distribuir a chave.

## 1. Preparar o pacote

```bash
npm install
npm run build:store      # cria www/ com o app publicado
```

## 2. Android + Google Play

**O que você precisa**

- Conta de desenvolvedor no Google Play: **US$ 25, pagamento único**.
- JDK 17 e Android Studio (Android SDK 35 ou mais novo).

**Passos**

```bash
npm run add:android      # cria a pasta android/ (uma vez)
npx cap sync android     # depois de cada build:store
npx cap open android     # abre o Android Studio
```

1. No Android Studio: **Build → Generate Signed App Bundle / APK → Android App Bundle**.
2. Escolha o módulo `app` e **Create new…** keystore. Guarde o arquivo `.jks` e as
   senhas fora do repositório: **sem essa chave você não consegue publicar
   atualizações do app**.
3. Gere o `.aab` em modo **release**.
4. Na [Play Console](https://play.google.com/console): **Criar app** → preencha a
   ficha (nome, descrição curta e longa, ícone 512×512, imagem de destaque
   1024×500, ao menos 2 capturas de tela de celular) → **Política de privacidade**
   (precisa de uma URL pública) → **Segurança dos dados** → **Classificação de
   conteúdo** → **Público-alvo**.
5. Suba primeiro em **Teste interno** — é o caminho mais rápido para validar o
   pacote antes de mandar para produção.

> Público escolar: se o app for usado por menores de 13 anos, leia a política
> **Famílias** do Google Play (restrições de anúncios, consentimento dos pais e
> regras extras de conteúdo). Escolha a faixa etária com honestidade.

## 3. iPhone/iPad + App Store

**O que você precisa**

- Um **Mac** com o Xcode atualizado (o `.ipa` não é gerado em outro sistema).
- **Apple Developer Program: US$ 99 por ano**.

**Passos**

```bash
npm run add:ios          # cria a pasta ios/ (uma vez, no Mac)
npx cap sync ios
npx cap open ios         # abre o Xcode
```

1. No Xcode: target **App** → **Signing & Capabilities** → selecione sua equipe e
   confirme o bundle identifier (`com.letrion.app`).
2. **Product → Archive** → **Distribute App → App Store Connect**.
3. No [App Store Connect](https://appstoreconnect.apple.com): crie o app, preencha
   as informações e envie a build pelo **TestFlight**.
4. Na revisão, a Apple recusa apps que são "apenas um site" (guideline 4.2).
   Deixe claro na **Nota para o revisor** que o app tem currículo e banco de
   lições próprios e funciona **offline**, sem depender de navegador.

> O `appId` (`com.letrion.app`) não pode ser trocado depois da primeira
> publicação. Se você já tem um identificador próprio, ajuste em
> `capacitor.config.json` **antes** do primeiro envio.

## 4. Ícone

`resources/icon.svg` é a marca do app. Exporte como PNG 1024×1024 para
`resources/icon.png` e rode:

```bash
npm run assets           # gera todos os tamanhos de Android e iOS
```

Android Studio e Xcode também aceitam configurar o ícone manualmente.

## 5. Hospedagem gratuita (site/versão web)

Para os apps de loja o site **não é obrigatório** — o Capacitor embute o app
dentro do pacote. Mas, se você quiser um link público (para divulgar ou para os
alunos instalarem direto pelo celular), três opções gratuitas servem bem um site
estático:

| Opção | Como | Observação |
| --- | --- | --- |
| **Netlify Drop** | Arraste a pasta `www/` em <https://app.netlify.com/drop> | Mais simples: publica na hora, com HTTPS e domínio grátis |
| **Cloudflare Pages** | Conecte o repositório e use a pasta de saída `www` | Deploy automático a cada push, com domínio próprio |
| **GitHub Pages** | Publique a pasta `www/` na branch `gh-pages` | 8,4 MB está bem dentro do limite de 1 GB |

Use sempre a pasta `www/` (a versão publicada): ela já sai sem chaves e sem Lexi.

### Link rápido, sem hospedar nada

Enquanto este workspace estiver de pé, o app já responde publicamente no endereço do
workspace (`https://3000-<BASE44_PUBLIC_HOST_SUFFIX>`), servido pelo nginx:

- **compartilhe `…/loja/`** — é a versão publicada (sem chaves, sem Lexi);
- **nunca compartilhe o endereço sem `/loja/`** — a raiz `/` é a versão de
  desenvolvimento e tem as chaves de IA dentro do HTML.

Esse endereço é de desenvolvimento: vale para testar com algumas pessoas agora e
muda quando o ambiente é recriado. Para um link fixo e definitivo, use uma das
opções da tabela acima (o Netlify Drop leva ~2 minutos).

## 6. Se quiser ligar a Lexi depois

Coloque a IA em um **servidor seu** (que guarda a chave e responde ao app via
API) e mantenha o pacote distribuído sem nenhuma credencial. Nunca devolva a
chave para dentro do HTML: qualquer pessoa que instalar o app consegue extraí-la.

## Checklist rápido

- [ ] `npm run build:store` sem erro
- [ ] Keystore `.jks` guardado fora do Git
- [ ] Ícone 1024×1024 e capturas de tela prontos
- [ ] Política de privacidade com URL pública
- [ ] Faixa etária / política Famílias preenchida
- [ ] Teste interno (Android) ou TestFlight (iOS) aprovado
