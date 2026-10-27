# Submission

## What's included

- `server/` — Express API + SQLite (documents, sharing, uploads, mocked auth)
- `client/` — React + Vite + TipTap editor UI
- `server/test/` — Vitest + Supertest tests (access control + sharing API)
- `README.md` — setup, run, seeded accounts, deployment
- `ARCHITECTURE.md` — priorities, trade-offs, what was cut, what's next
- `AI_WORKFLOW.md` — AI tools, where they helped, what was changed, verification
- `.env.example` — configurable `PORT` / `DB_PATH`

## Links

- **Live demo:** [ADD DEPLOYMENT URL]
- **Walkthrough video:** [ADD UNLISTED LOOM / YOUTUBE URL]
- **Repo / Drive folder:** [ADD LINK]

## Test accounts (mocked auth — no passwords)

| Name             | Email               | Use in demo              |
|------------------|---------------------|--------------------------|
| Alice Owner      | `alice@ajaia.test`  | creates & shares docs    |
| Bob Collaborator | `bob@ajaia.test`    | editor on shared docs    |
| Carol Reviewer   | `carol@ajaia.test`  | viewer (read-only)       |

## Quick start

```bash
npm run setup
npm run dev     # http://localhost:5173
npm test        # run the test suite
```

## Status

**Working end to end:**
- Create / rename / edit / save / reopen documents with rich-text formatting
- Autosave + reopen with formatting preserved
- Upload `.txt` / `.md` → new editable document
- Owner / editor / viewer sharing with owned-vs-shared separation
- SQLite persistence across refresh and restart
- Markdown export
- Automated tests + a single-service production build

**Intentionally not built (see ARCHITECTURE.md):**
- Real-time concurrent editing / presence (sharing is last-writer-wins)
- Production authentication, signup, email invites
- `.docx` import, PDF export

**Next with 2–4 more hours:**
- Stale-write/version check on save, autosave history, `.docx` import, an E2E test
