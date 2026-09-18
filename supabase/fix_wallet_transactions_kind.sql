-- Compatibility repair for deployments where wallet_transactions.kind was removed.
-- Run once in the Supabase SQL Editor.

begin;

alter table public.wallet_transactions
  add column if not exists kind text;

update public.wallet_transactions
set kind = coalesce(kind, type, 'transaction')
where kind is null;

alter table public.wallet_transactions
  alter column kind set default 'transaction';

commit;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'wallet_transactions'
  and column_name in ('type', 'kind')
order by column_name;
