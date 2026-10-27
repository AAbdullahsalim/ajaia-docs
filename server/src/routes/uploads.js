import { Router } from 'express';
import multer from 'multer';
import { marked } from 'marked';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

// Keep uploads in memory; we only read small text files and immediately
// convert them into a document, so nothing is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB cap
});

const ALLOWED = ['.txt', '.md', '.markdown'];

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Upload a .txt or .md file -> creates a new editable document owned by the
// uploader. Markdown is converted to HTML; plain text becomes paragraphs.
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const name = req.file.originalname || 'upload';
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED.includes(ext)) {
    return res
      .status(400)
      .json({ error: `Unsupported file type. Allowed: ${ALLOWED.join(', ')}` });
  }

  const raw = req.file.buffer.toString('utf-8');
  const isMarkdown = ext === '.md' || ext === '.markdown';
  const content = isMarkdown
    ? marked.parse(raw)
    : raw
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('');

  const id = nanoid();
  const ts = new Date().toISOString();
  const title = name.replace(/\.(txt|md|markdown)$/i, '').slice(0, 200) || 'Imported document';

  db.prepare(
    `INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, title, content, req.user.id, ts, ts);

  res.status(201).json(db.prepare('SELECT * FROM documents WHERE id = ?').get(id));
});

export default router;
