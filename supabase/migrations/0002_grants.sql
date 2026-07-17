-- ============================================================================
-- 0002_grants.sql — table-level grants for the authenticated role
--
-- With "Automatically expose new tables" left OFF in Project Settings → Data
-- API (the more conservative default), Supabase does not auto-grant base
-- table privileges to `authenticated` for new tables — only the RLS policies
-- from 0001_init.sql were created, with no underlying GRANT. Postgres checks
-- table-level GRANTs before RLS is ever evaluated, so every query failed with
-- "permission denied for table projects" / "...notes".
--
-- RLS (auth.uid() = user_id) remains the actual per-row access boundary;
-- these grants only give the authenticated role permission to attempt the
-- query in the first place. The app never touches these tables as `anon`,
-- so no grant is made to that role.
-- ============================================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
