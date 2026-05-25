-- ============================================================
-- 008_valas_support.sql
-- Adds multi-currency (valas) support to accounts.
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IDR';
