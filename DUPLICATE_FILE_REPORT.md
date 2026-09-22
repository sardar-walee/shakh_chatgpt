# SHAKH SUPER — Duplicate file review

## Exact duplicates

No exact byte-for-byte duplicate files were found in the project source tree when `node_modules/` and generated build output were excluded from the comparison. The remaining project files all have distinct SHA-256 hashes.

## Likely duplicates / overlap

| Files | Evidence | Recommendation |
|---|---|---|
| `supabase/v3_migration.sql` + `supabase/production_repair.sql` | Highest semantic overlap among SQL migrations; both define/redefine auth/RLS helper functions and replace policies. `production_repair.sql` is explicitly a production repair layer, while `v3_migration.sql` is the main v3 auth/RLS migration. | **Keep both.** They are sequential migration layers, not safe duplicates. Run them in the documented order. |
| `supabase/v3_migration.sql` + `supabase/super_admin_production.sql` | Both touch RLS/permissions and admin behavior; function/policy concepts overlap. The latter adds admin-console tables and RPCs. | **Keep both.** Different responsibilities. |
| `supabase/v3_migration.sql` + `supabase/rbac_wallet_migration.sql` | Repeated helper-function concepts (`current_user_role`, `has_permission`) and post policies. The wallet migration adds wallet/payout/ledger functionality. | **Keep both.** Later migration intentionally extends the earlier schema. |
| `supabase/schema.sql` + `supabase/v2_migration.sql` | Both define core marketplace concepts and permissions, but v2 is an incremental upgrade layer. | **Keep both.** Do not collapse migrations unless the live database is first baselined into a new single migration. |
| `supabase/role_post_scope.sql` + `supabase/rbac_wallet_migration.sql` | Both add role permissions. The new file specifically replaces post INSERT policy with category-scoped rules. | **Keep both.** The new file is the final authorization refinement. |

## Important repeated definitions

The SQL directory intentionally contains repeated `CREATE OR REPLACE FUNCTION` definitions for `handle_new_user`, `current_user_role`, `has_role`, and `has_permission`. There are also repeated policy names in older migrations. This is migration layering rather than evidence that one file can simply be deleted.

## What to keep

1. Keep the complete migration history.
2. Keep `schema.sql` as the baseline.
3. Keep the v2/v3/RBAC/repair/admin/service migrations in their documented order.
4. Keep the new `supabase/role_post_scope.sql`; it is the authorization fix for role-specific posting.
5. Keep source files and generated build files; no duplicate file was deleted during this review.

## Changes made for the requested project update

- Posting UI is hidden for unauthenticated users.
- An unauthenticated user is directed to account creation/sign-in before publishing.
- Merchant posting categories are limited to the merchant's own role/category.
- Customers are limited to car-sale posts.
- Admin and super admin can post across all marketplace categories.
- Super-admin-owned posts display as **SHAKH STORE** in the UI.
- Added `supabase/role_post_scope.sql` with database/RLS enforcement, so frontend restrictions are not the only protection.
- Refreshed the role badge and responsive card/auth styling.
- Existing email login, account creation, password recovery, and Google sign-in flows remain in the project.

## Validation

- TypeScript check: **passed** (`npm run typecheck`).
- Production build: **passed** with Vite 6.4.3.
- No files were deleted as part of this review.

> Database migrations must still be applied to the actual Supabase project before the role-scoped posting rule takes effect in production.
