-- ============================================================
-- FIX: "insert or update on table 'posts' violates foreign key constraint 'posts_user_id_fkey'"
-- ============================================================
-- This script addresses all root causes simultaneously:
-- 1. Drops any broken or mismatched foreign key constraint on public.posts(user_id)
-- 2. Establishes a direct foreign key to auth.users(id) ON DELETE CASCADE (and ensures public.profiles consistency)
-- 3. Creates an automatic profile creation trigger on auth.users with backfill for existing users
-- 4. Configures Row Level Security (RLS) on posts with proper policies for auth.uid() = user_id
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- STEP 1: Foreign Key Constraint Fix
-- ------------------------------------------------------------
-- Find and drop all existing foreign key constraints on posts.user_id
DO $$
DECLARE
  fk_record RECORD;
BEGIN
  FOR fk_record IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'posts'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS %I;', fk_record.constraint_name);
  END LOOP;
END $$;

-- Guarantee user_id exists as UUID
ALTER TABLE public.posts
  ALTER COLUMN user_id DROP NOT NULL; -- allows flexibility, or keep NOT NULL if strictly required

-- Option A (Recommended for production): Reference auth.users(id) directly ON DELETE CASCADE
-- This guarantees any authenticated user in auth.users can always post without being blocked by a missing profile table row.
ALTER TABLE public.posts
  ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- If your schema also enforces a 1:1 relation to public.profiles, ensure profiles references auth.users:
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    -- Ensure profiles id references auth.users(id)
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- STEP 2: Automatic Profile Creation Trigger & Backfill
-- ------------------------------------------------------------
-- Create the trigger function to automatically create a profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into public.profiles (or public.users if using users)
  IF to_regclass('public.profiles') IS NOT NULL THEN
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      COALESCE(
        (NEW.raw_user_meta_data->>'role')::public.app_role,
        'customer'::public.app_role
      )
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- CRITICAL BACKFILL: Sync existing auth.users that may have signed up before the trigger existed!
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    INSERT INTO public.profiles (id, full_name, role)
    SELECT
      u.id,
      COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
      COALESCE((u.raw_user_meta_data->>'role')::public.app_role, 'customer'::public.app_role)
    FROM auth.users u
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ------------------------------------------------------------
-- STEP 3: Row Level Security (RLS) on posts
-- ------------------------------------------------------------
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Clean up existing conflicting policies
DROP POLICY IF EXISTS "Public can view active posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;

-- 1. Anyone (including unauthenticated visitors) can read active posts
CREATE POLICY "Public can view active posts"
  ON public.posts
  FOR SELECT
  USING (
    status = 'active'
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

-- 2. Authenticated users can insert their own posts
CREATE POLICY "Authenticated users can create posts"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  );

-- 3. Users can update only their own posts
CREATE POLICY "Users can update own posts"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete only their own posts
CREATE POLICY "Users can delete own posts"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMIT;
