-- Run this file by itself and let it commit before running v3_migration.sql.
-- PostgreSQL does not allow a newly-added enum value to be used in the same transaction.

alter type public.app_role add value if not exists 'super_admin';
alter type public.app_role add value if not exists 'admin';
alter type public.app_role add value if not exists 'captain';
alter type public.app_role add value if not exists 'restaurant';
alter type public.app_role add value if not exists 'supermarket';
alter type public.app_role add value if not exists 'fashion';
alter type public.app_role add value if not exists 'beauty';
alter type public.app_role add value if not exists 'car_dealer';
alter type public.app_role add value if not exists 'customer';
