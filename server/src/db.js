import pg from 'pg';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://letrion:letrion_dev_password@db:5432/letrion';

export const pool = new Pool({ connectionString, max: 10 });

pool.on('error', (err) => {
  console.error('[letrion-api] erro inesperado no pool do Postgres', err);
});
