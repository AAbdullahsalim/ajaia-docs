import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './auth.jsx';
import { api } from './api.js';
import Login from './components/Login.jsx';
import DocList from './components/DocList.jsx';
import Editor from './components/Editor.jsx';

export default function App() {
  const { user, logout } = useAuth();
  const [owned, setOwned] = useState([]);
  const [shared, setShared] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const { owned, shared } = await api.get('/documents');
      setOwned(owned);
      setShared(shared);
      return { owned, shared };
    } catch (e) {
      setError(e.message);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!user) return <Login />;

  async function newDoc() {
    const doc = await api.post('/documents', { title: 'Untitled document' });
    await refresh();
    setActiveId(doc.id);
  }

  async function upload(file) {
    try {
      const doc = await api.upload(file);
      await refresh();
      setActiveId(doc.id);
    } catch (e) {
      setError(e.message);
    }
  }

  function onDeleted(id) {
    if (activeId === id) setActiveId(null);
    refresh();
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">Ajaia Docs</div>
        <div className="who">
          <span className="muted">{user.name}</span>
          <button className="link-btn" onClick={logout}>Sign out</button>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}

      <div className="app-body">
        <aside className="sidebar">
          <DocList
            owned={owned}
            shared={shared}
            activeId={activeId}
            onSelect={setActiveId}
            onNew={newDoc}
            onUpload={upload}
          />
        </aside>

        <main className="main">
          {activeId ? (
            <Editor
              key={activeId}
              docId={activeId}
              onChanged={refresh}
              onDeleted={onDeleted}
            />
          ) : (
            <div className="editor-empty">
              <p>Select a document, create a new one, or upload a file to begin.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
