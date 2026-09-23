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
        public.current_user_role()::text in ('super_admin', 'admin')
        or (public.current_user_role()::text = 'restaurant' and category::text = 'restaurant')
        or (public.current_user_role()::text = 'supermarket' and category::text = 'supermarket')
        or (public.current_user_role()::text = 'fashion' and category::text = 'fashion')
        or (public.current_user_role()::text = 'beauty' and category::text = 'beauty')
        or (public.current_user_role()::text = 'car_dealer' and category::text = 'car_dealer')
        or (public.current_user_role()::text = 'customer' and category::text = 'car_dealer')
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
