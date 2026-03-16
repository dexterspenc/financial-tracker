-- ============================================================
-- 003_seed_default_data.sql
-- Auto-seeds accounts, categories, and user_settings for
-- every new user on sign-up via a trigger on auth.users.
-- Run AFTER 002_rls_policies.sql
-- ============================================================

-- ── Seed function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- user_settings (display_name from OAuth if available)
  INSERT INTO public.user_settings (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
  );

  -- ── Default accounts (mirrors config.js ACCOUNTS) ──────────
  INSERT INTO public.accounts (user_id, name, purpose, sort_order) VALUES
    -- Living
    (NEW.id, 'Cash',            'Living',     1),
    (NEW.id, 'BCA',             'Living',     2),
    (NEW.id, 'Ovo',             'Living',     3),
    (NEW.id, 'Dana',            'Living',     4),
    (NEW.id, 'ShopeePay',       'Living',     5),
    (NEW.id, 'Mandiri_eMoney',  'Living',     6),
    -- Playing
    (NEW.id, 'Mandiri',         'Playing',    7),
    (NEW.id, 'Gopay',           'Playing',    8),
    (NEW.id, 'Flazz',           'Playing',    9),
    -- Saving
    (NEW.id, 'Blu',             'Saving',     10),
    (NEW.id, 'SeaBank',         'Saving',     11),
    -- Investment
    (NEW.id, 'Deposit',         'Investment', 12),
    (NEW.id, 'RDPU',            'Investment', 13),
    (NEW.id, 'Bond',            'Investment', 14),
    (NEW.id, 'Gold',            'Investment', 15),
    (NEW.id, 'Stock',           'Investment', 16),
    (NEW.id, 'Crypto',          'Investment', 17);

  -- ── Default categories (mirrors config.js CATEGORIES) ──────
  INSERT INTO public.categories (user_id, name, flow_type, sort_order) VALUES
    -- Income
    (NEW.id, 'Salary',                  'Income',   1),
    (NEW.id, 'Side Hustle',             'Income',   2),
    (NEW.id, 'Other Income',            'Income',   3),
    (NEW.id, 'Reimbursement Received',  'Income',   4),
    -- Expense
    (NEW.id, 'Daily Needs',             'Expense',  5),
    (NEW.id, 'Dating',                  'Expense',  6),
    (NEW.id, 'Transport',               'Expense',  7),
    (NEW.id, 'Groceries',               'Expense',  8),
    (NEW.id, 'Health',                  'Expense',  9),
    (NEW.id, 'Entertainment',           'Expense',  10),
    (NEW.id, 'Shopping',                'Expense',  11),
    (NEW.id, 'Education',               'Expense',  12),
    (NEW.id, 'Gift',                    'Expense',  13),
    (NEW.id, 'Subscription',            'Expense',  14),
    (NEW.id, 'Utility',                 'Expense',  15),
    (NEW.id, 'Family',                  'Expense',  16),
    (NEW.id, 'Other Expense',           'Expense',  17),
    (NEW.id, 'Lifestyle',               'Expense',  18),
    (NEW.id, 'Social',                  'Expense',  19),
    (NEW.id, 'Self Improvement',        'Expense',  20),
    (NEW.id, 'Travel',                  'Expense',  21),
    (NEW.id, 'Reimbursable Expense',    'Expense',  22),
    -- Transfer
    (NEW.id, 'Transfer',                'Transfer', 23),
    (NEW.id, 'Topup',                   'Transfer', 24),
    (NEW.id, 'Investment Buy',          'Transfer', 25),
    (NEW.id, 'Investment Sell',         'Transfer', 26),
    (NEW.id, 'Saving',                  'Transfer', 27),
    (NEW.id, 'Saving Withdrawal',       'Transfer', 28);

  RETURN NEW;
END;
$$;

-- ── Trigger: fires after every new auth.users INSERT ─────────
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
