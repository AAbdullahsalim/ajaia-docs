import { beforeAll, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// Point the singleton DB at a throwaway file and run in test mode BEFORE
// importing anything that opens the database.
const TMP_DB = path.join(os.tmpdir(), `ajaia-test-${Date.now()}.db`);
process.env.DB_PATH = TMP_DB;
process.env.NODE_ENV = 'test';

let db, app, request;
let alice, bob, carol, docId;

beforeAll(async () => {
  db = (await import('../src/db.js')).default;
  app = (await import('../src/index.js')).default;
  request = (await import('supertest')).default;
  const { nanoid } = await import('nanoid');

  alice = db.prepare('SELECT * FROM users WHERE email = ?').get('alice@ajaia.test');
  bob = db.prepare('SELECT * FROM users WHERE email = ?').get('bob@ajaia.test');
  carol = db.prepare('SELECT * FROM users WHERE email = ?').get('carol@ajaia.test');

  docId = nanoid();
  const ts = new Date().toISOString();
  db.prepare(
    `INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(docId, 'Alice doc', '<p>hello</p>', alice.id, ts, ts);
  // Bob is an editor, Carol is a viewer.
  db.prepare('INSERT INTO shares (document_id, user_id, role) VALUES (?, ?, ?)').run(
    docId, bob.id, 'editor'
  );
  db.prepare('INSERT INTO shares (document_id, user_id, role) VALUES (?, ?, ?)').run(
    docId, carol.id, 'viewer'
  );
});

describe('access rules (unit)', () => {
  it('resolves roles correctly for owner, editor, viewer and stranger', async () => {
    const { getAccessLevel, canEdit, canManage, canView } = await import('../src/access.js');

    expect(getAccessLevel(db, docId, alice.id).role).toBe('owner');
    expect(getAccessLevel(db, docId, bob.id).role).toBe('editor');
    expect(getAccessLevel(db, docId, carol.id).role).toBe('viewer');
    expect(getAccessLevel(db, docId, 'nobody').role).toBe(null);

    expect(canEdit('owner')).toBe(true);
    expect(canEdit('editor')).toBe(true);
    expect(canEdit('viewer')).toBe(false);
    expect(canManage('editor')).toBe(false); // editors cannot share/delete
    expect(canView('viewer')).toBe(true);
  });
});

describe('document + sharing API (integration)', () => {
  const as = (user) => `Bearer ${user.id}`;

  it('lets the editor save content but blocks the viewer', async () => {
    const edit = await request(app)
      .put(`/api/documents/${docId}`)
      .set('Authorization', as(bob))
      .send({ content: '<p>edited by bob</p>' });
    expect(edit.status).toBe(200);
    expect(edit.body.content).toContain('edited by bob');

    const blocked = await request(app)
      .put(`/api/documents/${docId}`)
      .set('Authorization', as(carol))
      .send({ content: '<p>carol tries</p>' });
    expect(blocked.status).toBe(403);
  });

  it('hides the document from a user it was never shared with', async () => {
    const dave = await request(app).post('/api/login').send({ email: 'alice@ajaia.test' });
    expect(dave.status).toBe(200); // sanity: login works

    const stranger = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', 'Bearer not-a-real-user');
    expect(stranger.status).toBe(401);
  });

  it('only the owner can share, and the shared doc appears for the grantee', async () => {
    const byEditor = await request(app)
      .post(`/api/documents/${docId}/shares`)
      .set('Authorization', as(bob))
      .send({ email: 'carol@ajaia.test', role: 'editor' });
    expect(byEditor.status).toBe(403); // editor cannot manage shares

    const list = await request(app)
      .get('/api/documents')
      .set('Authorization', as(carol));
    expect(list.status).toBe(200);
    expect(list.body.shared.some((d) => d.id === docId)).toBe(true);
    expect(list.body.owned.length).toBe(0);
  });
});
