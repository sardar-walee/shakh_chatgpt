-- SHAKH SUPER Admin Console foundation
-- Run after schema.sql, v3_migration.sql, rbac_wallet_migration.sql, and production_repair.sql.
-- Additive and rerunnable. No existing application rows are deleted.

alter type public.order_status add value if not exists 'ready';
alter type public.order_status add value if not exists 'assigned';
alter type public.order_status add value if not exists 'picked_up';
alter type public.order_status add value if not exists 'on_the_way';

begin;

create table if not exists public.marketplace_categories(
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_ar text,
  name_en text,
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  allowed_roles text[] not null default '{}',
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_status_history(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists actor_role text;
alter table public.audit_logs add column if not exists resource_type text;
alter table public.audit_logs add column if not exists resource_id uuid;
alter table public.audit_logs add column if not exists old_data jsonb;
alter table public.audit_logs add column if not exists new_data jsonb;

insert into public.marketplace_categories(slug,name,name_ar,name_en,sort_order,allowed_roles,fields) values
('restaurant','چێشتخانە','مطعم','Food',10,array['restaurant'], '[{"key":"restaurant","label":"Restaurant","type":"text","required":true},{"key":"food_name","label":"Food name","type":"text","required":true},{"key":"ingredients","label":"Ingredients","type":"textarea"},{"key":"preparation_time","label":"Preparation minutes","type":"number"}]'::jsonb),
('supermarket','سوپەرمارکێت','سوبرماركت','Supermarket',20,array['supermarket'], '[{"key":"brand","label":"Brand","type":"text"},{"key":"unit","label":"Unit","type":"select","options":["Piece","Kg","Liter","Pack"]},{"key":"quantity","label":"Quantity","type":"number"},{"key":"expiry_date","label":"Expiry date","type":"date"}]'::jsonb),
('fashion','جل و بەرگ','أزياء','Clothing',30,array['fashion'], '[{"key":"gender","label":"Gender","type":"select","options":["Men","Women","Kids","Unisex"],"required":true},{"key":"size","label":"Size","type":"multi"},{"key":"colors","label":"Colors","type":"multi"},{"key":"brand","label":"Brand","type":"text"},{"key":"material","label":"Material","type":"text"}]'::jsonb),
('beauty','جوانکاری','تجميل','Beauty',40,array['beauty'], '[{"key":"brand","label":"Brand","type":"text"},{"key":"beauty_category","label":"Beauty type","type":"select","options":["Makeup","Skincare","Haircare","Perfume"],"required":true},{"key":"skin_type","label":"Skin type","type":"select"},{"key":"shade","label":"Shade","type":"text"},{"key":"size_volume","label":"Volume","type":"text"},{"key":"expiry_date","label":"Expiry date","type":"date"}]'::jsonb),
('car_dealer','ئۆتۆمبێل','سيارات','Cars',50,array['car_dealer','customer'], '[{"key":"make","label":"Brand","type":"text","required":true},{"key":"model","label":"Model","type":"text","required":true},{"key":"model_year","label":"Year","type":"number","required":true},{"key":"fuel","label":"Fuel","type":"select"},{"key":"transmission","label":"Transmission","type":"select"},{"key":"drive_type","label":"Drive type","type":"select"},{"key":"engine_size","label":"Engine","type":"text"},{"key":"horsepower","label":"Horsepower","type":"number"},{"key":"mileage","label":"Mileage","type":"number"},{"key":"features","label":"Features","type":"multi"},{"key":"location","label":"Location","type":"text","required":true}]'::jsonb)
on conflict (slug) do nothing;

create index if not exists marketplace_categories_active_sort_idx on public.marketplace_categories(active,sort_order);
create index if not exists order_status_history_order_created_idx on public.order_status_history(order_id,created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

alter table public.marketplace_categories enable row level security;
alter table public.order_status_history enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "shakh categories public active select" on public.marketplace_categories;
drop policy if exists "shakh categories admin manage" on public.marketplace_categories;
create policy "shakh categories public active select" on public.marketplace_categories for select using (active or public.has_permission('manage_settings'));
create policy "shakh categories admin manage" on public.marketplace_categories for all using (public.has_permission('manage_settings')) with check (public.has_permission('manage_settings'));

drop policy if exists "shakh order history related select" on public.order_status_history;
create policy "shakh order history related select" on public.order_status_history for select using (public.has_permission('manage_orders') or exists (select 1 from public.orders o where o.id=order_id and (o.customer_id=auth.uid() or o.captain_id=auth.uid())));

drop policy if exists "shakh audit admin select" on public.audit_logs;
drop policy if exists "shakh audit immutable update" on public.audit_logs;
drop policy if exists "shakh audit immutable delete" on public.audit_logs;
create policy "shakh audit admin select" on public.audit_logs for select using (public.has_permission('manage_users') or public.has_permission('manage_posts') or public.has_permission('manage_orders') or public.has_permission('manage_wallet'));
create policy "shakh audit immutable update" on public.audit_logs for update using (false);
create policy "shakh audit immutable delete" on public.audit_logs for delete using (false);

create or replace function public.admin_change_user_role(target_user uuid,new_role public.app_role)
returns public.profiles
language plpgsql security definer set search_path=public
as $$
declare result public.profiles; before_data jsonb;
begin
  if not public.has_role('super_admin') then raise exception 'Only super_admin can change roles'; end if;
  select to_jsonb(p) into before_data from public.profiles p where p.id=target_user;
  update public.profiles set role=new_role where id=target_user returning * into result;
  if not found then raise exception 'Profile not found'; end if;
  insert into public.audit_logs(actor_id,actor_role,action,resource_type,resource_id,old_data,new_data,metadata)
  values(auth.uid(),public.current_user_role()::text,'role_changed','profile',target_user,before_data,to_jsonb(result),'{}'::jsonb);
  return result;
end;
$$;

create or replace function public.admin_set_order_status(target_order uuid,new_status text,note_text text default null)
returns public.orders
language plpgsql security definer set search_path=public
as $$
declare result public.orders; old_status text;
begin
  if not public.has_permission('manage_orders') then raise exception 'Order management permission required'; end if;
  if new_status not in ('pending','accepted','preparing','out_for_delivery','delivered','cancelled','ready','assigned','picked_up','on_the_way') then raise exception 'Invalid order status'; end if;
  select status::text into old_status from public.orders where id=target_order;
  update public.orders set status=new_status::public.order_status where id=target_order returning * into result;
  if not found then raise exception 'Order not found'; end if;
  insert into public.order_status_history(order_id,from_status,to_status,changed_by,note) values(target_order,old_status,new_status,auth.uid(),note_text);
  insert into public.audit_logs(actor_id,actor_role,action,resource_type,resource_id,old_data,new_data,metadata)
  values(auth.uid(),public.current_user_role()::text,'order_updated','order',target_order,jsonb_build_object('status',old_status),jsonb_build_object('status',new_status),jsonb_build_object('note',note_text));
  return result;
exception when invalid_text_representation then
+  raise exception 'Database order_status enum does not support this status. Add the enum value in a separate committed migration first.';
end;
$$;

create or replace function public.admin_moderate_post(target_post uuid,new_status text)
returns public.posts
language plpgsql security definer set search_path=public
as $$
declare result public.posts; before_data jsonb;
begin
  if not public.has_permission('manage_posts') then raise exception 'Post management permission required'; end if;
  if new_status not in ('active','blocked','deleted') then raise exception 'Invalid post status'; end if;
  select to_jsonb(p) into before_data from public.posts p where p.id=target_post;
  update public.posts set status=new_status::public.post_status where id=target_post returning * into result;
  if not found then raise exception 'Post not found'; end if;
  insert into public.audit_logs(actor_id,actor_role,action,resource_type,resource_id,old_data,new_data)
  values(auth.uid(),public.current_user_role()::text,'post_status_changed','post',target_post,before_data,to_jsonb(result));
  return result;
end;
$$;

revoke all on function public.admin_change_user_role(uuid,public.app_role) from public;
revoke all on function public.admin_set_order_status(uuid,text,text) from public;
revoke all on function public.admin_moderate_post(uuid,text) from public;
grant execute on function public.admin_change_user_role(uuid,public.app_role) to authenticated;
grant execute on function public.admin_set_order_status(uuid,text,text) to authenticated;
grant execute on function public.admin_moderate_post(uuid,text) to authenticated;

grant select on public.marketplace_categories,public.order_status_history to authenticated,anon;
grant select on public.audit_logs to authenticated;

commit;
