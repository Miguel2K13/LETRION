'use strict';

const express = require('express');
const path = require('node:path');
const fs = require('node:fs/promises');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_MB = Number(process.env.MAX_BODY_MB || 8);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'banco de dados.txt');
const TMP_FILE = path.join(DATA_DIR, 'banco de dados.tmp');

app.disable('x-powered-by');
app.use(express.json({ limit: `${MAX_BODY_MB}mb` }));

let writeQueue = Promise.resolve();

function now() { return Date.now(); }
function cleanId(value, fallback = '') {
  return String(value ?? fallback).replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 160);
}

function emptyDatabase() {
  return {
    version: 1,
    app: 'LETRION',
    updatedAt: now(),
    devices: {},
    users: {},
    userDatabase: {},
    stateMeta: {}
  };
}

async function readDatabase() {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : emptyDatabase();
  } catch (error) {
    if (error.code === 'ENOENT') return emptyDatabase();
    throw error;
  }
}

async function atomicWriteDatabase(database) {
  const text = JSON.stringify(database, null, 2);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_FILE, text, 'utf8');
  await fs.rename(TMP_FILE, DB_FILE);
}

function enqueueDatabaseWrite(mutator) {
  writeQueue = writeQueue.then(async () => {
    const database = await readDatabase();
    await mutator(database);
    database.updatedAt = now();
    await atomicWriteDatabase(database);
  });
  return writeQueue;
}

function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return null;
  const copy = { ...user };
  delete copy.password;
  delete copy.senha;
  delete copy.token;
  delete copy.authToken;
  return copy;
}

function extractUsers(payload) {
  const state = payload?.data?.data || payload?.data || {};
  return Array.isArray(state.users) ? state.users : [];
}

function extractUserDatabase(payload) {
  const state = payload?.data?.data || payload?.data || {};
  return state.userDatabase && typeof state.userDatabase === 'object' ? state.userDatabase : {};
}

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, app: 'LETRION', time: now() });
});

app.post('/api/sync', async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object' || !payload.data) {
      return res.status(400).json({ ok: false, error: 'Payload inválido.' });
    }

    const deviceId = cleanId(payload.deviceId, `device-${now()}`);
    const clientUpdatedAt = Number(payload.clientUpdatedAt || now());
    const users = extractUsers(payload);
    const userDatabase = extractUserDatabase(payload);

    await enqueueDatabaseWrite(async database => {
      database.devices ||= {};
      database.users ||= {};
      database.userDatabase ||= {};
      database.stateMeta ||= {};

      database.devices[deviceId] = {
        updatedAt: clientUpdatedAt,
        receivedAt: now(),
        appVersion: String(payload.version || '')
      };

      for (const rawUser of users) {
        const user = sanitizeUser(rawUser);
        if (!user?.id) continue;
        const id = cleanId(user.id);
        const previous = database.users[id];
        const previousUpdated = Number(previous?.updatedAt || 0);
        if (!previous || clientUpdatedAt >= previousUpdated) {
          database.users[id] = { ...user, updatedAt: clientUpdatedAt };
        }
      }

      for (const [rawId, rawRecord] of Object.entries(userDatabase)) {
        const id = cleanId(rawId);
        if (!id || !rawRecord || typeof rawRecord !== 'object') continue;
        const record = sanitizeUser(rawRecord);
        const previous = database.userDatabase[id];
        const previousUpdated = Number(previous?.atualizadoEm || previous?.updatedAt || 0);
        if (!previous || clientUpdatedAt >= previousUpdated) {
          database.userDatabase[id] = { ...record, atualizadoEm: clientUpdatedAt };
        }
      }

      database.stateMeta[deviceId] = {
        clientUpdatedAt,
        receivedAt: now(),
        version: String(payload.version || ''),
        userCount: users.length
      };
    });

    res.json({ ok: true, deviceId, savedAt: now(), usersReceived: users.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/database/meta', async (_req, res, next) => {
  try {
    const db = await readDatabase();
    res.json({
      ok: true,
      updatedAt: db.updatedAt || 0,
      users: Object.keys(db.users || {}).length,
      devices: Object.keys(db.devices || {}).length
    });
  } catch (error) { next(error); }
});

app.use(express.static(PUBLIC_DIR));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  next();
});

app.use((error, _req, res, _next) => {
  console.error('[LETRION API]', error);
  res.status(500).json({ ok: false, error: 'Erro interno do servidor.' });
});

(async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(DB_FILE); }
  catch { await atomicWriteDatabase(emptyDatabase()); }
  app.listen(PORT, () => console.log(`LETRION disponível em http://localhost:${PORT}`));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
