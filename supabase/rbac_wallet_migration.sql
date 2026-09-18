-- SHAKH SUPER RBAC, listing moderation, and wallet ledger upgrade
-- Run after schema.sql, v3_enum_fix.sql, v2_migration.sql, and v3_migration.sql.
-- Additive and rerunnable. Money mutations belong in trusted RPCs/service functions.

begin;

alter table public.posts
  add column if not exists featured boolean not null default false,
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz;

alter table public.wallet_transactions
  add column if not exists type text,
  add column if not exists status text not null default 'completed',
  add column if not exists reference_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Existing deployments may have either the baseline `kind` column, the newer
-- `type` column, or neither. Resolve that difference with dynamic SQL so the
-- migration parses successfully on every supported shape.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wallet_transactions'
      and column_name = 'kind'
  ) then
    execute 'update public.wallet_transactions set type = coalesce(type, kind) where type is null';
  end if;

  update public.wallet_transactions
  set type = 'transaction'
  where type is null;
end $$;

alter table public.wallet_transactions
  alter column type set not null;

create table if not exists public.wallet_accounts(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  currency text not null default 'IQD',
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_payout_requests(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_created_idx
  on public.wallet_transactions(user_id, created_at desc);
create index if not exists wallet_payout_requests_user_created_idx
  on public.wallet_payout_requests(user_id, created_at desc);
create index if not exists posts_moderation_idx
  on public.posts(status, featured, created_at desc);

insert into public.role_permissions(role, permission) values
  ('super_admin', 'manage_wallet'),
  ('super_admin', 'manage_posts'),
  ('super_admin', 'manage_orders'),
  ('admin', 'review_posts'),
  ('admin', 'create_posts'),
  ('admin', 'manage_payouts'),
  ('captain', 'view_delivery_posts'),
  ('captain', 'update_delivery_status'),
  ('captain', 'request_payout'),
  ('restaurant', 'manage_own_posts'),
  ('supermarket', 'manage_own_posts'),
  ('fashion', 'manage_own_posts'),
  ('beauty', 'manage_own_posts'),
  ('car_dealer', 'manage_own_posts'),
  ('customer', 'browse_posts'),
  ('customer', 'create_orders')
 on conflict (role, permission) do nothing;

alter table public.wallet_accounts enable row level security;
alter table public.wallet_payout_requests enable row level security;

-- Replace policies only for the new wallet surfaces. Ledger rows remain append-only.
drop policy if exists "shakh wallet accounts own select" on public.wallet_accounts;
drop policy if exists "shakh payout requests own select" on public.wallet_payout_requests;
drop policy if exists "shakh payout requests own insert" on public.wallet_payout_requests;
drop policy if exists "shakh payout requests admin manage" on public.wallet_payout_requests;

create policy "shakh wallet accounts own select"
on public.wallet_accounts for select
using (user_id = auth.uid() or public.has_permission('manage_wallet'));

create policy "shakh payout requests own select"
on public.wallet_payout_requests for select
using (user_id = auth.uid() or public.has_permission('manage_payouts'));

create policy "shakh payout requests own insert"
on public.wallet_payout_requests for insert
with check (user_id = auth.uid() and public.has_permission('request_payout'));

create policy "shakh payout requests admin manage"
on public.wallet_payout_requests for update
using (public.has_permission('manage_payouts'))
with check (public.has_permission('manage_payouts'));

-- Prevent clients from rewriting or deleting financial history.
drop policy if exists "shakh wallet ledger no client writes" on public.wallet_transactions;
create policy "shakh wallet ledger no client writes"
on public.wallet_transactions for insert
with check (false);

drop policy if exists "shakh wallet ledger no client updates" on public.wallet_transactions;
create policy "shakh wallet ledger no client updates"
on public.wallet_transactions for update
using (false);

drop policy if exists "shakh wallet ledger no client deletes" on public.wallet_transactions;
create policy "shakh wallet ledger no client deletes"
on public.wallet_transactions for delete
using (false);

-- Only a trusted backend/service role can append ledger rows.
revoke insert, update, delete on public.wallet_transactions from authenticated, anon;
grant select on public.wallet_transactions to authenticated;
grant insert, update, delete on public.wallet_transactions to service_role;

commit;

-- Verification (run after the transaction above if your SQL editor separates batches).
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('wallet_accounts','wallet_payout_requests','wallet_transactions','posts')
  and column_name in ('balance','status','reference_id','type','featured','rejection_reason')
order by table_name, column_name;
