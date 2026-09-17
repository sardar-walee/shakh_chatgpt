-- SHAKH SUPER v3: production-ready auth, roles, and RLS for existing projects

-- v3 can be run after an older schema without requiring v2 first.
create table if not exists public.role_permissions(
  role public.app_role not null,
  permission text not null,
  primary key(role, permission)
);
create table if not exists public.platform_settings(
  id boolean primary key default true,
  platform_commission_percent numeric(5,2) not null default 5,
  default_delivery_fee numeric(14,2) not null default 5000,
  currency text not null default 'IQD',
  default_language text not null default 'ku',
  updated_at timestamptz default now()
);
create table if not exists public.audit_logs(
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.phone, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$
  select role::text::public.app_role from public.profiles where id = auth.uid();
$$;

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_user_role() = required_role, false);
$$;

create or replace function public.has_permission(required_permission text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.role_permissions rp
    where rp.role::text = public.current_user_role()::text
      and (rp.permission = '*' or rp.permission = required_permission)
  );
$$;

insert into public.platform_settings(id) values (true) on conflict (id) do nothing;

-- Only seed enum labels that exist in this database. If admin was added by
-- v3_enum_fix.sql, run this migration again after that file is committed.
do $$
declare
  role_name text;
  permission_name text;
  permissions jsonb := jsonb_build_object(
    'super_admin', jsonb_build_array('*'),
    'admin', jsonb_build_array('manage_assigned_sections','manage_posts','manage_users','manage_orders','manage_wallet'),
    'captain', jsonb_build_array('manage_own_deliveries'),
    'restaurant', jsonb_build_array('create_posts'),
    'supermarket', jsonb_build_array('create_posts'),
    'fashion', jsonb_build_array('create_posts'),
    'beauty', jsonb_build_array('create_posts'),
    'car_dealer', jsonb_build_array('create_posts'),
    'customer', jsonb_build_array('create_orders')
  );
begin
  for role_name in
    select enumlabel
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'app_role'
  loop
    for permission_name in select jsonb_array_elements_text(permissions -> role_name)
    loop
      execute format(
        'insert into public.role_permissions(role, permission) values (%L, %L) on conflict (role, permission) do nothing',
        role_name, permission_name
      );
    end loop;
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.platform_settings enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "public active posts" on public.posts;
drop policy if exists "users create own posts" on public.posts;
drop policy if exists "owners update own posts" on public.posts;
drop policy if exists "owners delete own posts" on public.posts;
drop policy if exists "users create permitted posts" on public.posts;
drop policy if exists "owners or admins update posts" on public.posts;
drop policy if exists "owners or admins delete posts" on public.posts;
drop policy if exists "users see own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "customers create orders" on public.orders;
drop policy if exists "users see related orders" on public.orders;
drop policy if exists "captains update assigned orders" on public.orders;
drop policy if exists "users see own order items" on public.order_items;
drop policy if exists "users create order items" on public.order_items;
drop policy if exists "users see own wallet transactions" on public.wallet_transactions;
drop policy if exists "public can read platform settings" on public.platform_settings;
drop policy if exists "authenticated can read own role permissions" on public.role_permissions;
drop policy if exists "actors can create audit logs" on public.audit_logs;

do $$
declare
  owner_column text;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'posts' and column_name = 'owner_id') then
    owner_column := 'owner_id';
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'posts' and column_name = 'user_id') then
    owner_column := 'user_id';
  end if;

  execute 'create policy "public active posts" on public.posts for select using (true)';

  if owner_column is not null then
    execute format('create policy "users create permitted posts" on public.posts for insert with check (auth.uid() = %I and public.has_permission(''create_posts''))', owner_column);
    execute format('create policy "owners or admins update posts" on public.posts for update using (auth.uid() = %I or public.has_permission(''manage_posts'')) with check (auth.uid() = %I or public.has_permission(''manage_posts''))', owner_column, owner_column);
    execute format('create policy "owners or admins delete posts" on public.posts for delete using (auth.uid() = %I or public.has_permission(''manage_posts''))', owner_column);
  end if;
end $$;

create policy "users see own profile" on public.profiles for select using (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "admins manage profiles" on public.profiles for all using (public.has_permission('manage_users'));

do $$
declare
  customer_column text;
  captain_column text;
  order_item_has_order boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'customer_id') then
    customer_column := 'customer_id';
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'user_id') then
    customer_column := 'user_id';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'captain_id') then
    captain_column := 'captain_id';
  end if;

  if customer_column is not null then
    execute format('create policy "customers create orders" on public.orders for insert with check (auth.uid() = %I and public.has_permission(''create_orders''))', customer_column);
    if captain_column is not null then
      execute format('create policy "users see related orders" on public.orders for select using (auth.uid() = %I or auth.uid() = %I or public.has_permission(''manage_orders''))', customer_column, captain_column);
      execute format('create policy "captains update assigned orders" on public.orders for update using (auth.uid() = %I or public.has_permission(''manage_orders'')) with check (auth.uid() = %I or public.has_permission(''manage_orders''))', captain_column, captain_column);
    else
      execute format('create policy "users see related orders" on public.orders for select using (auth.uid() = %I or public.has_permission(''manage_orders''))', customer_column);
    end if;
  end if;

  order_item_has_order := exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'order_items' and column_name = 'order_id');
  if order_item_has_order and customer_column is not null then
    execute format('create policy "users see own order items" on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and (o.%I = auth.uid() or public.has_permission(''manage_orders''))))', customer_column);
    execute format('create policy "users create order items" on public.order_items for insert with check (exists (select 1 from public.orders o where o.id = order_id and o.%I = auth.uid()))', customer_column);
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wallet_transactions' and column_name = 'user_id') then
    execute 'create policy "users see own wallet transactions" on public.wallet_transactions for select using (auth.uid() = user_id or public.has_permission(''manage_wallet''))';
  end if;
end $$;
create policy "public can read platform settings" on public.platform_settings for select using (true);
create policy "authenticated can read own role permissions" on public.role_permissions for select using (
  role::text = public.current_user_role()::text
);
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'actor_id') then
    execute 'create policy "actors can create audit logs" on public.audit_logs for insert with check (auth.uid() = actor_id)';
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'user_id') then
    execute 'create policy "actors can create audit logs" on public.audit_logs for insert with check (auth.uid() = user_id)';
  else
    execute 'create policy "actors can create audit logs" on public.audit_logs for insert with check (true)';
  end if;
end $$;

