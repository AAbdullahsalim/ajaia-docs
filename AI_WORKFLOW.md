# AI workflow note

## Tools used

- **Claude (via Claude Code)** as the primary assistant — scaffolding the
  Express + SQLite backend, the React + TipTap frontend, the test suite, and the
  deployment configuration.

## Where AI materially sped things up

- **Boilerplate and wiring** — Express routers, the `fetch` wrapper, the auth
  context, and CSS. Writing this mechanical layer quickly left more time for the
  access model and the editing experience.
- **TipTap integration** — getting the editor, the formatting toolbar, debounced
  autosave, and the read-only (viewer) mode working together.
- **Test and deploy setup** — isolating the SQLite database per test run with
  Supertest, and the Dockerfile / `render.yaml` for deployment.

## What I changed, rejected, or caught

- **Structured for testability.** I kept the authorization rules in one small,
  pure module (`server/src/access.js`) rather than scattering role checks through
  the route handlers, specifically so they could be unit-tested in isolation.
- **Chose HTML over ProseMirror JSON** as the stored content format — simpler and
  portable, accepting the trade-off that JSON would be better for future features
  like comments or version diffs.
- **Caught and fixed a deploy bug.** The first Render build failed. Rather than
  guess, I reproduced the exact production build locally and found the cause:
  `render.yaml` set `NODE_ENV=production`, which makes `npm install` skip
  devDependencies — so `vite` (a devDependency) was never installed and the
  client build failed. I fixed it by forcing dev dependencies during the build.
- **Caught a session bug on the free host.** After a redeploy, logins broke with
  "invalid auth token." The free tier recreates the database on restart, and the
  seed users originally got random IDs, so old tokens no longer matched. I gave
  the seed accounts stable IDs and made the client drop back to the login screen
  on a 401 instead of wedging.

## How I verified correctness, UX, and reliability

- **Automated tests** (`npm test`): 4 passing — the access rules as unit tests
  and the document/sharing API as integration tests (editor can save, viewer is
  blocked with 403, non-shared users can't read a document, only the owner can
  share).
- **Manual end-to-end testing**: signed in as Alice, created and shared a document
  with Bob (editor) and Carol (viewer), confirmed Bob could edit and Carol was
  read-only, and that an uploaded `.md` file became a formatted document.
- **Verified the live deployment** independently — checked the health endpoint,
  seed-users list, login, and that the client is served, directly against the
  production URL after deploying.

## Judgment kept with a human

The scoping decisions — what to cut (real-time collaboration, production auth,
`.docx` import) and what to prioritize (a correct, tested share model and a usable
editor) — and the trade-offs in [ARCHITECTURE.md](./ARCHITECTURE.md) were mine to
make. AI accelerated the build; the scoping and the verification are what make the
result trustworthy.
