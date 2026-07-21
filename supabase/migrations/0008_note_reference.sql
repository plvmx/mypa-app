-- ============================================================================
-- 0008_note_reference.sql — add a Reference field to notes
--
-- Notes gain a `reference` text column (e.g. a URL or citation) alongside the
-- existing `body`. Nullable, no default needed beyond null since existing
-- rows have nothing to backfill.
-- ============================================================================

alter table public.notes add column if not exists reference text;
