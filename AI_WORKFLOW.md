# AI workflow note

> **Before you submit:** this note must describe *your* real process. The draft
> below reflects how this codebase was actually built (AI-assisted, then
> verified). Read it, keep what's true, and replace anything in **[brackets]**
> with your own words so it honestly matches what you did. Delete this blockquote.

## Tools used

- **Claude (via Claude Code)** as the primary assistant — scaffolding the
  Express + SQLite backend, the React + TipTap frontend, and the test suite.
- **[Add any others you used: editor/IDE, Copilot, etc.]**

## Where AI materially sped things up

- **Boilerplate and wiring**: Express routers, the `fetch` wrapper, the auth
  context, and CSS — the mechanical layer, written quickly so time could go to
  the access model and editing UX.
- **TipTap integration**: getting the editor, toolbar, and debounced autosave
  working together, including the read-only (viewer) mode.
- **Test setup**: isolating the SQLite database per test run and driving the API
  with Supertest.

## What I changed or rejected from AI output

- Kept the **authorization rules in one small, pure module** (`access.js`)
  instead of scattering role checks through the route handlers, specifically so
  they could be unit-tested — this was a deliberate structural choice, not the
  first thing generated.
- Chose **HTML** as the stored content format (simple, portable) over
  ProseMirror JSON, accepting the trade-off for future comment/diff features.
- **[Add a real example of your own: something the AI suggested that you
  simplified, corrected, or threw out. Reviewers specifically ask for this.]**

## How I verified correctness, UX, and reliability

- **Automated tests** (`npm test`): 4 passing — the access rules as unit tests
  and the document/sharing API as integration tests (editor can save, viewer is
  blocked with 403, non-shared users can't read a doc, only the owner can share).
- **Manual end-to-end check**: logged in as Alice, created and shared a document
  with Bob (editor) and Carol (viewer), confirmed Bob could edit and Carol was
  read-only, and that an uploaded `.md` file became a formatted document.
- **Production build**: ran `npm run build && npm start` and confirmed the
  single-service build serves and works.
- **[Add anything you checked yourself — e.g. tried it in two browsers for the
  share flow, tested an unsupported file type, etc.]**

## Judgment I kept with a human

The product decisions — what to cut (real-time collab, production auth, `.docx`),
what to prioritize (a correct, tested share model and a usable editor), and the
trade-offs in [ARCHITECTURE.md](./ARCHITECTURE.md) — are **[yours to own and
explain in the walkthrough video]**. AI accelerated the build; the scoping and
verification are what make the result trustworthy.
