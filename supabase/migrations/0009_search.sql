-- ============================================================================
-- 0009_search.sql — global substring search across projects, notes, records
-- and tasks.
--
-- Goal: locate any text stored anywhere in the app, whether the query is a
-- standalone word or only *part* of a bigger word ("pa" finds "campaign").
-- That is substring/infix matching, which plain full-text search (tsvector)
-- can't do — so this uses trigram (pg_trgm) GIN indexes backing LIKE '%q%'.
--
-- Each table gets a maintained `search_blob text` column holding a lowercased
-- concatenation of all its searchable text — including the text[] arrays on
-- pa_recs and the jsonb `steps` on pa_tasks, which can't be trigram-indexed
-- directly. A BEFORE INSERT OR UPDATE trigger keeps the blob fresh (same
-- pattern as the existing set_updated_at trigger), and a GIN trigram index on
-- it makes LIKE '%q%' fast instead of a full scan. `search_everything()` then
-- unions the four tables into one ranked, RLS-scoped result set.
--
-- Run this in the Supabase SQL Editor after 0001-0008. No grant changes are
-- needed for the new columns (the existing per-table policies already cover
-- them); the RPC is SECURITY INVOKER so each table's RLS still applies.
-- ============================================================================

-- Trigram matching + GIN index support for LIKE '%...%'.
create extension if not exists pg_trgm;

-- ----------------------------------------------------------------------------
-- projects.search_blob  (title + description)
-- ----------------------------------------------------------------------------
alter table public.projects add column if not exists search_blob text;

create or replace function public.projects_set_search_blob()
returns trigger
language plpgsql
as $$
begin
  new.search_blob := lower(concat_ws(' ', new.title, new.description));
  return new;
end;
$$;

drop trigger if exists projects_set_search_blob on public.projects;
create trigger projects_set_search_blob
  before insert or update on public.projects
  for each row execute function public.projects_set_search_blob();

create index if not exists projects_search_blob_trgm_idx
  on public.projects using gin (search_blob gin_trgm_ops);

-- Backfill existing rows. Disable the updated_at trigger first so backfilling
-- doesn't bump every row's timestamp (which would reorder the projects list).
-- The search_blob trigger still fires and computes the value from the row.
alter table public.projects disable trigger projects_set_updated_at;
update public.projects set search_blob = '';
alter table public.projects enable trigger projects_set_updated_at;

-- ----------------------------------------------------------------------------
-- notes.search_blob  (title + reference + body)
-- ----------------------------------------------------------------------------
alter table public.notes add column if not exists search_blob text;

create or replace function public.notes_set_search_blob()
returns trigger
language plpgsql
as $$
begin
  new.search_blob := lower(concat_ws(' ', new.title, new.reference, new.body));
  return new;
end;
$$;

drop trigger if exists notes_set_search_blob on public.notes;
create trigger notes_set_search_blob
  before insert or update on public.notes
  for each row execute function public.notes_set_search_blob();

create index if not exists notes_search_blob_trgm_idx
  on public.notes using gin (search_blob gin_trgm_ops);

alter table public.notes disable trigger notes_set_updated_at;
update public.notes set search_blob = '';
alter table public.notes enable trigger notes_set_updated_at;

-- ----------------------------------------------------------------------------
-- pa_recs.search_blob  (event + site + title + key_learnings + references + points)
-- ----------------------------------------------------------------------------
alter table public.pa_recs add column if not exists search_blob text;

create or replace function public.pa_recs_set_search_blob()
returns trigger
language plpgsql
as $$
begin
  new.search_blob := lower(concat_ws(' ',
    new.event,
    new.site,
    new.title,
    new.key_learnings,
    array_to_string(new."references", ' '),
    array_to_string(new.points, ' ')
  ));
  return new;
end;
$$;

drop trigger if exists pa_recs_set_search_blob on public.pa_recs;
create trigger pa_recs_set_search_blob
  before insert or update on public.pa_recs
  for each row execute function public.pa_recs_set_search_blob();

create index if not exists pa_recs_search_blob_trgm_idx
  on public.pa_recs using gin (search_blob gin_trgm_ops);

alter table public.pa_recs disable trigger pa_recs_set_updated_at;
update public.pa_recs set search_blob = '';
alter table public.pa_recs enable trigger pa_recs_set_updated_at;

-- ----------------------------------------------------------------------------
-- pa_tasks.search_blob  (title + each step's text)
-- ----------------------------------------------------------------------------
alter table public.pa_tasks add column if not exists search_blob text;

create or replace function public.pa_tasks_set_search_blob()
returns trigger
language plpgsql
as $$
begin
  new.search_blob := lower(concat_ws(' ',
    new.title,
    (select string_agg(step ->> 'text', ' ')
       from jsonb_array_elements(coalesce(new.steps, '[]'::jsonb)) as step)
  ));
  return new;
end;
$$;

drop trigger if exists pa_tasks_set_search_blob on public.pa_tasks;
create trigger pa_tasks_set_search_blob
  before insert or update on public.pa_tasks
  for each row execute function public.pa_tasks_set_search_blob();

create index if not exists pa_tasks_search_blob_trgm_idx
  on public.pa_tasks using gin (search_blob gin_trgm_ops);

alter table public.pa_tasks disable trigger pa_tasks_set_updated_at;
update public.pa_tasks set search_blob = '';
alter table public.pa_tasks enable trigger pa_tasks_set_updated_at;

-- ----------------------------------------------------------------------------
-- search_everything(): one unified, RLS-scoped result set across all four
-- tables. Returns a uniform row the UI can render and link to.
--
-- `q` is matched as a case-insensitive substring; an empty `q` matches every
-- row, so the same function doubles as a pure filter surface (e.g. "all tasks
-- in project X"). All arguments except `q` are optional filters:
--   types            - restrict to these result types, or null for all
--   project_ids      - restrict to items in these projects, or null for all
--   include_archived - when false, drop archived projects and items whose
--                      project is archived (inbox notes are always kept)
--   from_date/to_date- inclusive created_at bounds, or null for open-ended
--   max_results      - hard cap (clamped to 1..500)
--
-- SECURITY INVOKER (the default) is deliberate: the function runs as the
-- calling user so each table's RLS policy still fences rows to their owner.
-- Do NOT make this SECURITY DEFINER — that would bypass RLS.
-- ----------------------------------------------------------------------------
create or replace function public.search_everything(
  q text,
  types text[] default null,
  project_ids uuid[] default null,
  include_archived boolean default true,
  from_date timestamptz default null,
  to_date timestamptz default null,
  max_results int default 100
)
returns table (
  type text,
  id uuid,
  project_id uuid,
  title text,
  snippet text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with args as (
    select '%' || lower(coalesce(q, '')) || '%' as pat
  )
  select r.type, r.id, r.project_id, r.title, r.snippet, r.created_at
  from (
    -- Projects
    select 'project'::text as type, p.id, p.id as project_id,
           p.title,
           left(coalesce(p.description, ''), 240) as snippet,
           p.created_at
    from public.projects p, args
    where p.search_blob like args.pat
      and (types is null or 'project' = any(types))
      and (project_ids is null or p.id = any(project_ids))
      and (include_archived or p.status <> 'archived')
      and (from_date is null or p.created_at >= from_date)
      and (to_date is null or p.created_at <= to_date)

    union all

    -- Notes (project_id may be null for unfiled inbox notes)
    select 'note'::text, n.id, n.project_id,
           coalesce(nullif(n.title, ''), left(n.body, 80)),
           left(n.body, 240),
           n.created_at
    from public.notes n
    left join public.projects np on np.id = n.project_id, args
    where n.search_blob like args.pat
      and (types is null or 'note' = any(types))
      and (project_ids is null or n.project_id = any(project_ids))
      and (include_archived or np.id is null or np.status <> 'archived')
      and (from_date is null or n.created_at >= from_date)
      and (to_date is null or n.created_at <= to_date)

    union all

    -- Records
    select 'record'::text, rec.id, rec.project_id,
           rec.title,
           left(coalesce(rec.key_learnings,
                         array_to_string(rec.points, ' · ')), 240),
           rec.created_at
    from public.pa_recs rec
    join public.projects rp on rp.id = rec.project_id, args
    where rec.search_blob like args.pat
      and (types is null or 'record' = any(types))
      and (project_ids is null or rec.project_id = any(project_ids))
      and (include_archived or rp.status <> 'archived')
      and (from_date is null or rec.created_at >= from_date)
      and (to_date is null or rec.created_at <= to_date)

    union all

    -- Tasks
    select 'task'::text, t.id, t.project_id,
           t.title,
           left(coalesce(
             (select string_agg(step ->> 'text', ' · ')
                from jsonb_array_elements(coalesce(t.steps, '[]'::jsonb)) as step),
             ''), 240),
           t.created_at
    from public.pa_tasks t
    join public.projects tp on tp.id = t.project_id, args
    where t.search_blob like args.pat
      and (types is null or 'task' = any(types))
      and (project_ids is null or t.project_id = any(project_ids))
      and (include_archived or tp.status <> 'archived')
      and (from_date is null or t.created_at >= from_date)
      and (to_date is null or t.created_at <= to_date)
  ) r
  order by r.created_at desc
  limit greatest(1, least(coalesce(max_results, 100), 500));
$$;

grant execute on function public.search_everything(
  text, text[], uuid[], boolean, timestamptz, timestamptz, int
) to authenticated;
