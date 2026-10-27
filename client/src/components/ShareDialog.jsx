import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Owner-only dialog to grant / revoke access to a document.
export default function ShareDialog({ doc, onClose }) {
  const [shares, setShares] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [error, setError] = useState('');

  async function refresh() {
    try {
      setShares(await api.get(`/documents/${doc.id}/shares`));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/documents/${doc.id}/shares`, { email, role });
      setEmail('');
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function revoke(userId) {
    await api.del(`/documents/${doc.id}/shares/${userId}`);
    refresh();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Share “{doc.title}”</h3>

        <form className="share-form" onSubmit={add}>
          <input
            type="email"
            placeholder="person@ajaia.test"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="editor">Can edit</option>
            <option value="viewer">Can view</option>
          </select>
          <button type="submit" className="primary">Share</button>
        </form>
        {error && <p className="error">{error}</p>}

        <ul className="share-list">
          {shares.length === 0 && <li className="muted">Not shared with anyone yet.</li>}
          {shares.map((s) => (
            <li key={s.id}>
              <span>
                <strong>{s.name}</strong> <span className="muted">{s.email}</span>
              </span>
              <span className="share-right">
                <span className={`badge ${s.role}`}>{s.role}</span>
                <button className="link-btn" onClick={() => revoke(s.id)}>Remove</button>
              </span>
            </li>
          ))}
        </ul>

        <div className="modal-actions">
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
