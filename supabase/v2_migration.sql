-- SHAKH SUPER v2 additions
create table if not exists public.platform_settings(
  id boolean primary key default true,
  platform_commission_percent numeric(5,2) not null default 5,
  default_delivery_fee numeric(14,2) not null default 5000,
  currency text not null default 'IQD',
  default_language text not null default 'ku',
  updated_at timestamptz default now()
);

create table if not exists public.role_permissions(
  role public.app_role not null,
  permission text not null,
  primary key(role, permission)
);

create table if not exists public.audit_logs(
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

insert into public.platform_settings(id) values(true)
on conflict (id) do nothing;

insert into public.role_permissions(role, permission) values
('super_admin','*'),
('admin','manage_assigned_sections'),
('admin','manage_posts'),
('captain','manage_own_deliveries'),
('captain','create_captain'),
('restaurant','create_posts'),
('supermarket','create_posts'),
('fashion','create_posts'),
('beauty','create_posts'),
('car_dealer','create_posts'),
('customer','create_car_posts'),
('customer','create_orders')
on conflict do nothing;

alter table public.platform_settings enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_logs enable row level security;

-- Policies are installed by v3_migration.sql after it detects legacy columns.
