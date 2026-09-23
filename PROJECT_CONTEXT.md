# SHAKH SUPER Project Context

This document is the source-of-truth handoff for the current repository. It describes what is implemented today, what the database scripts expect, and the rules for extending the project without confusing starter UI with production capability.

## 1. Project Overview & Tech Stack

SHAKH SUPER is a multilingual marketplace and delivery-platform starter for Kurdish, Arabic, and English. It presents category-based posts for food, groceries, fashion, beauty, vehicles, and other marketplace content; supports customer carts and cash-on-delivery order creation; and includes role-aware dashboard and wallet placeholders.

### Runtime stack

- React 18.3 with `react-dom` and TypeScript 5.7.
- Vite 6 as the development server and production bundler.
- `@supabase/supabase-js` 2.x for Auth, Postgres queries, and Realtime.
- `lucide-react` for interface icons.
- Supabase Postgres, Auth, Storage, Realtime, Row Level Security, and SQL migrations.
- Browser service worker and Web App Manifest for installable PWA behavior.
- Google-hosted Noto Sans Arabic font loaded by `index.html`.
- Vercel-compatible static deployment: build command `npm run build`, output directory `dist`.

### Commands

```bash
npm install
npm run dev       # local Vite development server
npm run build     # production build; current verification passes
npm run preview   # serve the built dist directory locally
```

There is no test runner, linter, formatter, or backend application in this repository. A successful `npm run build` is the current automated compile check.

## 2. Directory & File Structure

```text
.
├── index.html                    # HTML shell, RTL document metadata, font, PWA links
├── package.json                  # dependencies and Vite scripts
├── tsconfig.json                 # strict, noEmit, bundler-resolution TypeScript config
├── vite.config.ts                # Vite React plugin configuration
├── .env.example                  # public Vite environment-variable template
├── src/
│   ├── main.tsx                  # application entry point and current UI/state surface
│   ├── styles.css                # global responsive RTL styling and design tokens
│   ├── vite-env.d.ts             # Vite/TypeScript ambient declarations
│   └── lib/
│       ├── supabase.ts           # optional Supabase client and configuration guard
│       └── platform.ts           # map configuration and Storage bucket name
├── public/
│   ├── manifest.webmanifest      # install metadata, Kurdish/RTL defaults, icon reference
│   ├── sw.js                     # network-first service worker and update messaging
│   └── icon.svg                  # favicon and manifest icon
├── supabase/
│   ├── schema.sql                # baseline enums, core tables, and RLS enablement
│   ├── v3_enum_fix.sql           # enum additions; must be committed separately
│   ├── v2_migration.sql          # settings, permissions, and audit-log tables/data
│   ├── v3_migration.sql          # auth trigger, helper functions, and RLS policies
│   ├── legacy_compatibility.sql  # retained tables for previous marketplace features
│   ├── platform_services.sql     # Storage bucket, object policies, and Realtime tables
│   └── promote_super_admin.sql   # explicit post-signup account promotion script
├── README.md                     # original setup and product summary
└── DEPLOYMENT-CHECKLIST.md       # launch checklist and outstanding production work
```

### Module and request flow

1. `index.html` mounts `src/main.tsx` at `#root`.
2. `main.tsx` owns the current single-page UI, translations, role/category selection, auth forms, cart, post form, dashboard, wallet view, and browser lifecycle effects.
3. `lib/supabase.ts` creates a persisted, auto-refreshing Supabase client only when both Supabase variables exist. Without them, the UI can still render demo products and local in-memory interactions.
4. On startup, the app establishes an auth-state listener, loads the signed-in user and active posts, subscribes to `public.posts` Realtime changes, and registers `/sw.js`.
5. Post creation writes to `posts`; checkout writes an `orders` row and then related `order_items` rows. The client reloads active posts after a successful post write.
6. Supabase Auth handles signup, email confirmation, password login, password reset, and password update. The database trigger creates a `profiles` row on signup.
7. `styles.css` controls the RTL responsive layout, orange/blue/white/yellow visual system, cards, forms, navigation, and mobile behavior.

## 3. Configurations & Environment Variables

Vite exposes only variables prefixed with `VITE_`. Values are compiled into the browser bundle, so they must never contain secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Required for persistence/auth | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Required for persistence/auth | Public Supabase anon/publishable key, protected by RLS. |
| `VITE_SUPABASE_STORAGE_BUCKET` | Optional | Product image bucket name; defaults to `product-images`. |
| `VITE_MAP_API_KEY` | Optional currently | Public client-side map provider key; configuration is read but no map UI is currently implemented. |
| `VITE_MAP_STYLE_URL` | Optional currently | MapLibre/Mapbox-compatible style URL. |

Local setup:

```bash
cp .env.example .env
# replace placeholder values; never add service_role or private credentials
npm run dev
```

### Supabase provisioning order

Run these in the Supabase SQL Editor in this order:

1. `supabase/schema.sql`.
2. `supabase/v3_enum_fix.sql` by itself, then let the transaction commit. PostgreSQL does not allow newly added enum values to be used in the same transaction.
3. `supabase/v2_migration.sql`.
4. `supabase/v3_migration.sql`. It is written to tolerate some legacy column names, but should still be run after the baseline and enum commit.
5. `supabase/legacy_compatibility.sql` when the previous marketplace tables are required.
6. `supabase/platform_services.sql` for Storage and Realtime.
7. After the intended account has signed up, edit and run `supabase/promote_super_admin.sql` only for the trusted account.

Operational requirements:

- Enable Anonymous Sign-Ins only for temporary/demo operation; public launch should use verified Auth accounts.
- Configure the production domain in Supabase Auth redirect URLs.
- Set Vercel variables to the same public Supabase values.
- Confirm the signup trigger creates a matching `profiles` row.
- Keep `service_role` keys server-side and out of frontend code, `.env` values used by Vite, logs, and commits.
- `platform_services.sql` currently creates a public `product-images` bucket and public read policy. Review this before storing private media.
- The service worker uses a hard-coded cache name (`shakh-super-v1`); increment it when cache invalidation behavior changes.

## 4. Architecture & Coding Standards

### State and authorization rules

- `main.tsx` is currently the application composition root. Preserve its existing public behavior when extracting components; move one cohesive concern at a time and keep the same Supabase contracts.
- Keep server state in Supabase. Do not treat the React `role` selector as authorization: it changes the displayed role/dashboard only. Real access control must be enforced by database RLS and Auth claims/profile state.
- The no-Supabase fallback is demo-only in-memory state. It is not durable, authenticated, or suitable for production. Do not silently extend it as a substitute for backend behavior.
- Use the authenticated user id from Supabase for `owner_id` and `customer_id`; never accept an arbitrary user id from an editable UI field.
- Treat multi-step writes as failure-prone. Checkout currently inserts the order and then items separately; future payment/order workflows need an RPC or server-side transaction and compensation strategy.
- Keep active-post filtering server-compatible: the current UI filters by category, search text, and `status === "active"` after loading.
- Preserve multilingual content order and RTL behavior. New user-facing strings must have Kurdish, Arabic, and English variants and must pass through the existing translation helper.
- Use semantic HTML and existing icon components. Keep controls keyboard-accessible and preserve responsive behavior.
- Use strict TypeScript. Avoid `any` in new code, avoid one-letter variables, and keep data types aligned with SQL enum/value names.
- Prefer small, focused modules when extracting code from `main.tsx`; do not introduce a state library until shared server/client state is demonstrably too complex for the existing hooks.
- Keep SQL migrations idempotent where practical (`if not exists`, `on conflict`, and guarded policy replacement), and document any migration that must be run alone or in a specific order.

### Safety constraints

- Never weaken or bypass RLS to make a UI request work.
- Any new table must have explicit ownership/visibility rules, indexes where query volume warrants them, timestamps, and RLS policies before the UI is connected.
- Any new role or enum value must be reflected in the SQL enum, seed permissions, TypeScript role type, role labels, post/category behavior, and policy tests.
- Do not expose operational secrets, service credentials, or unrestricted admin APIs in the browser.
- Validate prices, quantities, ownership, status transitions, and totals on the server/database. Client-calculated totals are display input, not a source of truth.
- Realtime subscriptions must be cleaned up on unmount and scoped to the required table/event; do not subscribe to sensitive data broadly.
- Image uploads must use the configured bucket policy and user-owned folder convention before the UI adds upload controls.

## 5. Database & Schema Rules

### Enums

- `public.app_role`: `super_admin`, `admin`, `captain`, `restaurant`, `supermarket`, `fashion`, `beauty`, `car_dealer`, `customer`.
- `public.post_status`: `active`, `blocked`, `deleted`.
- `public.order_status`: `pending`, `accepted`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`.

### Core tables and relationships

- `profiles`: one row per `auth.users` record; stores `full_name`, phone, role, and creation time. The signup trigger inserts the default customer profile.
- `posts`: marketplace listings owned by `profiles` through `owner_id`; category is an `app_role`; includes title, description, image URL, IQD price, status, and timestamps.
- `orders`: customer order with optional captain assignment, status, cash-on-delivery default, product/delivery/platform/merchant/captain amounts, total, address, and timestamp.
- `order_items`: child rows of `orders` with optional `posts` reference, quantity, and unit price. Deleting an order cascades to its items.
- `wallet_transactions`: user/order-linked ledger rows with kind, amount, note, and timestamp. It is schema/RLS-ready but the current wallet screen is a demo placeholder.
- `platform_settings`: singleton settings row for commission, default delivery fee, currency, and default language.
- `role_permissions`: role-to-permission seed table; `*` is assigned to `super_admin` and feature permissions are seeded for the other roles.
- `audit_logs`: actor, action, entity, JSON metadata, and timestamp. Current policies allow actor inserts; production auditing should also protect integrity and provide controlled reads.

### Security model

RLS is enabled on the core and v2 tables. `v3_migration.sql` defines `current_user_role()`, `has_role()`, and `has_permission()` as restricted `security definer` helpers and installs policies for public active posts, owned posts, profiles, orders, order items, wallet reads, settings, role permissions, and audit inserts. Review every policy against the live schema after migrations, especially when legacy columns are present.

`platform_services.sql` adds public reads for product images, authenticated user-folder uploads, owner-only updates/deletes, and Realtime publication for `posts` and `orders`. The client currently subscribes to posts only.

## 6. Current Roadmap & Update Rules

### Current implementation versus planned work

Implemented in the current frontend:

- Three-language switcher and RTL layout.
- Auth UI for sign-in, signup, confirmation resend, reset, and password update.
- Active post loading, category/search filtering, post creation, cart, and cash-on-delivery order/item insertion.
- Role/category dashboard starter, wallet display placeholder, PWA install prompt, and service-worker update notice.
- Supabase Realtime refresh for post changes.

Database/configuration exists but is not fully surfaced by the UI:

- Product image Storage setup, but the post form currently accepts an emoji/image text value rather than performing an upload.
- Map environment configuration, but no map/address workflow.
- Order status/captain assignment fields, but no dispatch or status-transition workflow.
- Wallet transaction schema and amount columns, but no real ledger or settlement reconciliation.
- Platform permissions and audit tables, but no complete administrative workflow or audit viewer.
- Legacy compatibility tables retained for previous marketplace functionality.

### Safe extension sequence

1. Define the user-visible behavior and its authorization owner.
2. Add or change the database contract first: migration, indexes/constraints, RLS, and rollback/compatibility notes.
3. Add typed Supabase access and server-side validation. Prefer an atomic Postgres function/RPC for money, order status, inventory, and multi-row workflows.
4. Add the UI in the existing translation, RTL, responsive, and icon conventions.
5. Exercise both configured and unconfigured Supabase paths, including unauthenticated, wrong-owner, and wrong-role cases.
6. Run `npm run build`; manually verify Auth redirect behavior, Realtime, Storage policy behavior, and PWA updates in a deployed-like environment.
7. Update this document, `README.md`, and `DEPLOYMENT-CHECKLIST.md` whenever environment keys, migration order, roles, routes, tables, or production prerequisites change.

### Release checklist

- Migration scripts run in the documented order on a disposable Supabase project.
- RLS denies cross-user reads/writes and role escalation attempts.
- Money totals and order transitions are server-validated and auditable.
- Auth redirects and email confirmation work on the production domain.
- Storage bucket visibility and ownership rules match the product’s privacy requirements.
- Realtime subscriptions and service-worker cache updates are verified.
- `npm run build` passes with no secrets committed.
- Deployment and rollback notes are current in `DEPLOYMENT-CHECKLIST.md`.
