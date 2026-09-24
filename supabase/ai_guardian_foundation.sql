-- SHAKH SUPER AI Guardian Foundation Migration
-- Additive and idempotent schema extension for Super Admin AI Guardian & Repair Center.
-- Run after schema.sql and super_admin_production.sql.

begin;

-- Diagnostic Runs Audit Table
create table if not exists public.guardian_diagnostic_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'full',
  health_score integer not null default 100,
  total_checks integer not null default 0,
  passed_checks integer not null default 0,
  failed_checks integer not null default 0,
  warning_checks integer not null default 0,
  blocked_checks integer not null default 0,
  findings jsonb not null default '[]'::jsonb,
  environment_metadata jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Repair Actions and Approvals Table
create table if not exists public.guardian_repairs (
  id uuid primary key default gen_random_uuid(),
  issue_id text not null,
  title text not null,
  category text not null default 'schema',
  risk_level text not null default 'high' check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'applied', 'rejected', 'reverted')),
  patch_diff text,
  sql_migration text,
  rollback_sql text,
  affected_objects text[] not null default '{}',
  test_plan text,
  proposed_by text not null default 'AI Guardian Engine',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  applied_at timestamptz,
  applied_result jsonb,
  created_at timestamptz not null default now()
);

-- System Indexes
create index if not exists guardian_runs_created_idx on public.guardian_diagnostic_runs(created_at desc);
create index if not exists guardian_repairs_status_idx on public.guardian_repairs(status, created_at desc);

-- Enable Row Level Security
alter table public.guardian_diagnostic_runs enable row level security;
alter table public.guardian_repairs enable row level security;

-- Strict Super Admin RLS Policies
drop policy if exists "guardian runs super admin select" on public.guardian_diagnostic_runs;
drop policy if exists "guardian runs super admin insert" on public.guardian_diagnostic_runs;
create policy "guardian runs super admin select" on public.guardian_diagnostic_runs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

create policy "guardian runs super admin insert" on public.guardian_diagnostic_runs
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

drop policy if exists "guardian repairs super admin select" on public.guardian_repairs;
drop policy if exists "guardian repairs super admin all" on public.guardian_repairs;
create policy "guardian repairs super admin select" on public.guardian_repairs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

create policy "guardian repairs super admin all" on public.guardian_repairs
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- Secure RPC to log diagnostic scan
create or replace function public.guardian_record_diagnostic_run(
  p_run_type text,
  p_health_score integer,
  p_total integer,
  p_passed integer,
  p_failed integer,
  p_warning integer,
  p_blocked integer,
  p_findings jsonb,
  p_env jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path=public
as $$
declare
  new_run_id uuid;
  caller_role text;
begin
  select role::text into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'super_admin' then
    raise exception 'Unauthorized: Only super_admin can record guardian diagnostic runs';
  end if;

  insert into public.guardian_diagnostic_runs (
    run_type, health_score, total_checks, passed_checks, failed_checks,
    warning_checks, blocked_checks, findings, environment_metadata, actor_id
  ) values (
    p_run_type, p_health_score, p_total, p_passed, p_failed,
    p_warning, p_blocked, p_findings, p_env, auth.uid()
  ) returning id into new_run_id;

  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, new_data)
  values (auth.uid(), 'super_admin', 'guardian_scan_completed', 'guardian_run', new_run_id, jsonb_build_object(
    'score', p_health_score, 'failed', p_failed, 'warning', p_warning
  ));

  return new_run_id;
end;
$$;

-- Secure RPC to approve or reject repair
create or replace function public.guardian_update_repair_status(
  p_repair_id uuid,
  p_new_status text,
  p_result jsonb default null
)
returns public.guardian_repairs language plpgsql security definer set search_path=public
as $$
declare
  v_repair public.guardian_repairs;
  caller_role text;
begin
  select role::text into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'super_admin' then
    raise exception 'Unauthorized: Only super_admin can manage repair approvals';
  end if;

  if p_new_status not in ('approved', 'applied', 'rejected', 'reverted') then
    raise exception 'Invalid repair status';
  end if;

  update public.guardian_repairs set
    status = p_new_status,
    approved_by = case when p_new_status in ('approved', 'applied') then auth.uid() else approved_by end,
    approved_at = case when p_new_status in ('approved', 'applied') then now() else approved_at end,
    applied_at = case when p_new_status = 'applied' then now() else applied_at end,
    applied_result = coalesce(p_result, applied_result)
  where id = p_repair_id
  returning * into v_repair;

  if not found then
    raise exception 'Repair item not found';
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, new_data)
  values (auth.uid(), 'super_admin', 'guardian_repair_status_changed', 'guardian_repair', p_repair_id, jsonb_build_object(
    'new_status', p_new_status
  ));

  return v_repair;
end;
$$;

revoke all on function public.guardian_record_diagnostic_run from public;
revoke all on function public.guardian_update_repair_status from public;
grant execute on function public.guardian_record_diagnostic_run to authenticated;
grant execute on function public.guardian_update_repair_status to authenticated;

commit;
