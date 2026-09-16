# Deployment checklist

- [ ] Run `supabase/schema.sql`
- [ ] Run `supabase/v3_enum_fix.sql` separately and let it commit
- [ ] Run `supabase/v2_migration.sql` and `supabase/v3_migration.sql`
- [ ] Run `supabase/legacy_compatibility.sql` for the previous database tables
- [ ] Enable Anonymous Sign-Ins, or replace the anonymous session with verified Auth
- [ ] Confirm the auth trigger creates a `profiles` row
- [ ] Set trusted users' roles in `profiles`
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.example`
- [ ] Add Vercel environment variables
- [ ] Test language switcher
- [ ] Test category filters
- [ ] Test cart
- [ ] Test cash-on-delivery UI
- [ ] Test car post category
- [ ] Add Storage bucket for product images
- [x] Add server-side authorization with role-based RLS policies
- [ ] Add order status transitions and captain assignment
- [ ] Add real wallet ledger and settlement reports
