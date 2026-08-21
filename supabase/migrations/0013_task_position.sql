-- ============================================================================
-- 0013_task_position.sql — adds a manual sort order to pa_tasks so open tasks
-- can be drag-reordered independently of due date.
--
-- `position` is a plain float, computed in the service layer rather than a
-- DB default (same house style as started_at/completed_at in
-- paTaskService.ts): new tasks get `Date.now()` so they land at the end of
-- the list; reordering an existing task recomputes only its own position as
-- the midpoint between its new neighbours (see lib/taskOrder.ts) — a drag
-- never touches any row but the one being moved.
--
-- Existing rows are backfilled from created_at (in the same ms-epoch scale
-- as Date.now()) so they keep their current chronological order until the
-- user actually drags something. Run this in the Supabase SQL Editor after
-- 0001-0012.
-- ============================================================================

alter table public.pa_tasks add column if not exists position double precision;

update public.pa_tasks
set position = extract(epoch from created_at) * 1000
where position is null;

alter table public.pa_tasks alter column position set not null;
alter table public.pa_tasks alter column position set default 0;
