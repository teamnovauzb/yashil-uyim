insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, null, null)
on conflict (id) do update
  set public = true, file_size_limit = null, allowed_mime_types = null;

drop policy if exists "public media all" on storage.objects;
create policy "public media all" on storage.objects
  for all to public
  using (bucket_id = 'media') with check (bucket_id = 'media');
