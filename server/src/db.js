import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DB path is configurable so deploy targets can point at a mounted disk.
// Defaults to server/data/app.db for local development.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    email      TEXT UNIQUE NOT NULL,
    name       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT 'Untitled document',
    content    TEXT NOT NULL DEFAULT '',
    owner_id   TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- A document is shared with a user at a given role ('viewer' | 'editor').
  CREATE TABLE IF NOT EXISTS shares (
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id),
    role        TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
    PRIMARY KEY (document_id, user_id)
  );
`);

// Seed a few demo accounts so reviewers can exercise the sharing flow
// without a real signup system. Mocked auth — documented in the README.
// IDs are STABLE (not random) so that a login token (which is the user id)
// stays valid across restarts/redeploys even when the DB is recreated on
// hosts with an ephemeral filesystem.
const SEED_USERS = [
  { id: 'user-alice', email: 'alice@ajaia.test', name: 'Alice Owner' },
  { id: 'user-bob', email: 'bob@ajaia.test', name: 'Bob Collaborator' },
  { id: 'user-carol', email: 'carol@ajaia.test', name: 'Carol Reviewer' },
];

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (id, email, name) VALUES (@id, @email, @name)'
);
for (const u of SEED_USERS) {
  insertUser.run(u);
}

export default db;
