import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const PORT = Number(process.env.PORT || 3000);
const COOKIE_NAME = 'letrion_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const OPENROUTER_MODEL = (process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini').trim();
const GOOGLE_API_KEY = (process.env.GOOGLE_API_KEY || '').trim();
const GOOGLE_MODEL = (process.env.GOOGLE_MODEL || 'gemini-2.5-flash-lite').trim();

/* Campos de identidade e permissão que nunca entram no blob de progresso
   nem são aceitos vindos do cliente (evita autopromoção a professor/admin). */
const STATE_BLOCKLIST = new Set([
  'id', 'username', 'password', 'senha', 'passwordhash', 'password_hash',
  'role', 'papel', 'schoolid', 'classid', 'isbot'
]);

/* Campos de perfil que o próprio usuário pode atualizar. */
const PROFILE_FIELDS = {
  name: 'name',
  schoolname: 'school_name',
  year: 'year',
  bimestre: 'bimestre',
  period: 'period',
  classid: 'class_id',
  classletter: 'class_letter'
};

/* Comparação com hash sempre executada, mesmo quando o usuário não existe. */
const DUMMY_HASH = bcrypt.hashSync('letrion-placeholder-password', BCRYPT_ROUNDS);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '16mb' }));
app.use(cookieParser());

/* ---------- utilidades ---------- */

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    schoolId: row.school_id || '',
    schoolName: row.school_name || '',
    year: row.year || '',
    bimestre: row.bimestre || '',
    period: row.period || '',
    classId: row.class_id || '',
    classLetter: row.class_letter || '',
    isBot: row.is_bot === true
  };
}

/* Limite simples de tentativas de login por usuário+IP. */
const attempts = new Map();
const THROTTLE_WINDOW_MS = 10 * 60 * 1000;
const THROTTLE_MAX = 8;

function throttled(key) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.until) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= THROTTLE_MAX;
}

function noteFailure(key) {
  const now = Date.now();
  const entry = attempts.get(key) ?? { count: 0, until: now };
  entry.count += 1;
  entry.until = now + THROTTLE_WINDOW_MS;
  attempts.set(key, entry);
}

async function openSession(userId, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1,$2,$3)`,
    [sha256(token), userId, expiresAt]
  );
  await pool.query(`DELETE FROM sessions WHERE expires_at < now()`);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: SESSION_TTL_MS,
    path: '/'
  });
  return token;
}

async function closeSession(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: { message: 'Entre na sua conta para continuar.' } });
    const { rows } = await pool.query(
      `SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1`,
      [sha256(token)]
    );
    const row = rows[0];
    if (!row) return res.status(401).json({ error: { message: 'Sessão não encontrada. Entre novamente.' } });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.status(401).json({ error: { message: 'Sessão expirada. Entre novamente.' } });
    }
    req.userRow = row;
    return next();
  } catch (error) {
    return next(error);
  }
}

/* ---------- saúde ---------- */

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'up', time: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'down', error: { message: String(error.message || error) } });
  }
});

/* ---------- contas ---------- */

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = clean(body.name, 120);
    const username = clean(body.username, 40);
    const password = String(body.password || '');
    if (!name || !username || !password) {
      return res.status(400).json({ error: { message: 'Informe nome, nome de usuário e senha.' } });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: { message: 'O nome de usuário precisa ter pelo menos 3 caracteres.' } });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: { message: 'A senha precisa ter pelo menos 4 caracteres.' } });
    }
    const existing = await pool.query('SELECT 1 FROM users WHERE lower(username) = lower($1)', [username]);
    if (existing.rowCount) {
      return res.status(409).json({ error: { message: 'Escolha outro nome de usuário.' } });
    }

    const id = `u${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO users (id, username, name, role, school_id, school_name, year, bimestre, period, class_id, class_letter)
         VALUES ($1,$2,$3,'student',$4,$5,$6,$7,$8,$9,$10)`,
        [
          id, username, name,
          clean(body.schoolId, 60) || null, clean(body.school, 160) || null,
          clean(body.year, 10) || null, clean(body.period, 10) || null, clean(body.period, 10) || null,
          clean(body.classId, 60) || null, clean(body.classLetter, 2) || null
        ]
      );
      await client.query('INSERT INTO user_credentials (user_id, password_hash) VALUES ($1,$2)', [id, hash]);
      await client.query(`INSERT INTO user_state (user_id, data) VALUES ($1,'{}'::jsonb)`, [id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    await openSession(id, res);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.status(201).json({ user: publicUser(rows[0]) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const username = clean(req.body?.username, 60);
    const password = String(req.body?.password || '');
    if (!username || !password) {
      return res.status(400).json({ error: { message: 'Informe usuário e senha.' } });
    }
    const key = `${username.toLowerCase()}|${req.ip || 'local'}`;
    if (throttled(key)) {
      return res.status(429).json({ error: { message: 'Muitas tentativas. Aguarde alguns minutos.' } });
    }
    const { rows } = await pool.query(
      `SELECT u.*, c.password_hash FROM users u JOIN user_credentials c ON c.user_id = u.id
       WHERE lower(u.username) = lower($1)`,
      [username]
    );
    const row = rows[0];
    const matches = await bcrypt.compare(password, row?.password_hash || DUMMY_HASH);
    if (!row || !matches) {
      noteFailure(key);
      return res.status(401).json({ error: { message: 'Nome de usuário ou senha incorretos.' } });
    }
    attempts.delete(key);
    await openSession(row.id, res);
    return res.json({ user: publicUser(row) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', async (req, res, next) => {
  try {
    await closeSession(req, res);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/* Sessão atual. Responde SEMPRE 200: visitante sem sessão recebe `user: null`,
   então o app descobre se há login sem deixar erro no console do navegador. */
app.get('/api/auth/me', async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.json({ user: null });
    const { rows } = await pool.query(
      `SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1`,
      [sha256(token)]
    );
    const row = rows[0];
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      if (row) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.json({ user: null });
    }
    return res.json({ user: publicUser(row) });
  } catch (error) {
    return next(error);
  }
});

/* ---------- progresso do usuário ---------- */

app.get('/api/me/state', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT data FROM user_state WHERE user_id = $1', [req.userRow.id]);
    return res.json({ state: rows[0]?.data || {} });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/me', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const incoming = body.state && typeof body.state === 'object' ? body.state : {};
    const state = {};
    for (const [key, value] of Object.entries(incoming)) {
      if (!STATE_BLOCKLIST.has(key.toLowerCase())) state[key] = value;
    }

    const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
    const updates = [];
    const values = [req.userRow.id];
    for (const [key, column] of Object.entries(PROFILE_FIELDS)) {
      if (!(key in profile)) continue;
      values.push(clean(profile[key], 160) || null);
      updates.push(`${column} = $${values.length}`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO user_state (user_id, data, updated_at) VALUES ($1,$2::jsonb,now())
         ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [req.userRow.id, JSON.stringify(state)]
      );
      if (updates.length) {
        await client.query(
          `UPDATE users SET ${updates.join(', ')}, updated_at = now() WHERE id = $1`,
          values
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/me/progress', requireAuth, async (req, res, next) => {
  try {
    const kind = clean(req.body?.kind, 60);
    if (!kind) return res.status(400).json({ error: { message: 'Informe o tipo do evento de progresso.' } });
    const payload = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
    await pool.query(
      `INSERT INTO progress_events (user_id, kind, payload) VALUES ($1,$2,$3::jsonb)`,
      [req.userRow.id, kind, JSON.stringify(payload)]
    );
    return res.status(201).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/me/progress', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const { rows } = await pool.query(
      `SELECT id, kind, payload, created_at FROM progress_events WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [req.userRow.id, limit]
    );
    return res.json({
      events: rows.map((row) => ({ id: Number(row.id), kind: row.kind, payload: row.payload, at: row.created_at }))
    });
  } catch (error) {
    return next(error);
  }
});

/* ---------- banco de lições ---------- */

app.get('/api/lessons', async (req, res, next) => {
  try {
    const params = [];
    const filters = [];
    if (req.query.year) {
      params.push(Number(req.query.year));
      filters.push(`year = $${params.length}`);
    }
    if (req.query.bim) {
      params.push(Number(req.query.bim));
      filters.push(`bim = $${params.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT data FROM lessons ${where} ORDER BY seq ASC`,
      params
    );
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ count: rows.length, lessons: rows.map((row) => row.data) });
  } catch (error) {
    return next(error);
  }
});

/* ---------- Lexi (chaves ficam só no servidor) ---------- */

app.post('/api/ai/lesson', requireAuth, async (req, res, next) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(503).json({ error: { message: 'A Lexi está sem chave da OpenRouter no servidor. Peça ao responsável para cadastrar OPENROUTER_API_KEY.' } });
    }
    const prompt = String(req.body?.prompt || '').slice(0, 20000);
    if (!prompt.trim()) return res.status(400).json({ error: { message: 'Pedido vazio para a Lexi.' } });
    const system = String(req.body?.system || 'Você é Lexi, especialista em Língua Portuguesa. Gere somente conteúdo pedagógico de Português.').slice(0, 4000);

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': `${req.protocol}://${req.get('host')}`,
        'X-Title': 'LETRION Lexi'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4200
      })
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      let message = `OpenRouter HTTP ${upstream.status}`;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.error?.message || message;
      } catch (_) { /* resposta sem JSON */ }
      return res.status(upstream.status).json({ error: { message } });
    }
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(502).json({ error: { message: 'A Lexi não retornou conteúdo.' } });
    }
    return res.json({ content, model: data?.model || OPENROUTER_MODEL });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/ai/stream', requireAuth, async (req, res, next) => {
  try {
    if (!GOOGLE_API_KEY) {
      return res.status(503).json({ error: { message: 'A Lexi está sem chave do Google no servidor. Peça ao responsável para cadastrar GOOGLE_API_KEY.' } });
    }
    const payload = req.body && typeof req.body === 'object' ? req.body : null;
    if (!payload?.contents) {
      return res.status(400).json({ error: { message: 'Pedido inválido para a Lexi.' } });
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GOOGLE_MODEL)}:streamGenerateContent?alt=sse`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GOOGLE_API_KEY },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      let message = `Google HTTP ${upstream.status}`;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.error?.message || message;
      } catch (_) { /* resposta sem JSON */ }
      return res.status(upstream.status).json({ error: { message } });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    Readable.fromWeb(upstream.body).pipe(res);
    return undefined;
  } catch (error) {
    return next(error);
  }
});

/* ---------- erros ---------- */

app.use((req, res) => {
  res.status(404).json({ error: { message: `Rota não encontrada: ${req.method} ${req.path}` } });
});

app.use((error, _req, res, _next) => {
  console.error('[letrion-api] erro', error);
  if (res.headersSent) return;
  res.status(500).json({ error: { message: 'Erro interno no servidor.' } });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[letrion-api] ouvindo em 0.0.0.0:${PORT}`);
});
