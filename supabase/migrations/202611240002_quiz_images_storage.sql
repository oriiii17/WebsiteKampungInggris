insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quiz-images', 'quiz-images', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view quiz images" on storage.objects;
create policy "Public can view quiz images" on storage.objects for select using (bucket_id = 'quiz-images');
