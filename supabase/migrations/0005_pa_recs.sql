-- ============================================================================
-- 0005_pa_recs.sql — "Records" (pa_recs): a structured info object under a
-- project, alongside free-form notes.
--
-- Unlike notes, a record always belongs to a project (no "inbox" concept),
-- so project_id is not nullable and deleting a project cascades to delete
-- its records. Run this in the Supabase SQL Editor after 0001-0004.
-- ============================================================================

create table if not exists public.pa_recs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  event         text,
  site          text,
  title         text not null check (char_length(trim(title)) > 0),
  -- "references" is a reserved SQL keyword, hence the quoting here; the
  -- JS/PostgREST layer treats it as an ordinary column name, no quoting needed there.
  "references"  text[] not null default '{}',
  points        text[] not null default '{}',
  key_learnings text,
  -- Supabase Storage object paths (in the pa-rec-images bucket below), not URLs.
  images        text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pa_recs_user_id_idx on public.pa_recs (user_id);
create index if not exists pa_recs_project_id_idx on public.pa_recs (project_id);

drop trigger if exists pa_recs_set_updated_at on public.pa_recs;
create trigger pa_recs_set_updated_at
  before update on public.pa_recs
  for each row execute function public.set_updated_at();

alter table public.pa_recs enable row level security;

drop policy if exists "Users manage their own pa_recs" on public.pa_recs;
create policy "Users manage their own pa_recs"
  on public.pa_recs
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Same reasoning as 0002_grants.sql: "Automatically expose new tables" is
-- off, so RLS alone isn't enough — the authenticated role also needs the
-- underlying table grant.
grant select, insert, update, delete on public.pa_recs to authenticated;

-- ----------------------------------------------------------------------------
-- pa-rec-images storage bucket
--
-- Private bucket; access is fenced by a storage.objects RLS policy scoped to
-- a per-user folder (path convention: "<user_id>/<filename>"). storage.objects
-- already has RLS enabled and `authenticated` already has base grants on it
-- by default in every Supabase project, so no extra GRANT is needed here —
-- only the policy.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pa-rec-images', 'pa-rec-images', false)
on conflict (id) do nothing;

drop policy if exists "Users manage their own pa_rec images" on storage.objects;
create policy "Users manage their own pa_rec images"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'pa-rec-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'pa-rec-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- Extend restore_snapshot() to also cover pa_recs. coalesce() guards
-- snapshots taken before this migration, which have no "pa_recs" key.
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

  delete from public.pa_recs where user_id = auth.uid();
  delete from public.notes where user_id = auth.uid();
  delete from public.projects where user_id = auth.uid();

  insert into public.projects
  select * from jsonb_populate_recordset(null::public.projects, snap.data -> 'projects');

  insert into public.notes
  select * from jsonb_populate_recordset(null::public.notes, snap.data -> 'notes');

  insert into public.pa_recs
  select * from jsonb_populate_recordset(null::public.pa_recs, coalesce(snap.data -> 'pa_recs', '[]'::jsonb));
end;
$$;

grant execute on function public.restore_snapshot(uuid) to authenticated;
