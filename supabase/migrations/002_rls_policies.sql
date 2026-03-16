-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security — users can only access their own rows
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ── user_settings ────────────────────────────────────────────
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_isolation" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── accounts ─────────────────────────────────────────────────
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_isolation" ON public.accounts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── categories ───────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_isolation" ON public.categories
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── transactions ─────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_isolation" ON public.transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── account_balances ─────────────────────────────────────────
ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_balances_isolation" ON public.account_balances
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── budgets ──────────────────────────────────────────────────
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_isolation" ON public.budgets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
