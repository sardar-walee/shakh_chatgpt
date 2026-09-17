-- Run this in Supabase SQL Editor after the user has signed up.
-- This changes only the role for the requested account; passwords are never stored here.
update public.profiles
set role = 'super_admin'::public.app_role
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
