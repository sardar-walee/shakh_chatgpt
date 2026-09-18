-- Run this in Supabase SQL Editor after the user has signed up.
-- This changes only the role for the requested account; passwords are never stored here.
-- Some older projects have a profiles_role_check that predates super_admin.
begin;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_check'
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (
        role::text in (
          'super_admin', 'admin', 'captain', 'restaurant',
          'supermarket', 'fashion', 'beauty', 'car_dealer', 'customer'
        )
      ) not valid;
  end if;
end $$;

update public.profiles
set role = 'super_admin'
where id = (
  select id
  from auth.users
  where lower(email) = lower('shakh8002@gmail.com')
);

-- Verify the account was found and promoted.
select u.email, p.role
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('shakh8002@gmail.com');

commit;
