-- SHAKH SUPER initial schema
create extension if not exists "pgcrypto";
create type public.app_role as enum ('super_admin','admin','captain','restaurant','supermarket','fashion','beauty','car_dealer','customer');
create type public.post_status as enum ('active','blocked','deleted');
create type public.order_status as enum ('pending','accepted','preparing','out_for_delivery','delivered','cancelled');

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 phone text,
 role public.app_role not null default 'customer',
 created_at timestamptz default now()
);
create table if not exists public.posts(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references public.profiles(id) on delete set null,
 category public.app_role not null,
 title text not null,
 description text,
 image_url text,
 price numeric(14,2) not null default 0,
 currency text not null default 'IQD',
 status public.post_status not null default 'active',
 created_at timestamptz default now()
);
create table if not exists public.orders(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid references public.profiles(id),
 captain_id uuid references public.profiles(id),
 status public.order_status not null default 'pending',
 payment_method text not null default 'cash_on_delivery',
 products_total numeric(14,2) not null default 0,
 delivery_fee numeric(14,2) not null default 0,
 platform_fee numeric(14,2) not null default 0,
 merchant_amount numeric(14,2) not null default 0,
 captain_amount numeric(14,2) not null default 0,
 total numeric(14,2) not null default 0,
 delivery_address text,
 created_at timestamptz default now()
);
create table if not exists public.order_items(
 id uuid primary key default gen_random_uuid(),
 order_id uuid references public.orders(id) on delete cascade,
 post_id uuid references public.posts(id),
 quantity integer not null default 1,
 unit_price numeric(14,2) not null default 0
);
create table if not exists public.wallet_transactions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid references public.profiles(id),
 order_id uuid references public.orders(id),
 kind text not null,
 amount numeric(14,2) not null,
 note text,
 created_at timestamptz default now()
);
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wallet_transactions enable row level security;
create policy "public active posts" on public.posts for select using(status='active');
create policy "users create own posts" on public.posts for insert with check(auth.uid()=owner_id);
create policy "owners update own posts" on public.posts for update using(auth.uid()=owner_id);
create policy "owners delete own posts" on public.posts for delete using(auth.uid()=owner_id);
create policy "users see own profile" on public.profiles for select using(auth.uid()=id);
create policy "users update own profile" on public.profiles for update using(auth.uid()=id);
create policy "customers create orders" on public.orders for insert with check(auth.uid()=customer_id);
create policy "users see related orders" on public.orders for select using(auth.uid()=customer_id or auth.uid()=captain_id);
-- For production, add SECURITY DEFINER functions for super_admin/admin permissions.
