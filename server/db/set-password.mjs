/*
 * Troca a senha de um usuário (grava só o hash bcrypt) e encerra as sessões
 * antigas daquela conta.
 *
 *   docker compose -f docker-compose.base44.yml exec -T api \
 *     node db/set-password.mjs <usuario> <nova-senha>
 *
 * Requer que você confirme a intenção em texto: passe a senha como último
 * argumento e não reaproveite a senha de outros serviços.
 */
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const [username, password, confirmation] = process.argv.slice(2);
const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

if (!username || !password || confirmation !== '--confirm') {
  console.error('uso: node db/set-password.mjs <usuario> <nova-senha> --confirm');
  process.exit(1);
}
if (password.length < 4) {
  console.error('a senha precisa ter pelo menos 4 caracteres');
  process.exit(1);
}

try {
  const { rows } = await pool.query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
  if (!rows.length) {
    console.error(`usuário "${username}" não encontrado`);
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, ROUNDS);
  await pool.query(
    `INSERT INTO user_credentials (user_id, password_hash, updated_at) VALUES ($1,$2,now())
     ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
    [rows[0].id, hash]
  );
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].id]);
  console.log(`senha de "${username}" atualizada (hash bcrypt) e sessões antigas encerradas`);
} finally {
  await pool.end();
}
