#!/usr/bin/env node
/**
 * Gera `www/` — o pacote publicado do LETRION (Google Play / App Store / site).
 *
 * O app é um único HTML autocontido, então este script:
 *   1. copia o HTML para `www/index.html`;
 *   2. zera as chaves de IA embutidas (`OR_KEY`, `OR_LEXI_KEY`, `API_KEY`);
 *   3. injeta `publish/store-runtime.js`, que desliga a Lexi e bloqueia as chamadas de IA;
 *   4. confere que nenhuma chave sobrou no pacote — o build falha se sobrar.
 *
 * Uso: node scripts/build-store.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html');
const RUNTIME = path.join(ROOT, 'publish', 'store-runtime.js');
const OUT_DIR = path.join(ROOT, 'www');

const KEY_CONSTANTS = ['OR_KEY', 'OR_LEXI_KEY', 'API_KEY'];

function fail(message) {
  console.error('[build-store] ERRO: ' + message);
  process.exit(1);
}

const sizeMB = (bytes) => (bytes / 1048576).toFixed(1) + ' MB';

if (!fs.existsSync(SOURCE)) fail('arquivo do app não encontrado: ' + path.basename(SOURCE));
if (!fs.existsSync(RUNTIME)) fail('runtime não encontrado: publish/store-runtime.js');

let html = fs.readFileSync(SOURCE, 'utf8');
const sourceSize = html.length;

// 1) zera as chaves, guardando os valores originais para conferir no final
const removedKeys = [];
let stripped = 0;
for (const name of KEY_CONSTANTS) {
  const declaration = new RegExp('(\\b' + name + '\\s*=\\s*")[^"]*(")', 'g');
  html = html.replace(declaration, (_match, before, after) => {
    const value = _match.slice(before.length, _match.length - after.length);
    if (value) removedKeys.push(value);
    stripped++;
    return before + after;
  });
}
if (stripped !== KEY_CONSTANTS.length) {
  fail('esperava zerar ' + KEY_CONSTANTS.length + ' chaves, zerei ' + stripped + ' — o HTML do app mudou?');
}

// 2) injeta o runtime da versão publicada
if (!html.includes('</body>')) fail('não encontrei </body> no HTML para injetar o runtime');
html = html.replace('</body>', '<script src="./store-runtime.js"></script>\n</body>');

// 3) conferências: nenhuma chave pode ter sobrado
for (const name of KEY_CONSTANTS) {
  if (!new RegExp('\\b' + name + '\\s*=\\s*""').test(html)) fail(name + ' não ficou vazio no pacote');
}
for (const secret of removedKeys) {
  if (html.includes(secret)) fail('uma chave removida ainda aparece no pacote');
}
if (!html.includes('store-runtime.js')) fail('index.html sem referência ao store-runtime.js');

// 4) escreve www/
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
fs.copyFileSync(RUNTIME, path.join(OUT_DIR, 'store-runtime.js'));

const runtimeOut = fs.readFileSync(path.join(OUT_DIR, 'store-runtime.js'), 'utf8');
if (!runtimeOut.includes('LETRION_STORE_BUILD')) fail('runtime sem a flag LETRION_STORE_BUILD');

console.log('[build-store] www/ pronto para publicar');
console.log('  index.html        ' + sizeMB(fs.statSync(path.join(OUT_DIR, 'index.html')).size) + ' (fonte: ' + sizeMB(sourceSize) + ')');
console.log('  store-runtime.js  presente');
console.log('  chaves zeradas:   ' + KEY_CONSTANTS.join(', ') + ' (' + removedKeys.length + ' valores removidos)');
console.log('  Lexi:             desligada — nenhuma chamada de IA sai do pacote');
