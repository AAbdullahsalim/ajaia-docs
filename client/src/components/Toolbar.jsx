// Formatting toolbar wired to the TipTap editor instance.
const buttons = [
  { label: 'B', title: 'Bold', isActive: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run(), style: { fontWeight: 700 } },
  { label: 'I', title: 'Italic', isActive: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run(), style: { fontStyle: 'italic' } },
  { label: 'U', title: 'Underline', isActive: (e) => e.isActive('underline'), run: (e) => e.chain().focus().toggleUnderline().run(), style: { textDecoration: 'underline' } },
  { sep: true },
  { label: 'H1', title: 'Heading 1', isActive: (e) => e.isActive('heading', { level: 1 }), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'H2', title: 'Heading 2', isActive: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'P', title: 'Paragraph', isActive: (e) => e.isActive('paragraph'), run: (e) => e.chain().focus().setParagraph().run() },
  { sep: true },
  { label: '• List', title: 'Bullet list', isActive: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: '1. List', title: 'Numbered list', isActive: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
];

export default function Toolbar({ editor, disabled }) {
  if (!editor) return null;
  return (
    <div className="toolbar" aria-disabled={disabled}>
      {buttons.map((b, i) =>
        b.sep ? (
          <span key={i} className="toolbar-sep" />
        ) : (
          <button
            key={i}
            title={b.title}
            disabled={disabled}
            className={b.isActive(editor) ? 'tb-btn active' : 'tb-btn'}
            style={b.style}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => b.run(editor)}
          >
            {b.label}
          </button>
        )
      )}
    </div>
  );
}
