-- SHAKH SUPER role-scoped posting rules
-- Run after schema.sql and v3_migration.sql (and after rbac_wallet_migration.sql if used).
-- No rows are deleted. Existing posts remain untouched.

begin;

-- Canonical posting permissions. Super admin can publish in every marketplace section;
-- each merchant is limited to its own section; customers can publish only car-sale posts.
insert into public.role_permissions(role, permission) values
  ('super_admin', 'create_posts'),
  ('admin', 'create_posts'),
  ('restaurant', 'create_posts'),
  ('supermarket', 'create_posts'),
  ('fashion', 'create_posts'),
  ('beauty', 'create_posts'),
  ('car_dealer', 'create_posts'),
  ('customer', 'create_car_posts')
on conflict (role, permission) do nothing;

-- Replace generic post-insert policies with category-aware checks.
drop policy if exists "users create permitted posts" on public.posts;
drop policy if exists "users create own posts" on public.posts;
drop policy if exists "shakh posts permitted insert" on public.posts;

do $$
declare owner_column text;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='user_id') then
    owner_column := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='owner_id') then
    owner_column := 'owner_id';
  else
    raise exception 'posts owner column is missing';
  end if;

  execute format($policy$
    create policy "shakh posts role scoped insert" on public.posts
    for insert
    with check (
      auth.uid() = %I
      and (
        public.current_user_role() in ('super_admin'::public.app_role, 'admin'::public.app_role)
        or (public.current_user_role() = 'restaurant'::public.app_role and category = 'restaurant'::public.app_role)
        or (public.current_user_role() = 'supermarket'::public.app_role and category = 'supermarket'::public.app_role)
        or (public.current_user_role() = 'fashion'::public.app_role and category = 'fashion'::public.app_role)
        or (public.current_user_role() = 'beauty'::public.app_role and category = 'beauty'::public.app_role)
        or (public.current_user_role() = 'car_dealer'::public.app_role and category = 'car_dealer'::public.app_role)
        or (public.current_user_role() = 'customer'::public.app_role and category = 'car_dealer'::public.app_role)
      )
    )
  $policy$, owner_column);
end $$;

-- Helpful index for role/category browsing and moderation.
create index if not exists posts_category_status_created_idx
  on public.posts(category, status, created_at desc);

commit;

-- Verification: inspect the final insert policy after the migration.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='posts' and cmd='INSERT';
