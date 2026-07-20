-- ============================================================================
-- 0007_task_scheduling.sql — adds scheduling, reminders, and time tracking to
-- pa_tasks.
--
-- `due_at`/`remind_at` are plain nullable timestamps set directly by the
-- service layer (no relative-offset logic) — reminders are surfaced in-app
-- only for now (a "Today" view + badges); actual push/email delivery is a
-- separate future slice (see CLAUDE.md roadmap item 6).
--
-- `time_entries` is jsonb, mirroring the `steps` column already added in
-- 0006_pa_tasks.sql: an ordered array of `{started_at, ended_at}`, with
-- `ended_at: null` meaning that session's timer is still running. Run this
-- in the Supabase SQL Editor after 0001-0006.
-- ============================================================================

alter table public.pa_tasks
  add column if not exists due_at timestamptz,
  add column if not exists remind_at timestamptz,
  add column if not exists time_entries jsonb not null default '[]';

-- restore_snapshot() already does `select *` into jsonb_populate_recordset,
-- so these new columns round-trip through snapshots with no function changes
-- needed — they just need to exist on the table before a snapshot is restored.
