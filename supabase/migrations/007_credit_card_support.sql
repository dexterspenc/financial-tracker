ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS is_credit_account boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_limit numeric(15,2),
  ADD COLUMN IF NOT EXISTS statement_date int,   -- day of month, e.g. 17
  ADD COLUMN IF NOT EXISTS due_date int;          -- day of month, e.g. 2
