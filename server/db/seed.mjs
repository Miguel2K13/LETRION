import crypto from 'node:crypto';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
const BANK_SOURCE = process.env.BANK_SOURCE || '/bank/source.html';

/*
 * Contas iniciais do LETRION.
 *
 * As senhas abaixo são as mesmas credenciais de demonstração que já existiam
 * dentro do HTML do app; aqui elas entram no banco como hash bcrypt e ficam
 * protegidas. Depois de rodar o seed, troque cada uma com:
 *   node db/set-password.mjs <usuario> <nova-senha>
 * O seed nunca sobrescreve uma senha já existente no banco.
 */
const ACCOUNTS = [
  { id: 'student_demo', username: 'aluno', name: 'Demo Aluno', role: 'student', password: 'aluno123', schoolId: 'school_demo', schoolName: 'Francisco Benedito de Farias', year: '6', bimestre: '2', period: '2', classId: 'c6a', classLetter: 'A' },
  { id: 'admin_demo', username: 'admin', name: 'Administrador Demo', role: 'admin', password: 'admin123', schoolId: 'school_demo', schoolName: 'Francisco Benedito de Farias' },
  { id: 't1', username: 'profana', name: 'Prof. Ana Ribeiro', role: 'teacher', password: 'ana123', schoolId: 'school_demo', schoolName: 'Francisco Benedito de Farias' },
  { id: 't2', username: 'profcaio', name: 'Prof. Caio Mendes', role: 'teacher', password: 'caio123', schoolId: 'school_demo', schoolName: 'Francisco Benedito de Farias' },
  { id: 't3', username: 'profluiza', name: 'Prof. Luiza Alves', role: 'teacher', password: 'luiza123', schoolId: 'school_demo', schoolName: 'Francisco Benedito de Farias' },
  { id: 'teacher_jardson', username: 'Jardson', name: 'Jardson', role: 'teacher', password: '5629652955539981539', schoolId: 'school_demo', schoolName: 'Francisco Benedito de Farias' },
  { id: 'teacher_aurizete', username: 'Aurizete', name: 'Aurizete', role: 'teacher', password: '9272662826378939282', schoolId: 'school_demo', schoolName: 'Francisco Benedito de Farias' }
];

/* Extrai o array `const LETRION_BANK = [...]` do HTML do app. */
function extractBank(html) {
  const marker = 'const LETRION_BANK = ';
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) throw new Error('marcador "const LETRION_BANK = " não encontrado no HTML');
  const from = html.indexOf('[', markerAt);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = from; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '[' || char === '{') depth += 1;
    else if (char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(from, i + 1));
    }
  }
  throw new Error('não foi possível encontrar o fim do LETRION_BANK');
}

async function seedAccounts() {
  for (const account of ACCOUNTS) {
    await pool.query(
      `INSERT INTO users (id, username, name, role, school_id, school_name, year, bimestre, period, class_id, class_letter)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING`,
      [
        account.id, account.username, account.name, account.role,
        account.schoolId || null, account.schoolName || null,
        account.year || null, account.bimestre || null, account.period || null,
        account.classId || null, account.classLetter || null
      ]
    );
    const hash = await bcrypt.hash(account.password, ROUNDS);
    await pool.query(
      `INSERT INTO user_credentials (user_id, password_hash) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [account.id, hash]
    );
    await pool.query(
      `INSERT INTO user_state (user_id, data) VALUES ($1,'{}'::jsonb) ON CONFLICT DO NOTHING`,
      [account.id]
    );
  }
  console.log(`[letrion-api] contas verificadas: ${ACCOUNTS.length}`);
}

async function importLessons() {
  if (!fs.existsSync(BANK_SOURCE)) {
    console.warn(`[letrion-api] banco de lições não importado: ${BANK_SOURCE} não existe`);
    return;
  }
  const bank = extractBank(fs.readFileSync(BANK_SOURCE, 'utf8'));
  if (!Array.isArray(bank) || bank.length === 0) throw new Error('LETRION_BANK vazio');

  const hash = crypto.createHash('sha256').update(JSON.stringify(bank)).digest('hex');
  const current = await pool.query(`SELECT value FROM schema_meta WHERE key='lessons_bank_hash'`);
  if (current.rows[0]?.value === hash) {
    console.log(`[letrion-api] banco de lições já importado (${bank.length} séries)`);
    return;
  }

  const ids = bank.map((lesson) => String(lesson.id));
  for (let start = 0; start < bank.length; start += 40) {
    const chunk = bank.slice(start, start + 40);
    const placeholders = [];
    const values = [];
    chunk.forEach((lesson, index) => {
      const base = index * 9;
      placeholders.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8}::jsonb,$${base + 9}::jsonb)`);
      values.push(
        String(lesson.id), start + index, lesson.type ?? null,
        Number(lesson.year) || null, Number(lesson.bim) || null,
        lesson.level ?? null, lesson.contents ?? null,
        JSON.stringify(lesson.questions || []), JSON.stringify(lesson)
      );
    });
    await pool.query(
      `INSERT INTO lessons (id, seq, type, year, bim, level, contents, questions, data)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (id) DO UPDATE SET
         seq = EXCLUDED.seq, type = EXCLUDED.type, year = EXCLUDED.year, bim = EXCLUDED.bim,
         level = EXCLUDED.level, contents = EXCLUDED.contents, questions = EXCLUDED.questions,
         data = EXCLUDED.data, updated_at = now()`,
      values
    );
  }

  await pool.query(`DELETE FROM lessons WHERE NOT (id = ANY($1::text[]))`, [ids]);
  await pool.query(
    `INSERT INTO schema_meta (key, value) VALUES ('lessons_bank_hash', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [hash]
  );

  const questions = bank.reduce((total, lesson) => total + (lesson.questions || []).length, 0);
  console.log(`[letrion-api] banco de lições importado: ${bank.length} séries / ${questions} questões`);
}

try {
  await seedAccounts();
  await importLessons();
} finally {
  await pool.end();
}
