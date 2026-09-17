-- SHAKH SUPER platform services: Storage and Realtime
-- Run after the core schema/migrations. Never expose a service_role key in Vercel.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public product images" on storage.objects;
drop policy if exists "authenticated upload product images" on storage.objects;
drop policy if exists "users update product images" on storage.objects;
drop policy if exists "users delete product images" on storage.objects;

create policy "public product images" on storage.objects
for select using (bucket_id = 'product-images');
create policy "authenticated upload product images" on storage.objects
for insert to authenticated
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update product images" on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and owner_id::text = auth.uid()::text)
with check (bucket_id = 'product-images' and owner_id::text = auth.uid()::text);
create policy "users delete product images" on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and owner_id::text = auth.uid()::text);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

alter table public.posts replica identity full;
alter table public.orders replica identity full;
