import { useRef } from 'react';

// Sidebar: new/upload actions + owned and shared document lists.
export default function DocList({ owned, shared, activeId, onSelect, onNew, onUpload }) {
  const fileRef = useRef(null);

  return (
    <div className="doclist">
      <div className="doclist-actions">
        <button className="primary block" onClick={onNew}>+ New document</button>
        <button className="block" onClick={() => fileRef.current?.click()}>
          Upload .txt / .md
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.markdown"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = '';
          }}
        />
      </div>

      <Section title="My documents" items={owned} activeId={activeId} onSelect={onSelect} empty="No documents yet." />
      <Section
        title="Shared with me"
        items={shared}
        activeId={activeId}
        onSelect={onSelect}
        empty="Nothing shared with you."
        renderMeta={(d) => (
          <span className="meta-row">
            <span className={`badge ${d.shared_role}`}>{d.shared_role}</span>
            <span className="muted">{d.owner_name}</span>
          </span>
        )}
      />
    </div>
  );
}

function Section({ title, items, activeId, onSelect, empty, renderMeta }) {
  return (
    <div className="doc-section">
      <h4>{title}</h4>
      {items.length === 0 && <p className="muted small">{empty}</p>}
      <ul>
        {items.map((d) => (
          <li
            key={d.id}
            className={d.id === activeId ? 'doc-item active' : 'doc-item'}
            onClick={() => onSelect(d.id)}
          >
            <span className="doc-title">{d.title || 'Untitled document'}</span>
            {renderMeta?.(d)}
          </li>
        ))}
      </ul>
    </div>
  );
}
