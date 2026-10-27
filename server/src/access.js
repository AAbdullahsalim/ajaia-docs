// Authorization logic for documents. Kept as pure-ish functions so the
// access rules can be unit-tested in isolation (see test/access.test.js).
//
// Rules:
//   - The owner can view, edit, rename, share and delete.
//   - A user shared as 'editor' can view and edit (not share/delete/rename).
//   - A user shared as 'viewer' can only view.
//   - Everyone else has no access.

export function getAccessLevel(db, documentId, userId) {
  const doc = db
    .prepare('SELECT owner_id FROM documents WHERE id = ?')
    .get(documentId);
  if (!doc) return { exists: false, role: null };
  if (doc.owner_id === userId) return { exists: true, role: 'owner' };

  const share = db
    .prepare('SELECT role FROM shares WHERE document_id = ? AND user_id = ?')
    .get(documentId, userId);
  if (share) return { exists: true, role: share.role };

  return { exists: true, role: null };
}

export function canView(role) {
  return role === 'owner' || role === 'editor' || role === 'viewer';
}

export function canEdit(role) {
  return role === 'owner' || role === 'editor';
}

export function canManage(role) {
  // rename, share, delete — owner only
  return role === 'owner';
}
