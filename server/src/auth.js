// Lightweight mocked auth. A "login" just verifies the email belongs to a
// seeded user and returns that user's id as an opaque bearer token. This is
// intentionally simple for the timebox — documented as mocked in the README.
// It is NOT secure for production (no password, token == user id).
import db from './db.js';

export function login(email) {
  const user = db
    .prepare('SELECT id, email, name FROM users WHERE email = ?')
    .get(email?.trim().toLowerCase());
  if (!user) return null;
  return { token: user.id, user };
}

// Express middleware: resolves req.user from the Bearer token, or 401s.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const user = db
    .prepare('SELECT id, email, name FROM users WHERE id = ?')
    .get(token);
  if (!user) return res.status(401).json({ error: 'Invalid auth token' });

  req.user = user;
  next();
}
