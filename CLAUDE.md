# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It adapts the conventions from the AFJ campaign app to this personal-assistant project.

## Git workflow

### Autonomous (no approval needed)
- Create feature branches (`git checkout -b <branch>`)
- Stage and commit changes — always with a clear message summarising *why*
- Push feature branches to origin (`git push origin <feature-branch>`)
- Create PRs (`gh pr create`) — include summary and test plan
- Check CI status and fix failures, pushing follow-up commits to the same branch

### Always pause and wait for explicit "go ahead"
- **Merging a PR to main** (`gh pr merge`) — main auto-deploys to production
- **Pushing directly to main** — ask first
- **Force-pushing anything** — never without discussion

### Communication
- After every commit, state: branch name, short commit hash, one-line summary
- After every push, confirm where it went and whether CI ran
- When creating a PR, share the URL for review before approving the merge

## Branch naming
`<type>/<short-description>` — e.g. `feat/goals`, `fix/note-ordering`, `chore/update-deps`

## Code quality (standing rule)
Every change must pass all four checks: **Lint · Type-check · Unit tests · Build**.
Never suppress lint errors with disable comments unless there is no correct refactor — fix the root cause.

## Testing policy
- Every new function added to `lib/` or `lib/services/` ships with a test in the same PR.
- Every bug-fix PR includes a regression test that fails on the pre-fix code and passes on the post-fix code, in the same PR. Verify red→green before calling a fix done. If a bug is purely visual/CSS/copy and genuinely can't be captured in a test, say so explicitly rather than silently skipping.
- Mock the Supabase client with the shared builder in `lib/services/__tests__/supabaseMock.ts` rather than hand-rolling `vi.mock` chains per test file.

## Deployment
- `main` branch → auto-deploys to production via Vercel.
- A **new Supabase organisation/project** backs this app — kept distinct from the AFJ campaign app. Never point this app at the AFJ database.
- Do not merge until checks are green and Peter has approved the PR.

---

## Commands

```bash
npm run dev        # Start Next.js dev server
npm run build      # Production build
npm run lint       # ESLint across app/, components/, lib/, contexts/
npx tsc --noEmit   # Type-check without emitting
npm test           # Run all Vitest unit tests (vitest run)
npx vitest run lib/services/__tests__/projectService.test.ts   # Single file
```

## Environment setup
1. `cp .env.local.example .env.local` and fill in the new Supabase project's URL + anon key.
2. Run `supabase/migrations/0001_init.sql`, `0002_grants.sql`, and `0003_snapshots.sql` (in order) in the Supabase SQL Editor.
3. In Supabase Auth settings, add the site URL and `…/auth/confirm` as a redirect URL.
4. Data API settings: "Automatically expose new tables" is left off. Every new table's migration must include explicit `grant ... to authenticated` statements (see `0002_grants.sql`) — RLS alone is not enough; Postgres checks table-level grants before RLS is evaluated.

---

## Architecture

### Stack
- **Next.js 16 App Router** — all pages under `app/`. No Pages Router.
- **React 19** with client components (`'use client'`) for interactive UI.
- **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) — Postgres + cookie-based auth.
  - `lib/supabaseClient.ts` — browser client (`createBrowserClient`). Used by everything in the frontend and by all `lib/services/` modules.
  - `lib/supabase/server.ts` — per-request server client for Server Components / Route Handlers.
  - `lib/supabase/middleware.ts` — `updateSession()` refreshes the JWT and guards protected routes.
- **Tailwind CSS v4** — utility-first, dark-mode via CSS variables in `app/globals.css`.
- **Vitest + jsdom + React Testing Library** — unit tests in `lib/services/__tests__/`.

### Auth
- **Magic-link email** via Supabase Auth (`signInWithOtp`). Flow: `/login` → email link → `/auth/confirm` (verifies the OTP, sets the cookie session) → `/app`.
- `middleware.ts` refreshes the session on every request and redirects unauthenticated users away from `/app`. RLS is the enforced data-access boundary.
- `contexts/UserContext.tsx` (`useUser()`) is the single source of truth for the current user on the client. `app/app/layout.tsx` verifies the session server-side and seeds the provider.

### Data layer
All database access goes through service modules in `lib/services/`. Pages and components must not import `supabase` directly for CRUD.

- **`lib/services/projectService.ts`** — CRUD for `projects`: `getProjects`, `getProjectById`, `createProject`, `updateProject`, `deleteProject`.
- **`lib/services/noteService.ts`** — CRUD for `notes`: `getNotes` (filter by project, `null` for inbox, or all), `getNoteById`, `createNote`, `updateNote`, `deleteNote`.
- **`lib/services/snapshotService.ts`** — manual DB backups: `getSnapshots`, `createSnapshot` (captures all current projects + notes as one row), `deleteSnapshot`, `restoreSnapshot` (delegates to the `restore_snapshot` Postgres function for an atomic wipe + repopulate — the JS client can't express that as one transaction).

`user_id` is set by a database default (`auth.uid()`) and fenced by RLS, so services never pass a user id.

### Key shared modules
| File | Purpose |
|------|---------|
| `lib/types.ts` | Shared interfaces (`Project`, `Note`, `Snapshot`) — keep in sync with the SQL schema |
| `lib/errorUtils.ts` | `getErrorMessage()` — safe error-to-string coercion |

### Component structure
- `components/MobileLayout.tsx` — shared shell (header + fixed bottom nav) wrapping every `/app` page.
- `components/NoteComposer.tsx` — capture box for a new note (project-scoped or inbox).
- `components/NoteCard.tsx` — displays one note with a delete action.

### Page map
| Route | Description |
|-------|-------------|
| `/login` | Magic-link email login |
| `/auth/confirm` | Route handler that verifies the magic-link OTP |
| `/app` | Home — projects / interests list + quick create |
| `/app/projects/[id]` | Project detail — its notes + capture box |
| `/app/notes` | Notes inbox — all notes newest-first + quick capture |
| `/app/admin` | Admin panel — take/restore/delete database snapshots |

### Database tables
- `projects` — top-level containers; `status` is `'active'` / `'archived'`
- `notes` — free-form thoughts; `project_id` nullable (null = unfiled inbox note)
- `snapshots` — point-in-time backups; `data` jsonb holds `{ projects, notes }` at capture time. Write-once (created/deleted, never updated).

All three have RLS policies fencing rows to `auth.uid()`; `projects`/`notes` also have an `updated_at` trigger. Since "Automatically expose new tables" is off, each table's migration also grants base privileges to `authenticated` explicitly (see `0002_grants.sql`, and the grant statements in `0003_snapshots.sql`).

---

## Roadmap (iterative — expand as priorities evolve)
The MVP is deliberately small. Likely next slices, roughly in order:
1. ~~**Admin panel + manual DB snapshots/restore**~~ — done (`/app/admin`, `snapshotService.ts`).
2. **Goals** — objectives with target dates + status, optionally tied to a project.
3. **Tasks + reminders** — actionable items with due dates and an in-app "Today" view.
4. **Editing** — inline edit for projects/notes (services already support `update*`).
5. **Tags / search** across notes.
6. **Notifications** — revisit web push or email once the core is solid.

Keep the service-layer + tested-first discipline as each slice lands.
