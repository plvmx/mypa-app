-- ============================================================================
-- 0011_pa_task_step_images.sql — pa-task-step-images storage bucket
--
-- Each TaskStep (inside pa_tasks.steps jsonb) can now carry image paths,
-- mirroring pa_recs.images. No pa_tasks table grant is needed here — step
-- images live inside the existing `steps` jsonb column, not a new one. A
-- separate bucket (rather than reusing pa-rec-images) keeps deleting a
-- task's images independent of a record's; same per-user-folder RLS pattern
-- as the pa-rec-images bucket in 0005_pa_recs.sql. Run this in the Supabase
-- SQL Editor after 0001-0010.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('pa-task-step-images', 'pa-task-step-images', false)
on conflict (id) do nothing;

drop policy if exists "Users manage their own pa_task step images" on storage.objects;
create policy "Users manage their own pa_task step images"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'pa-task-step-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'pa-task-step-images' and (storage.foldername(name))[1] = auth.uid()::text);
