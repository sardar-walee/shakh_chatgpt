-- SHAKH SUPER legacy database compatibility
-- Run after schema.sql, v2_migration.sql, and v3_migration.sql.
-- Every table is guarded so this is safe to run against an existing database.

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  role_id uuid,
  full_name text,
  phone text,
  email text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_roles (
  user_id uuid not null,
  role_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(), name text not null, name_ar text,
  name_en text, country text default 'Iraq', created_at timestamptz not null default now()
);
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(), city_id uuid, name text not null,
  delivery_fee numeric(14,2) not null default 0, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.system_settings (
  key text primary key, value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(), user_id uuid, seller_type text,
  business_name text, phone text, status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.seller_wallets (
  id uuid primary key default gen_random_uuid(), seller_id uuid, balance numeric(14,2) not null default 0,
  currency text not null default 'IQD', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(), user_id uuid, balance numeric(14,2) not null default 0,
  currency text not null default 'IQD', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid, seller_id uuid, wallet_id uuid,
  type text not null, amount numeric(14,2) not null default 0, status text not null default 'completed',
  reference_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(), user_id uuid, seller_id uuid,
  amount numeric(14,2) not null default 0, status text not null default 'pending',
  method text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), processed_at timestamptz
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(), seller_id uuid, name text not null,
  description text, phone text, address text, city_id uuid, zone_id uuid,
  image_url text, status text not null default 'active', created_at timestamptz not null default now()
);
create table if not exists public.restaurant_categories (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid, name text not null,
  sort_order integer not null default 0, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.supermarkets (
  id uuid primary key default gen_random_uuid(), seller_id uuid, name text not null,
  description text, phone text, address text, city_id uuid, zone_id uuid,
  image_url text, status text not null default 'active', created_at timestamptz not null default now()
);
create table if not exists public.supermarket_categories (
  id uuid primary key default gen_random_uuid(), supermarket_id uuid, name text not null,
  sort_order integer not null default 0, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(), name text not null, name_ar text, name_en text,
  parent_id uuid, category_type text, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), seller_id uuid, restaurant_id uuid, supermarket_id uuid,
  category_id uuid, name text not null, description text, image_url text, price numeric(14,2) not null default 0,
  stock integer not null default 0, currency text not null default 'IQD', status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid, category_id uuid,
  name text not null, description text, image_url text, price numeric(14,2) not null default 0,
  active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(), seller_id uuid, brand text, model text,
  year integer, price numeric(14,2) not null default 0, mileage integer, fuel_type text,
  transmission text, description text, city_id uuid, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.car_ads (
  id uuid primary key default gen_random_uuid(), car_id uuid, seller_id uuid, title text not null,
  description text, price numeric(14,2) not null default 0, status text not null default 'active',
  created_at timestamptz not null default now(), expires_at timestamptz
);
create table if not exists public.car_images (
  id uuid primary key default gen_random_uuid(), car_id uuid, image_url text not null,
  sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.car_packages (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  price numeric(14,2) not null default 0, duration_days integer, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.car_payments (
  id uuid primary key default gen_random_uuid(), car_id uuid, user_id uuid,
  amount numeric(14,2) not null default 0, status text not null default 'pending',
  payment_method text, created_at timestamptz not null default now()
);

create table if not exists public.captains (
  id uuid primary key default gen_random_uuid(), user_id uuid, name text, phone text,
  vehicle_type text, vehicle_number text, availability text not null default 'offline',
  city_id uuid, zone_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(), seller_id uuid, name text not null,
  description text, discount_percent numeric(5,2) not null default 0, starts_at timestamptz,
  ends_at timestamptz, status text not null default 'draft', created_at timestamptz not null default now()
);
create table if not exists public.commission_agreements (
  id uuid primary key default gen_random_uuid(), seller_id uuid, commission_percent numeric(5,2) not null default 5,
  starts_at timestamptz not null default now(), ends_at timestamptz, status text not null default 'active',
  created_at timestamptz not null default now()
);
create table if not exists public.commission_transactions (
  id uuid primary key default gen_random_uuid(), seller_id uuid, order_id uuid,
  amount numeric(14,2) not null default 0, commission_percent numeric(5,2) not null default 0,
  status text not null default 'pending', created_at timestamptz not null default now()
);
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, product_id uuid,
  post_id uuid, car_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid, title text not null, body text,
  type text, read_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), user_id uuid, seller_id uuid, product_id uuid,
  restaurant_id uuid, supermarket_id uuid, rating integer, comment text,
  status text not null default 'published', created_at timestamptz not null default now()
);

-- Useful indexes for the marketplace and delivery screens.
create index if not exists products_status_idx on public.products(status);
create index if not exists products_seller_id_idx on public.products(seller_id);
create index if not exists meals_restaurant_id_idx on public.meals(restaurant_id);
create index if not exists cars_status_idx on public.cars(status);
create index if not exists notifications_user_id_idx on public.notifications(user_id, created_at desc);
create index if not exists transactions_user_id_idx on public.transactions(user_id, created_at desc);
create index if not exists legacy_favorites_user_id_idx on public.favorites(user_id);
