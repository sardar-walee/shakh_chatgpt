# Deployment checklist

- [ ] Run `supabase/schema.sql`
- [ ] Run `supabase/v2_migration.sql`
- [ ] Create a Supabase Auth user
- [ ] Insert/update the matching row in `profiles`
- [ ] Set the user's role
- [ ] Add Vercel environment variables
- [ ] Test language switcher
- [ ] Test category filters
- [ ] Test cart
- [ ] Test cash-on-delivery UI
- [ ] Test car post category
- [ ] Add Storage bucket for product images
- [ ] Add server-side authorization before production
- [ ] Add order status transitions and captain assignment
- [ ] Add real wallet ledger and settlement reports
