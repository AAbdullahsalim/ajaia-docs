import { Router } from 'express';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { getAccessLevel, canView, canEdit, canManage } from '../access.js';

const router = Router();
router.use(requireAuth);

const now = () => new Date().toISOString();

// List documents visible to the current user, split into owned vs shared.
router.get('/', (req, res) => {
  const owned = db
    .prepare('SELECT * FROM documents WHERE owner_id = ? ORDER BY updated_at DESC')
    .all(req.user.id);

  const shared = db
    .prepare(
      `SELECT d.*, s.role AS shared_role, u.name AS owner_name
         FROM documents d
         JOIN shares s ON s.document_id = d.id
         JOIN users u ON u.id = d.owner_id
        WHERE s.user_id = ?
        ORDER BY d.updated_at DESC`
    )
    .all(req.user.id);

  res.json({ owned, shared });
});

// Create a new (optionally pre-filled) document.
router.post('/', (req, res) => {
  const { title, content } = req.body || {};
  const id = nanoid();
  const ts = now();
  db.prepare(
    `INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    (title || 'Untitled document').slice(0, 200),
    content || '',
    req.user.id,
    ts,
    ts
  );
  res.status(201).json(db.prepare('SELECT * FROM documents WHERE id = ?').get(id));
});

// Read a single document (owner, editor or viewer).
router.get('/:id', (req, res) => {
  const { role, exists } = getAccessLevel(db, req.params.id, req.user.id);
  if (!exists) return res.status(404).json({ error: 'Document not found' });
  if (!canView(role)) return res.status(403).json({ error: 'No access' });

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  res.json({ ...doc, role });
});

// Update content and/or title. Title changes are owner-only (rename);
// content changes are allowed for owner + editor.
router.put('/:id', (req, res) => {
  const { role, exists } = getAccessLevel(db, req.params.id, req.user.id);
  if (!exists) return res.status(404).json({ error: 'Document not found' });
  if (!canEdit(role)) return res.status(403).json({ error: 'No edit access' });

  const { title, content } = req.body || {};
  if (title !== undefined && !canManage(role)) {
    return res.status(403).json({ error: 'Only the owner can rename' });
  }

  const current = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  db.prepare('UPDATE documents SET title = ?, content = ?, updated_at = ? WHERE id = ?').run(
    title !== undefined ? String(title).slice(0, 200) : current.title,
    content !== undefined ? String(content) : current.content,
    now(),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id));
});

// Delete — owner only.
router.delete('/:id', (req, res) => {
  const { role, exists } = getAccessLevel(db, req.params.id, req.user.id);
  if (!exists) return res.status(404).json({ error: 'Document not found' });
  if (!canManage(role)) return res.status(403).json({ error: 'Only the owner can delete' });

  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
