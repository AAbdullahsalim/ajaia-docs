import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TurndownService from 'turndown';
import Toolbar from './Toolbar.jsx';
import ShareDialog from './ShareDialog.jsx';
import { api } from '../api.js';

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });

export default function Editor({ docId, onChanged, onDeleted }) {
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [sharing, setSharing] = useState(false);
  const saveTimer = useRef(null);
  const loadedId = useRef(null);

  const canEdit = doc && (doc.role === 'owner' || doc.role === 'editor');
  const isOwner = doc && doc.role === 'owner';

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '',
    editable: false,
    onUpdate: ({ editor }) => scheduleSave({ content: editor.getHTML() }),
  });

  // Load the selected document.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await api.get(`/documents/${docId}`);
      if (cancelled) return;
      setDoc(data);
      setTitle(data.title);
      loadedId.current = docId;
      if (editor) {
        editor.commands.setContent(data.content || '<p></p>', false);
        editor.setEditable(data.role === 'owner' || data.role === 'editor');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, editor]);

  function scheduleSave(patch) {
    if (loadedId.current !== docId) return; // ignore setContent-triggered updates
    setStatus('Saving…');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await api.put(`/documents/${docId}`, patch);
        setStatus('Saved');
        onChanged?.(updated);
      } catch (e) {
        setStatus(`Error: ${e.message}`);
      }
    }, 700);
  }

  function onTitleChange(value) {
    setTitle(value);
    if (isOwner) scheduleSave({ title: value });
  }

  async function remove() {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    await api.del(`/documents/${docId}`);
    onDeleted?.(docId);
  }

  function exportMarkdown() {
    const md = turndown.turndown(editor.getHTML());
    const blob = new Blob([`# ${title}\n\n${md}\n`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!doc) return <div className="editor-empty">Loading…</div>;

  return (
    <div className="editor-pane">
      <div className="editor-head">
        <input
          className="title-input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={!isOwner}
          placeholder="Untitled document"
        />
        <div className="editor-meta">
          <span className={`badge ${doc.role}`}>{doc.role}</span>
          <span className="status muted">{status}</span>
          <button onClick={exportMarkdown} title="Export as Markdown">Export .md</button>
          {isOwner && <button onClick={() => setSharing(true)}>Share</button>}
          {isOwner && <button className="danger" onClick={remove}>Delete</button>}
        </div>
      </div>

      <Toolbar editor={editor} disabled={!canEdit} />

      <div className={canEdit ? 'editor-surface' : 'editor-surface readonly'}>
        <EditorContent editor={editor} />
      </div>
      {!canEdit && <p className="muted readonly-note">You have view-only access.</p>}

      {sharing && <ShareDialog doc={doc} onClose={() => setSharing(false)} />}
    </div>
  );
}
