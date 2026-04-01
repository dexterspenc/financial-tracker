-- 006_quick_actions.sql
-- Adds quick_actions JSONB column to user_settings.
--
-- Structure: JSON array of exactly 4 elements.
-- Each element is either null (empty slot) or an object:
--   { "category_id": "<uuid>", "default_account_id": "<uuid>" }
--
-- TO APPLY:
--   Supabase Dashboard → SQL Editor → paste and run the block below.
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS quick_actions JSONB DEFAULT '[null,null,null,null]'::jsonb;

-- Back-fill any existing rows that were inserted before this migration
UPDATE user_settings
  SET quick_actions = '[null,null,null,null]'::jsonb
  WHERE quick_actions IS NULL;
