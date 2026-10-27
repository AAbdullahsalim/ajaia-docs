import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import db from './db.js';
import { login } from './auth.js';
import documentsRouter from './routes/documents.js';
import sharesRouter from './routes/shares.js';
import uploadsRouter from './routes/uploads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// --- Auth (mocked) ---
app.post('/api/login', (req, res) => {
  const result = login(req.body?.email);
  if (!result) return res.status(401).json({ error: 'Unknown email. Try a seeded account.' });
  res.json(result);
});

// Expose seeded accounts so the login screen can offer them as a convenience.
app.get('/api/seed-users', (_req, res) => {
  res.json(db.prepare('SELECT email, name FROM users ORDER BY name').all());
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Resources ---
app.use('/api/documents', documentsRouter);
app.use('/api/documents', sharesRouter); // /:id/shares lives alongside documents
app.use('/api/uploads', uploadsRouter);

// --- Serve the built client in production ---
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 4000;
// Guard so the test runner can import the app without binding a port.
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

export default app;
