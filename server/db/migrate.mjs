import fs from 'node:fs';
import { pool } from '../src/db.js';

const schema = fs.readFileSync(new URL('../src/schema.sql', import.meta.url), 'utf8');

try {
  await pool.query(schema);
  console.log('[letrion-api] esquema do banco pronto');
} finally {
  await pool.end();
}
