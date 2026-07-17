-- ============================================================================
-- 0003_snapshots.sql — manual database snapshots + restore
--
-- Adds a `snapshots` table (one row per point-in-time backup of a user's
-- projects + notes, stored as jsonb) and a `restore_snapshot()` function that
-- atomically wipes and repopulates the caller's projects/notes from a chosen
-- snapshot. Run this in the Supabase SQL Editor after 0001 and 0002.
-- ============================================================================

create table if not exists public.snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label       text,
  -- { "projects": Project[], "notes": Note[] } — full row data at snapshot time
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists snapshots_user_id_idx on public.snapshots (user_id, created_at desc);

alter table public.snapshots enable row level security;

-- Snapshots are write-once: created and deleted, never edited in place.
drop policy if exists "Users manage their own snapshots" on public.snapshots;
create policy "Users manage their own snapshots"
  on public.snapshots
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, delete on public.snapshots to authenticated;

-- ----------------------------------------------------------------------------
-- restore_snapshot: atomically replace the caller's projects + notes with the
-- contents of one of their own snapshots.
--
-- SECURITY DEFINER is required because a plain `authenticated` role only has
-- row-level DML via RLS, not the freedom to bulk delete-then-insert inside a
-- single function call; the function itself re-checks ownership of the
-- snapshot via auth.uid() before touching anything, so a caller can never
-- restore (or see) another user's snapshot.
-- ----------------------------------------------------------------------------
create or replace function public.restore_snapshot(snapshot_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  snap record;
begin
  select * into snap
  from public.snapshots
  where id = snapshot_id and user_id = auth.uid();

  if not found then
    raise exception 'Snapshot not found';
  end if;

  delete from public.notes where user_id = auth.uid();
  delete from public.projects where user_id = auth.uid();

  insert into public.projects
  select * from jsonb_populate_recordset(null::public.projects, snap.data -> 'projects');

  insert into public.notes
  select * from jsonb_populate_recordset(null::public.notes, snap.data -> 'notes');
end;
$$;

grant execute on function public.restore_snapshot(uuid) to authenticated;
