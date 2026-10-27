# Ajaia Docs

A lightweight collaborative document editor — a focused slice of "Google Docs"
built for the Ajaia take-home. It covers document creation and rich-text
editing, file import, a simple owner/share access model, and persistence.

> **Scope note:** this is a deliberately narrow slice. See
> [ARCHITECTURE.md](./ARCHITECTURE.md) for what was prioritized, what was cut,
> and why.

---

## Features

- **Create, rename, edit, save, reopen** documents in the browser.
- **Rich text** via TipTap: bold, italic, underline, H1/H2/paragraph, bullet &
  numbered lists. Content autosaves (debounced) as you type.
- **File upload**: import a `.txt` or `.md` / `.markdown` file → it becomes a
  new editable document (Markdown is converted to rich text). _Supported types
  are limited to `.txt`, `.md`, `.markdown`; enforced in the UI and API._
- **Sharing**: a document has one **owner**; the owner can grant other users
  **editor** (view + edit) or **viewer** (view-only) access by email. The
  sidebar separates **My documents** from **Shared with me**.
- **Persistence**: everything is stored in SQLite and survives refresh/restart.
- **Export** a document to Markdown (small stretch feature).

### Access rules

| Action                     | Owner | Editor | Viewer | No share |
|----------------------------|:-----:|:------:|:------:|:--------:|
| View                       |  ✅   |   ✅   |   ✅   |    ❌    |
| Edit content               |  ✅   |   ✅   |   ❌   |    ❌    |
| Rename / Share / Delete    |  ✅   |   ❌   |   ❌   |    ❌    |

---

## Tech stack

- **Frontend:** React + Vite, [TipTap](https://tiptap.dev) (ProseMirror) editor.
- **Backend:** Node + Express.
- **Storage:** SQLite via `better-sqlite3` (file-based, zero external services).
- **Auth:** **mocked** — seeded accounts, no passwords. Documented below.
- **Tests:** Vitest + Supertest (access-control + sharing API).

---

## Run locally

Requires **Node 18+** (built on Node 20).

```bash
# from the project root
npm run setup      # installs server + client deps
npm run dev        # starts API (:4000) and Vite dev server (:5173)
```

Then open **http://localhost:5173**. The Vite dev server proxies `/api` to the
backend, so you only need the one URL.

### Seeded accounts (for the sharing demo)

Auth is mocked: "logging in" just means selecting a seeded user (no password).
The login screen lists them; the emails are:

| Name             | Email               |
|------------------|---------------------|
| Alice Owner      | `alice@ajaia.test`  |
| Bob Collaborator | `bob@ajaia.test`    |
| Carol Reviewer   | `carol@ajaia.test`  |

**To demo sharing:** sign in as Alice, create a document, click **Share**, and
grant `bob@ajaia.test` editor access. Open a second browser (or incognito
window), sign in as Bob, and the document appears under **Shared with me** and
is editable. Sign in as Carol with viewer access to see read-only mode.

---

## Run as a single service (production build)

```bash
npm run build      # builds the client into client/dist
npm start          # server serves the API + the built client on :4000
```

Open **http://localhost:4000**.

---

## Tests

```bash
npm test
```

Covers the authorization rules as unit tests and the document/sharing API as
integration tests (editor can save, viewer is blocked, non-shared users can't
see a document, only the owner can share). See
[server/test/access.test.js](./server/test/access.test.js).

---

## Deployment

The app is a single Node service that serves both the API and the built client,
so any Node host works. **Render** (free tier) is the quickest:

1. Push this repo to GitHub.
2. New → **Web Service**, point it at the repo.
3. **Build command:** `npm run setup && npm run build`
4. **Start command:** `npm start`
5. Environment: `PORT` is provided by Render automatically.

> **Persistence caveat:** SQLite writes to a file. On hosts with an ephemeral
> filesystem (Render free tier, most serverless), the database resets on
> redeploy. For durable storage attach a persistent disk and set `DB_PATH` to a
> path on it (see `.env.example`), or swap `better-sqlite3` for a hosted
> Postgres. This is called out intentionally rather than hidden.

---

## Project layout

```
ajaia-docs/
├── server/            Express API + SQLite
│   ├── src/
│   │   ├── index.js   app wiring, auth routes, static serving
│   │   ├── db.js      schema + seed data
│   │   ├── auth.js    mocked login + requireAuth middleware
│   │   ├── access.js  authorization rules (unit-tested)
│   │   └── routes/    documents, shares, uploads
│   └── test/          Vitest + Supertest
├── client/            React + Vite + TipTap
│   └── src/
│       ├── App.jsx        shell: sidebar + editor
│       ├── api.js         fetch wrapper
│       ├── auth.jsx       auth context
│       └── components/    Login, DocList, Editor, Toolbar, ShareDialog
├── ARCHITECTURE.md
├── AI_WORKFLOW.md
└── SUBMISSION.md
```
