-- ============================================================
-- 004_remove_auto_seed_trigger.sql
-- Replaces the auto-seed trigger (003) with an onboarding wizard
-- approach. Users now choose their own accounts and categories
-- during first-run onboarding.
-- Run AFTER 003_seed_default_data.sql
-- ============================================================

-- Drop trigger first, then function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Add onboarding_completed flag to user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- NOTE: Existing users (if any) who were seeded via the old trigger
-- will have onboarding_completed = false by default.
-- Update them manually if needed:
-- UPDATE public.user_settings SET onboarding_completed = true WHERE user_id IN (...);
