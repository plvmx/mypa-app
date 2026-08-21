-- ============================================================================
-- 0012_remove_time_tracking.sql — removes the time-tracking feature added in
-- 0007_task_scheduling.sql. The app no longer offers a start/stop timer on
-- tasks, so `time_entries` is dead weight on every row. Run this in the
-- Supabase SQL Editor after 0001-0011.
--
-- restore_snapshot() does `select *` into jsonb_populate_recordset against
-- the current `pa_tasks` row type, so it round-trips fine post-drop even for
-- older snapshots whose jsonb still has a "time_entries" key — extra keys in
-- the source jsonb that don't match a column are simply ignored.
-- ============================================================================

alter table public.pa_tasks
  drop column if exists time_entries;
