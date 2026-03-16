-- ============================================================
-- 001_initial_schema.sql
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── user_settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id       uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name  text,
  currency      text NOT NULL DEFAULT 'IDR',
  locale        text NOT NULL DEFAULT 'id-ID',
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── accounts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        text NOT NULL,
  purpose     text NOT NULL CHECK (purpose IN ('Living', 'Playing', 'Saving', 'Investment')),
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON public.accounts (user_id);

-- ── categories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        text NOT NULL,
  flow_type   text NOT NULL CHECK (flow_type IN ('Income', 'Expense', 'Transfer')),
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categories_user_id_idx ON public.categories (user_id);

-- ── transactions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date             date NOT NULL,
  month            date NOT NULL,  -- always yyyy-MM-01
  account_id       uuid NOT NULL REFERENCES public.accounts (id),
  category_id      uuid NOT NULL REFERENCES public.categories (id),
  flow_type        text NOT NULL CHECK (flow_type IN ('Income', 'Expense', 'Transfer')),
  debit            numeric(15, 2) NOT NULL DEFAULT 0,
  credit           numeric(15, 2) NOT NULL DEFAULT 0,
  type             text NOT NULL DEFAULT 'Normal' CHECK (type IN ('Normal', 'Transfer')),
  transfer_pair_id text,  -- 'TRF-NNN', kept for data migration compatibility
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx   ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_month_idx     ON public.transactions (user_id, month);
CREATE INDEX IF NOT EXISTS transactions_account_idx   ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS transactions_category_idx  ON public.transactions (category_id);

-- ── account_balances ─────────────────────────────────────────
-- Snapshot balances for the Accounts tab (replaces ?sheet=Account_Balance fetch)
CREATE TABLE IF NOT EXISTS public.account_balances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  balance     numeric(15, 2) NOT NULL DEFAULT 0,
  as_of_date  date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, as_of_date)
);

CREATE INDEX IF NOT EXISTS account_balances_user_id_idx ON public.account_balances (user_id);

-- ── budgets ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  month        date NOT NULL,  -- yyyy-MM-01
  amount       numeric(15, 2) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);

CREATE INDEX IF NOT EXISTS budgets_user_id_idx ON public.budgets (user_id, month);
