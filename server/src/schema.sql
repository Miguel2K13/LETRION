-- ===== LETRION: esquema do banco de dados =====
-- Contas e dados públicos do usuário.
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  username     TEXT NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'student',
  school_id    TEXT,
  school_name  TEXT,
  year         TEXT,
  bimestre     TEXT,
  period       TEXT,
  class_id     TEXT,
  class_letter TEXT,
  is_bot       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));

-- Senhas ficam separadas do resto do cadastro: qualquer leitura de "users"
-- continua sem tocar em hash de senha. Guardamos apenas o hash (bcrypt).
CREATE TABLE IF NOT EXISTS user_credentials (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  hash_algo     TEXT NOT NULL DEFAULT 'bcrypt',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Progresso e histórico do estudante (xp, letrins, lições, pacotes, histórico).
CREATE TABLE IF NOT EXISTS user_state (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessões: só o hash do token é gravado.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- Banco de lições (as 960 séries × 8 questões do currículo).
CREATE TABLE IF NOT EXISTS lessons (
  id         TEXT PRIMARY KEY,
  seq        INTEGER NOT NULL,
  type       TEXT,
  year       INTEGER,
  bim        INTEGER,
  level      TEXT,
  contents   TEXT,
  questions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lessons_year_bim_idx ON lessons (year, bim);
CREATE INDEX IF NOT EXISTS lessons_seq_idx ON lessons (seq);

-- Trilha de progresso (cada lição concluída / questão respondida).
CREATE TABLE IF NOT EXISTS progress_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS progress_events_user_idx ON progress_events (user_id, created_at DESC);

-- Chave/valor para marcar a versão do conteúdo importado (evita reimportar o banco).
CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
