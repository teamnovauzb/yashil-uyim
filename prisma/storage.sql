-- Public receipts bucket with no MIME/size restrictions
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', true, null, null)
on conflict (id) do update
  set public = true,
      file_size_limit = null,
      allowed_mime_types = null;

-- Reset receipt policies
drop policy if exists "anon upload receipts" on storage.objects;
drop policy if exists "anon read receipts" on storage.objects;
drop policy if exists "anon update receipts" on storage.objects;
drop policy if exists "public receipts all" on storage.objects;

-- Single broad policy: anyone (anon + authenticated) can read/write in receipts
create policy "public receipts all" on storage.objects
  for all
  to public
  using (bucket_id = 'receipts')
  with check (bucket_id = 'receipts');
