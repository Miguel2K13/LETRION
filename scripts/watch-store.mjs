#!/usr/bin/env node
/**
 * Mantém `www/` em dia: reconstrói o pacote publicado sempre que o app muda.
 *
 * O link público (`/loja/`) serve `www/`, que é **gerado**. Sem este serviço, uma
 * alteração no HTML só apareceria no link depois de rodar o build na mão.
 *
 * Uso: node scripts/watch-store.mjs   (é o serviço `store-watcher` do compose)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUILD = path.join(ROOT, 'scripts', 'build-store.mjs');
const HEARTBEAT = '/tmp/watch-store.heartbeat';

const WATCHED = [
  path.join(ROOT, 'LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html'),
  path.join(ROOT, 'publish', 'store-runtime.js'),
  path.join(ROOT, 'imagens'),
].filter((target) => fs.existsSync(target));

let building = false;
let pending = false;

function build(reason) {
  if (building) {
    pending = true; // uma alteração durante o build vira um novo build no fim
    return;
  }
  building = true;
  console.log('[watch-store] ' + reason + ' mudou — reconstruindo www/');
  const child = spawn(process.execPath, [BUILD], { stdio: 'inherit' });
  child.on('exit', (code) => {
    building = false;
    console.log('[watch-store] build terminou (código ' + code + ')');
    if (pending) {
      pending = false;
      build('alteração durante o build');
    }
  });
}

// sinal de vida para o healthcheck do compose
const beat = () => fs.writeFileSync(HEARTBEAT, String(Math.floor(Date.now() / 1000)));
beat();
setInterval(beat, 15000);

// o bind mount não entrega eventos de forma confiável no container: polling de 1s
for (const target of WATCHED) {
  fs.watchFile(target, { interval: 1000 }, () => build(path.relative(ROOT, target)));
}

console.log('[watch-store] vigiando: ' + WATCHED.map((p) => path.relative(ROOT, p)).join(', '));
