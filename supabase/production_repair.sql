-- SHAKH SUPER production security repair
-- Run after schema.sql, v2_migration.sql, v3_enum_fix.sql, and v3_migration.sql.
-- This file repairs SHAKH RLS, function privileges, Storage policies, and Realtime.
-- It does not drop or alter auth.users, identities, passwords, or Auth configuration.
-- It does not use DROP ... CASCADE and does not insert mock/application data.

begin;

-- ============================================================
-- PHASE 01 - Preflight validation
-- ============================================================
-- Fail before changing policies when the known application contract is absent.
do $$
declare
  required_table text;
  required_column text;
begin
  if to_regclass('auth.users') is null then
    raise exception 'Preflight failed: auth.users is missing. No changes were made.';
  end if;

  foreach required_table in array array[
    'profiles', 'posts', 'orders', 'order_items',
    'wallet_transactions', 'role_permissions',
    'platform_settings', 'audit_logs'
  ] loop
    if to_regclass(format('public.%s', required_table)) is null then
      raise exception 'Preflight failed: public.% table is missing. No changes were made.', required_table;
    end if;
  end loop;

  foreach required_column in array array[
    'profiles.id', 'profiles.role',
    'posts.id', 'posts.category', 'posts.status',
    'orders.id', 'orders.customer_id', 'orders.captain_id', 'orders.status',
    'order_items.id', 'order_items.order_id',
    'wallet_transactions.user_id',
    'role_permissions.role', 'role_permissions.permission'
  ] loop
    if not exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and format('%s.%s', c.table_name, c.column_name) = required_column
    ) then
      raise exception 'Preflight failed: required column public.% is missing. No changes were made.', required_column;
    end if;
  end loop;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name in ('actor_id', 'user_id')
  ) then
    raise exception 'Preflight failed: public.audit_logs needs actor_id or user_id. No changes were made.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'user_id'
  ) then
    raise exception 'Preflight failed: public.posts.user_id is missing. This repair targets the production posts schema.';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'app_role'
  ) then
    raise exception 'Preflight failed: public.app_role is missing. Run schema.sql first.';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'post_status'
  ) then
    raise exception 'Preflight failed: public.post_status is missing. Run schema.sql first.';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'order_status'
  ) then
    raise exception 'Preflight failed: public.order_status is missing. Run schema.sql first.';
  end if;
end $$;

-- ============================================================
-- PHASE 02 - Preserve role/user relationships
-- ============================================================
-- No profile rows are deleted or rewritten. Existing role assignments remain intact.
-- Existing role_permissions rows are preserved; only missing canonical permissions
-- are added below with ON CONFLICT DO NOTHING.

-- ============================================================
-- PHASE 03 - Remove only old SHAKH policies
-- ============================================================
-- Policies must be removed before replacement. Functions are intentionally retained:
-- CREATE OR REPLACE below does not create a dependency-drop failure.
do $$
declare
  policy_name text;
  policy_table text;
begin
  foreach policy_name in array array[
    'public active posts',
    'public can read active posts',
    'users create own posts',
    'owners update own posts',
    'owners delete posts',
    'owners delete own posts',
    'users create permitted posts',
    'owners or admins update posts',
    'owners or admins delete posts',
    'users see own profile',
    'users update own profile',
    'admins manage profiles',
    'customers create orders',
    'users see related orders',
    'captains update assigned orders',
    'users see own order items',
    'users create order items',
    'users see own wallet transactions',
    'public can read platform settings',
    'authenticated can read own role permissions',
    'actors can create audit logs',
    'shakh profiles own select',
    'shakh profiles own update',
    'shakh profiles admin manage',
    'shakh posts active select',
    'shakh posts permitted insert',
    'shakh posts owner admin update',
    'shakh posts owner admin delete',
    'shakh orders customer insert',
    'shakh orders related select',
    'shakh orders captain admin update',
    'shakh order items related select',
    'shakh order items customer insert',
    'shakh wallet own select',
    'shakh settings public select',
    'shakh permissions own role select',
    'shakh audit actor insert'
  ] loop
    foreach policy_table in array array[
      'posts', 'profiles', 'orders', 'order_items',
      'wallet_transactions', 'platform_settings',
      'role_permissions', 'audit_logs'
    ] loop
      execute format('drop policy if exists %I on public.%I', policy_name, policy_table);
    end loop;
  end loop;
end $$;

-- ============================================================
-- PHASE 04 - Repair authorization functions without dropping them
-- ============================================================
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.role::text::public.app_role
  from public.profiles p
  where p.id::text = auth.uid()::text
  limit 1;
$$;

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(public.current_user_role() = required_role, false);
$$;

create or replace function public.has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.role_permissions rp
    where rp.role::text = public.current_user_role()::text
      and (rp.permission = '*' or rp.permission = required_permission)
  );
$$;

-- Keep the signup trigger function compatible with the existing Auth trigger.
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
exception when others then
  raise exception using
    message = 'handle_new_user failed while creating public.profiles',
    detail = sqlerrm,
    hint = 'Check public.profiles constraints, app_role values, and the Auth trigger permissions.';
end;
$$;

-- Restrict direct function calls while retaining execution required by RLS and Auth.
revoke execute on function public.current_user_role() from public;
revoke execute on function public.has_role(public.app_role) from public;
revoke execute on function public.has_permission(text) from public;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.has_role(public.app_role) to authenticated, service_role;
grant execute on function public.has_permission(text) to authenticated, service_role;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;

-- ============================================================
-- PHASE 05 - Ensure the existing Auth trigger is present
-- ============================================================
-- This touches only the SHAKH trigger on auth.users; auth.users data/configuration
-- remains untouched. Existing real users are not recreated.
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass
      and t.tgname = 'on_auth_user_created'
      and not t.tgisinternal
  ) then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
  end if;
end $$;

-- ============================================================
-- PHASE 06 - Preserve the canonical application permissions
-- ============================================================
insert into public.role_permissions (role, permission) values
  ('super_admin', '*'),
  ('admin', 'manage_assigned_sections'),
  ('admin', 'manage_posts'),
  ('admin', 'manage_users'),
  ('admin', 'manage_orders'),
  ('admin', 'manage_wallet'),
  ('captain', 'manage_own_deliveries'),
  ('captain', 'create_captain'),
  ('restaurant', 'create_posts'),
  ('supermarket', 'create_posts'),
  ('fashion', 'create_posts'),
  ('beauty', 'create_posts'),
  ('car_dealer', 'create_posts'),
  ('customer', 'create_car_posts'),
  ('customer', 'create_orders')
on conflict (role, permission) do nothing;

-- ============================================================
-- PHASE 07 - Enable RLS on every sensitive SHAKH table
-- ============================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.platform_settings enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================
-- PHASE 08 - Create explicit RLS policies
-- ============================================================
-- Make this phase safe to rerun independently after a previous partial run.
drop policy if exists "shakh profiles own select" on public.profiles;
drop policy if exists "shakh profiles own update" on public.profiles;
drop policy if exists "shakh profiles admin manage" on public.profiles;
drop policy if exists "shakh posts active select" on public.posts;
drop policy if exists "shakh posts permitted insert" on public.posts;
drop policy if exists "shakh posts owner admin update" on public.posts;
drop policy if exists "shakh posts owner admin delete" on public.posts;
drop policy if exists "shakh orders customer insert" on public.orders;
drop policy if exists "shakh orders related select" on public.orders;
drop policy if exists "shakh orders captain admin update" on public.orders;
drop policy if exists "shakh order items related select" on public.order_items;
drop policy if exists "shakh order items customer insert" on public.order_items;
drop policy if exists "shakh wallet own select" on public.wallet_transactions;
drop policy if exists "shakh settings public select" on public.platform_settings;
drop policy if exists "shakh permissions own role select" on public.role_permissions;
drop policy if exists "shakh audit actor insert" on public.audit_logs;

-- Profiles: users can read themselves. Self-service updates cannot change role.
create policy "shakh profiles own select"
on public.profiles for select
using (auth.uid()::text = id::text or public.has_permission('manage_users'));

create policy "shakh profiles own update"
on public.profiles for update
using (auth.uid()::text = id::text or public.has_permission('manage_users'))
with check (
  public.has_permission('manage_users')
  or (auth.uid()::text = id::text and role::text = public.current_user_role()::text)
);

create policy "shakh profiles admin manage"
on public.profiles for all
using (public.has_permission('manage_users'))
with check (public.has_permission('manage_users'));

-- Posts: active listings are public; private/inactive listings require ownership/admin access.
create policy "shakh posts active select"
on public.posts for select
using (status = 'active' or auth.uid()::text = user_id::text or public.has_permission('manage_posts'));

create policy "shakh posts permitted insert"
on public.posts for insert
with check (
  auth.uid()::text = user_id::text
  and (
    public.has_permission('create_posts')
    or (public.has_permission('create_car_posts') and category = 'car_dealer')
  )
);

create policy "shakh posts owner admin update"
on public.posts for update
using (auth.uid()::text = user_id::text or public.has_permission('manage_posts'))
with check (
  public.has_permission('manage_posts')
  or (
    auth.uid()::text = user_id::text
    and (
      public.has_permission('create_posts')
      or (public.has_permission('create_car_posts') and category = 'car_dealer')
    )
  )
);

create policy "shakh posts owner admin delete"
on public.posts for delete
using (auth.uid()::text = user_id::text or public.has_permission('manage_posts'));

-- Orders: customer creates own orders; customers/captains/admins see only related rows.
create policy "shakh orders customer insert"
on public.orders for insert
with check (
  auth.uid()::text = customer_id::text
  and public.has_permission('create_orders')
);

create policy "shakh orders related select"
on public.orders for select
using (
  auth.uid()::text = customer_id::text
  or auth.uid()::text = captain_id::text
  or public.has_permission('manage_orders')
);

create policy "shakh orders captain admin update"
on public.orders for update
using (
  auth.uid()::text = captain_id::text
  or public.has_permission('manage_orders')
)
with check (
  auth.uid()::text = captain_id::text
  or public.has_permission('manage_orders')
);

-- Order items inherit visibility from their parent order.
create policy "shakh order items related select"
on public.order_items for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.customer_id::text = auth.uid()::text
        or o.captain_id::text = auth.uid()::text
        or public.has_permission('manage_orders')
      )
  )
);

create policy "shakh order items customer insert"
on public.order_items for insert
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.customer_id::text = auth.uid()::text
  )
);

-- Wallet is read-only to clients; writes remain server/service-role controlled.
create policy "shakh wallet own select"
on public.wallet_transactions for select
using (
  user_id::text = auth.uid()::text
  or public.has_permission('manage_wallet')
);

-- Settings contain public display defaults. No client write policy is granted.
create policy "shakh settings public select"
on public.platform_settings for select
using (true);

-- A user can inspect only permissions for their own current role.
create policy "shakh permissions own role select"
on public.role_permissions for select
using (
  role::text = public.current_user_role()::text
  or public.has_permission('manage_users')
);

-- Audit history is append-only for the actor; support both legacy column names.
do $$
declare
  actor_column text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'actor_id'
  ) then
    actor_column := 'actor_id';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'user_id'
  ) then
    actor_column := 'user_id';
  else
    raise exception 'Cannot create audit policy: actor_id or user_id is missing.';
  end if;

  execute format(
    'create policy "shakh audit actor insert" on public.audit_logs for insert with check (auth.uid()::text = %I::text)',
    actor_column
  );
end $$;

-- ============================================================
-- PHASE 09 - Repair Storage policies for product-images only
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public product images" on storage.objects;
drop policy if exists "authenticated upload product images" on storage.objects;
drop policy if exists "users update product images" on storage.objects;
drop policy if exists "users delete product images" on storage.objects;
drop policy if exists "shakh product images public read" on storage.objects;
drop policy if exists "shakh product images user upload" on storage.objects;
drop policy if exists "shakh product images user update" on storage.objects;
drop policy if exists "shakh product images user delete" on storage.objects;

create policy "shakh product images public read"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "shakh product images user upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "shakh product images user update"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and owner_id::text = auth.uid()::text
)
with check (
  bucket_id = 'product-images'
  and owner_id::text = auth.uid()::text
);

create policy "shakh product images user delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and owner_id::text = auth.uid()::text
);

-- ============================================================
-- PHASE 10 - Repair Realtime without duplicate publication entries
-- ============================================================
do $$
begin
  if to_regclass('public.posts') is not null
     and exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'posts'
     ) then
    alter publication supabase_realtime add table public.posts;
  end if;

  if to_regclass('public.orders') is not null
     and exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'orders'
     ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

alter table public.posts replica identity full;
alter table public.orders replica identity full;

-- ============================================================
-- PHASE 11 - Verification and fail-safe checks
-- ============================================================
do $$
declare
  missing_roles text[];
  expected_policy_count integer;
  actual_policy_count integer;
begin
  select array_agg(required_role order by required_role)
  into missing_roles
  from (
    select required_role
    from unnest(array[
      'super_admin', 'admin', 'captain', 'restaurant',
      'supermarket', 'fashion', 'beauty', 'car_dealer', 'customer'
    ]) as required_role
    except
    select e.enumlabel
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'app_role'
  ) missing;

  if missing_roles is not null then
    raise exception 'Verification failed: missing application roles: %', missing_roles;
  end if;

  if exists (
    select 1 from public.profiles p
    left join auth.users u on u.id = p.id
    where u.id is null
  ) then
    raise exception 'Verification failed: a profile does not reference auth.users.';
  end if;

  select count(*)
  into expected_policy_count
  from (values
    ('profiles', 'shakh profiles own select'),
    ('profiles', 'shakh profiles own update'),
    ('profiles', 'shakh profiles admin manage'),
    ('posts', 'shakh posts active select'),
    ('posts', 'shakh posts permitted insert'),
    ('posts', 'shakh posts owner admin update'),
    ('posts', 'shakh posts owner admin delete'),
    ('orders', 'shakh orders customer insert'),
    ('orders', 'shakh orders related select'),
    ('orders', 'shakh orders captain admin update'),
    ('order_items', 'shakh order items related select'),
    ('order_items', 'shakh order items customer insert'),
    ('wallet_transactions', 'shakh wallet own select'),
    ('platform_settings', 'shakh settings public select'),
    ('role_permissions', 'shakh permissions own role select'),
    ('audit_logs', 'shakh audit actor insert')
  ) expected(table_name, policy_name);

  select count(*)
  into actual_policy_count
  from pg_policies p
  where p.schemaname = 'public'
    and (p.tablename, p.policyname) in (
      ('profiles', 'shakh profiles own select'),
      ('profiles', 'shakh profiles own update'),
      ('profiles', 'shakh profiles admin manage'),
      ('posts', 'shakh posts active select'),
      ('posts', 'shakh posts permitted insert'),
      ('posts', 'shakh posts owner admin update'),
      ('posts', 'shakh posts owner admin delete'),
      ('orders', 'shakh orders customer insert'),
      ('orders', 'shakh orders related select'),
      ('orders', 'shakh orders captain admin update'),
      ('order_items', 'shakh order items related select'),
      ('order_items', 'shakh order items customer insert'),
      ('wallet_transactions', 'shakh wallet own select'),
      ('platform_settings', 'shakh settings public select'),
      ('role_permissions', 'shakh permissions own role select'),
      ('audit_logs', 'shakh audit actor insert')
    );

  if actual_policy_count <> expected_policy_count then
    raise exception 'Verification failed: expected % SHAKH policies, found %.', expected_policy_count, actual_policy_count;
  end if;

  if not exists (
    select 1 from pg_proc
    where oid = 'public.current_user_role()'::regprocedure
      and prosecdef
  ) then
    raise exception 'Verification failed: public.current_user_role() is not SECURITY DEFINER.';
  end if;

  if (select count(*) from pg_trigger where tgname = 'on_auth_user_created' and not tgisinternal) <> 1 then
    raise exception 'Verification failed: on_auth_user_created must exist exactly once.';
  end if;

  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'profiles', 'posts', 'orders', 'order_items',
        'wallet_transactions', 'platform_settings',
        'role_permissions', 'audit_logs'
      )
      and rowsecurity = false
  ) then
    raise exception 'Verification failed: one or more SHAKH tables do not have RLS enabled.';
  end if;
end $$;

commit;

-- Optional read-only post-run checks:
-- select schemaname, tablename, policyname from pg_policies where schemaname = 'public' order by tablename, policyname;
-- select * from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public';
-- select count(*) as invalid_profile_rows from public.profiles p left join auth.users u on u.id = p.id where u.id is null;
