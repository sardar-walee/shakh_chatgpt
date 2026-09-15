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

## Supabase setup
1. Open your Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy the public anon key into `.env`:
```env
VITE_SUPABASE_URL=https://pmsrrsvvhjclvtdpkbmh.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```
5. Do not put a `service_role` key in frontend code.

## GitHub
```bash
git init
git add .
git commit -m "SHAKH SUPER v2"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## Vercel
- Import the GitHub repository.
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.
- Deploy.

## Production work still required
This is a functional frontend/MVP starter. Before real public launch, connect the UI to Supabase queries, add verified authentication, server-side role checks, payment reconciliation, image storage, notifications, address/maps, captain dispatch, audit logs, and complete admin policies.
