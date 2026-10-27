import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { getAccessLevel, canManage } from '../access.js';

const router = Router();
router.use(requireAuth);

// List who a document is shared with (owner only).
router.get('/:id/shares', (req, res) => {
  const { role, exists } = getAccessLevel(db, req.params.id, req.user.id);
  if (!exists) return res.status(404).json({ error: 'Document not found' });
  if (!canManage(role)) return res.status(403).json({ error: 'Only the owner can view shares' });

  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.name, s.role
         FROM shares s JOIN users u ON u.id = s.user_id
        WHERE s.document_id = ?
        ORDER BY u.name`
    )
    .all(req.params.id);
  res.json(rows);
});

// Share a document with another user by email (owner only).
router.post('/:id/shares', (req, res) => {
  const { role: myRole, exists } = getAccessLevel(db, req.params.id, req.user.id);
  if (!exists) return res.status(404).json({ error: 'Document not found' });
  if (!canManage(myRole)) return res.status(403).json({ error: 'Only the owner can share' });

  const { email, role } = req.body || {};
  if (!email || !['viewer', 'editor'].includes(role)) {
    return res.status(400).json({ error: 'email and role (viewer|editor) are required' });
  }

  const target = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(String(email).trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'No user with that email' });
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'You already own this document' });
  }

  db.prepare(
    `INSERT INTO shares (document_id, user_id, role) VALUES (?, ?, ?)
     ON CONFLICT (document_id, user_id) DO UPDATE SET role = excluded.role`
  ).run(req.params.id, target.id, role);

  res.status(201).json({ ok: true });
});

// Revoke a user's access (owner only).
router.delete('/:id/shares/:userId', (req, res) => {
  const { role, exists } = getAccessLevel(db, req.params.id, req.user.id);
  if (!exists) return res.status(404).json({ error: 'Document not found' });
  if (!canManage(role)) return res.status(403).json({ error: 'Only the owner can revoke' });

  db.prepare('DELETE FROM shares WHERE document_id = ? AND user_id = ?').run(
    req.params.id,
    req.params.userId
  );
  res.status(204).end();
});

export default router;
