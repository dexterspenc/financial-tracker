-- Migration 005: Fix Transfer category names to match canonical list
-- Affected users: anyone who completed onboarding before this fix
-- (onboarding inserted 'Tabungan' and 'Penarikan Tabungan' instead of
--  'Saving' and 'Saving Withdrawal', and was missing 'Investment Buy' /
--  'Investment Sell' entirely)

-- 1. Rename Indonesian names → English canonical names
UPDATE categories
SET name = 'Saving'
WHERE flow_type = 'Transfer'
  AND name = 'Tabungan';

UPDATE categories
SET name = 'Saving Withdrawal'
WHERE flow_type = 'Transfer'
  AND name = 'Penarikan Tabungan';

-- 2. Insert 'Investment Buy' for users who don't have it yet
INSERT INTO categories (user_id, name, flow_type, sort_order)
SELECT DISTINCT c.user_id, 'Investment Buy', 'Transfer', 25
FROM categories c
WHERE c.flow_type = 'Transfer'
  AND NOT EXISTS (
    SELECT 1 FROM categories x
    WHERE x.user_id = c.user_id
      AND x.name = 'Investment Buy'
      AND x.flow_type = 'Transfer'
  );

-- 3. Insert 'Investment Sell' for users who don't have it yet
INSERT INTO categories (user_id, name, flow_type, sort_order)
SELECT DISTINCT c.user_id, 'Investment Sell', 'Transfer', 26
FROM categories c
WHERE c.flow_type = 'Transfer'
  AND NOT EXISTS (
    SELECT 1 FROM categories x
    WHERE x.user_id = c.user_id
      AND x.name = 'Investment Sell'
      AND x.flow_type = 'Transfer'
  );
