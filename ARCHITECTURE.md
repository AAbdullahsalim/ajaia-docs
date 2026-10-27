# Architecture note

## What I prioritized

The brief rewards **depth in a few areas over shallow coverage everywhere**, so
I spent the budget on the parts that are easy to get subtly wrong:

1. **A correct, testable access model.** Sharing is the one place where a bug is
   a real problem (someone edits or sees a document they shouldn't). I isolated
   the rules into `server/src/access.js` as small functions and covered them
   with both unit and integration tests. Everything else leans on that layer.
2. **A genuinely usable editing experience.** I used TipTap rather than a raw
   `contenteditable` so formatting (bold/italic/underline/headings/lists) is
   structured and reliable, and autosave keeps the flow close to Google Docs.
3. **Low-friction review.** One command to run, seeded accounts, a single
   service in production, and a README that walks through the sharing demo.

## Key decisions and trade-offs

- **SQLite via `better-sqlite3`.** Zero external services, synchronous API (less
  ceremony), and trivial to run locally. Trade-off: it writes to a local file,
  so ephemeral hosts reset on redeploy — called out in the README with the fix
  (persistent disk or Postgres).
- **Mocked auth (seeded users, token = user id).** Real auth wasn't the point of
  the exercise and would have eaten the budget. The `requireAuth` middleware is
  shaped like real auth (bearer token → `req.user`), so swapping in JWT/OAuth
  later is a localized change. It is clearly **not** production-secure.
- **HTML as the content format.** TipTap emits HTML; I persist it directly.
  Simple and portable. Trade-off: HTML is less structured than ProseMirror JSON
  for future features like comments/version diffs — a reasonable next step.
- **Autosave over explicit save.** Debounced `PUT` on edit matches the product
  reference (Docs) and avoids a "did I save?" failure mode. Trade-off: no
  conflict resolution if two editors type at once (see below).
- **Single service in production.** The server serves the built client, so there
  is one origin, one deploy, one URL — less for a reviewer to wire up.

## What I deliberately cut

- **Real-time collaboration / presence.** True concurrent editing (OT/CRDT) is a
  large subsystem. Sharing + persistence is demonstrated; simultaneous editing
  of the same doc is last-writer-wins.
- **Production auth**, email invitations, and user self-signup.
- **Granular document permissions** beyond owner/editor/viewer.
- **`.docx` import.** Only `.txt` / `.md` are supported (stated in the UI).

## What I'd build next with 2–4 more hours

1. **Conflict handling**: an `updated_at` version check on save (reject stale
   writes) as a stepping stone toward real-time.
2. **Per-document autosave history** (the schema already timestamps rows).
3. **`.docx` import** via `mammoth`, and **PDF export**.
4. A thin **E2E test** (Playwright) over the share → edit → view flow to
   complement the API tests.

## Request flow (happy path)

```
Browser (React/TipTap)
   │  Bearer <userId>
   ▼
Express  ──► requireAuth ──► access.js (role check) ──► SQLite (better-sqlite3)
   ▲                                                        │
   └──────────────── JSON (document / list / role) ─────────┘
```
