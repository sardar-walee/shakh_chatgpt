# SHAKH SUPER — v2

Multilingual marketplace and delivery platform starter for Kurdish, Arabic and English.

## Included in this update
- All 9 roles: `super_admin`, `admin`, `captain`, `restaurant`, `supermarket`, `fashion`, `beauty`, `car_dealer`, `customer`
- Role selector and role-specific dashboard starter
- Product, food, fashion, beauty and car posts
- Customer car-for-sale posting capability through the post form
- Search and category filtering
- Shopping cart
- Cash on delivery flow
- Demo wallet and transaction breakdown
- Platform commission, merchant amount and captain amount fields
- Kurdish / Arabic / English language switcher
- RTL layout
- Responsive desktop and mobile layout
- Orange / blue / white / yellow branding
- Supabase schema with profiles, posts, orders, order items and wallet transactions
- Starter Row Level Security policies
- Vercel-ready Vite project

## Run
```bash
npm install
cp .env.example .env
npm run dev
```

## Project doctor

Run the local diagnostic bot before deployment or after a change:

```bash
npm run doctor
```

It checks TypeScript and the production build, then prints likely causes and next steps for common dependency, type, environment, and Supabase permission errors. `npm run typecheck` runs only the TypeScript check. The doctor does not rewrite application code automatically, because an incorrect fix could damage authorization or data.

Available diagnostics:

```bash
npm run doctor -- --fix                 # install dependencies, then retry failed checks
npm run doctor -- --supabase            # check the public Supabase REST endpoints and RLS response
npm run doctor -- --smoke               # test Auth login, profile access, and active-post access
npm run doctor -- --all --notify        # run every check, beep on failure, and use DOCTOR_WEBHOOK_URL if configured
```

The smoke test reads `DOCTOR_TEST_EMAIL` and `DOCTOR_TEST_PASSWORD` from `.env`; the values are never printed. The webhook is optional and receives only the check names that failed.

The Super Admin implementation audit and remaining production work are tracked in [SUPER_ADMIN_AUDIT.md](SUPER_ADMIN_AUDIT.md).

## Supabase Auth and recovery setup
1. Open your Supabase project.
2. Go to Authentication → Providers and enable Email and Google.
3. For Google, add your app domain and redirect URL to the allowed list. For local development use `http://localhost:5173` and for production use `https://YOUR_DOMAIN`.
4. In Authentication → URL Configuration, set the site URL to your deployed app origin (or `http://localhost:5173` for local dev).
5. Add the redirect URLs for signup, login, and password recovery, for example:
   - `http://localhost:5173/**`
   - `https://YOUR_DOMAIN/**`
6. In SQL Editor, run the database migrations in order: `supabase/schema.sql`, `supabase/v3_enum_fix.sql`, `supabase/v2_migration.sql`, `supabase/v3_migration.sql`, `supabase/rbac_wallet_migration.sql`, `supabase/post_category_attributes.sql`, `supabase/legacy_compatibility.sql`, `supabase/production_repair.sql`, `supabase/platform_services.sql`, `supabase/super_admin_production.sql`. Let enum migrations commit before dependent migrations.
7. Run `supabase/rbac_wallet_migration.sql` before using Wallet or payout controls. It adds immutable ledger metadata, wallet accounts, payout requests, listing moderation fields, and role-specific RLS policies. Financial ledger writes must be performed by a trusted backend or service role, never from the browser.
8. Copy the public keys into `.env`:
```env
VITE_SUPABASE_URL=https://pmsrrsvvhjclvtdpkbmh.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_SUPABASE_STORAGE_BUCKET=product-images
VITE_MAP_API_KEY=YOUR_PUBLIC_MAP_API_KEY
VITE_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```
9. Do not put a `service_role` key in frontend code.

The web app is installable as a PWA. On supported browsers it shows an install prompt, listens for live post/order changes through Realtime, and displays a short update message when a new deployment is available.

## GitHub
```bash
git init
git add .
git diff --cached --quiet || git commit -m "SHAKH SUPER v3.0.0"
git branch -M main

# Replace this with your real GitHub repository URL.
REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git"
if git remote get-url origin >/dev/null 2>&1; then
   git remote set-url origin "$REPO_URL"
else
   git remote add origin "$REPO_URL"
fi

# Enable the automatic doctor check before every push.
git config core.hooksPath .githooks
git push -u origin main
```

The pre-push hook runs `npm run doctor -- --notify` automatically. To run the full Supabase and Auth checks manually, use `npm run doctor -- --all --notify` after setting the real `.env` values and optional `DOCTOR_WEBHOOK_URL`.

## Vercel
- Import the GitHub repository.
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.
- Deploy.

## Production work still required
The frontend now reads active posts and writes posts, orders, and order items through Supabase. v3 adds profile creation on auth signup, role permissions, and complete RLS policies. Before public launch, replace anonymous sessions with verified authentication and add payment reconciliation, image storage, notifications, address/maps, and captain dispatch.
