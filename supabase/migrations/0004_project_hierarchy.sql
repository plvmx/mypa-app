-- ============================================================================
-- 0004_project_hierarchy.sql — nested sub-projects
--
-- Adds a self-referencing `parent_id` to `projects` so projects can nest
-- arbitrarily. `on delete restrict` mirrors the app-level rule enforced in
-- `projectService.deleteProject`: a project with children can't be deleted
-- until its sub-projects are moved or deleted first. No RLS/grant changes are
-- needed — the existing `auth.uid() = user_id` policy on `projects` already
-- covers the new column.
-- ============================================================================

alter table public.projects
  add column if not exists parent_id uuid references public.projects (id) on delete restrict;

create index if not exists projects_parent_id_idx on public.projects (parent_id);
