-- ============================================================================
-- 0006_pa_tasks.sql — "Tasks" (pa_tasks): a structured actionable object under
-- a project, alongside notes and records.
--
-- Like pa_recs, a task always belongs to a project (no "inbox" concept), so
-- project_id is not nullable and deleting a project cascades to delete its
-- tasks. Run this in the Supabase SQL Editor after 0001-0005.
--
-- `steps` is jsonb rather than text[] because each step carries its own
-- completed flag + timestamp, not just text — e.g.
-- [{"text": "Book venue", "completed": true, "completed_at": "2026-07-01T12:00:00Z"}].
-- started_at/completed_at are set by the service layer (not a DB default)
-- since they need to reflect the moment the checkbox was toggled, including
-- being cleared back to null if unchecked.
-- ============================================================================

create table if not exists public.pa_tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  title         text not null check (char_length(trim(title)) > 0),
  steps         jsonb not null default '[]',
  started       boolean not null default false,
  started_at    timestamptz,
  completed     boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pa_tasks_user_id_idx on public.pa_tasks (user_id);
create index if not exists pa_tasks_project_id_idx on public.pa_tasks (project_id);

drop trigger if exists pa_tasks_set_updated_at on public.pa_tasks;
create trigger pa_tasks_set_updated_at
  before update on public.pa_tasks
  for each row execute function public.set_updated_at();

alter table public.pa_tasks enable row level security;

drop policy if exists "Users manage their own pa_tasks" on public.pa_tasks;
create policy "Users manage their own pa_tasks"
  on public.pa_tasks
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Same reasoning as 0002_grants.sql: "Automatically expose new tables" is
-- off, so RLS alone isn't enough — the authenticated role also needs the
-- underlying table grant.
grant select, insert, update, delete on public.pa_tasks to authenticated;

-- ----------------------------------------------------------------------------
-- Extend restore_snapshot() to also cover pa_tasks. coalesce() guards
-- snapshots taken before this migration, which have no "pa_tasks" key.
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

  delete from public.pa_tasks where user_id = auth.uid();
  delete from public.pa_recs where user_id = auth.uid();
  delete from public.notes where user_id = auth.uid();
  delete from public.projects where user_id = auth.uid();

  insert into public.projects
  select * from jsonb_populate_recordset(null::public.projects, snap.data -> 'projects');

  insert into public.notes
  select * from jsonb_populate_recordset(null::public.notes, snap.data -> 'notes');

  insert into public.pa_recs
  select * from jsonb_populate_recordset(null::public.pa_recs, coalesce(snap.data -> 'pa_recs', '[]'::jsonb));

  insert into public.pa_tasks
  select * from jsonb_populate_recordset(null::public.pa_tasks, coalesce(snap.data -> 'pa_tasks', '[]'::jsonb));
end;
$$;

grant execute on function public.restore_snapshot(uuid) to authenticated;
