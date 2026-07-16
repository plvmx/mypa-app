# MyPA — Personal Assistant

A mobile-first personal assistant PWA: capture your **projects & interests**, and record **notes / thoughts** against them. Built to grow iteratively (goals, tasks, reminders next).

Stack: **Next.js 16** · **React 19** · **Supabase** (Postgres + magic-link auth) · **Tailwind v4** · **Vitest**. Deploys to **Vercel**.

## First-time setup

### 1. Create a new Supabase project
Create a **new organisation** (keep it separate from the AFJ campaign app), then a project inside it. From **Settings → API**, copy the project URL and the `anon` public key.

### 2. Configure environment
```bash
cp .env.local.example .env.local
# paste NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Create the database schema
In the Supabase dashboard → **SQL Editor**, paste and run the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
This creates the `projects` and `notes` tables with Row-Level Security.

### 4. Configure auth redirects
In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` for local dev (and your Vercel URL for production).
- **Redirect URLs**: add `http://localhost:3000/auth/confirm` and `https://<your-vercel-domain>/auth/confirm`.

### 5. Install and run
```bash
npm install
npm run dev
```
Open http://localhost:3000, enter your email, and click the magic link.

## Scripts
```bash
npm run dev        # dev server
npm run build      # production build
npm run lint       # ESLint
npx tsc --noEmit   # type-check
npm test           # unit tests
```

## Deploying to Vercel
1. Push this repo to GitHub and import it as a **new Vercel project** (free account).
2. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel project settings.
3. Add your production domain to the Supabase redirect URLs (step 4 above).
4. `main` auto-deploys.

See [`CLAUDE.md`](CLAUDE.md) for architecture and contribution conventions.
