-- Repair profiles for existing Auth users and keep future signups in sync.
-- Run this once in the Supabase SQL Editor.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New customer'),
    coalesce(nullif(trim(new.phone), ''), ''),
    'customer'::public.app_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, phone, role)
select
  users.id,
  coalesce(nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''), 'New customer'),
  coalesce(nullif(trim(users.phone), ''), ''),
  'customer'::public.app_role
from auth.users as users
on conflict (id) do nothing;
