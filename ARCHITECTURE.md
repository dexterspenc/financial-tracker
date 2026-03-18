# ARCHITECTURE.md — SaaS Target Architecture

---

## Migration Map

| Personal Version | → | SaaS Version |
|---|---|---|
| Google Sheets (2D array) | → | Supabase PostgreSQL |
| Google Apps Script HTTP endpoint | → | Supabase REST API + JS client |
| Client-side row index targeting | → | UUID primary keys |
| Sequential POSTs for transfers | → | Single DB transaction (RPC or Edge Function) |
| `localStorage` budgets | → | `budgets` table, scoped by `user_id` |
| Hardcoded `config.js` (accounts, categories) | → | `accounts` + `categories` tables per user |
| `VITE_ANTHROPIC_API_KEY` in browser bundle | → | Supabase Edge Function (server-side only) |
| No auth | → | Supabase Auth (Email/Password + Google OAuth) |

---

## Branching Strategy

| Branch | Purpose | Rules |
|---|---|---|
| `main` | Personal version — live, single-user | FROZEN. No commits. No merges from saas-rebuild. |
| `saas-rebuild` | SaaS version — all migration work | All new features land here first. |

---

## Database Schema

### `transactions`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid REFERENCES auth.users NOT NULL
date          date NOT NULL
month         date NOT NULL                  -- always yyyy-MM-01
account_id    uuid REFERENCES accounts(id) NOT NULL
category_id   uuid REFERENCES categories(id) NOT NULL
flow_type     text NOT NULL                  -- 'Income' | 'Expense' | 'Transfer'
debit         numeric(15,2) DEFAULT 0
credit        numeric(15,2) DEFAULT 0
type          text DEFAULT 'Normal'          -- 'Normal' | 'Transfer'
transfer_pair_id  text                       -- 'TRF-NNN' (kept for data migration compat)
note          text
created_at    timestamptz DEFAULT now()
```

### `accounts`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid REFERENCES auth.users NOT NULL
name          text NOT NULL                  -- e.g. 'BCA', 'Cash'
purpose       text NOT NULL                  -- 'Living' | 'Playing' | 'Saving' | 'Investment'
sort_order    int DEFAULT 0
is_active     boolean DEFAULT true
created_at    timestamptz DEFAULT now()
```

### `categories`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid REFERENCES auth.users NOT NULL
name          text NOT NULL                  -- e.g. 'Daily Needs', 'Salary'
flow_type     text NOT NULL                  -- 'Income' | 'Expense' | 'Transfer'
sort_order    int DEFAULT 0
is_active     boolean DEFAULT true
created_at    timestamptz DEFAULT now()
```

### `account_balances`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid REFERENCES auth.users NOT NULL
account_id    uuid REFERENCES accounts(id) NOT NULL
balance       numeric(15,2) DEFAULT 0
as_of_date    date NOT NULL
created_at    timestamptz DEFAULT now()
```

### `budgets`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid REFERENCES auth.users NOT NULL
category_id   uuid REFERENCES categories(id) NOT NULL
month         date NOT NULL                  -- yyyy-MM-01
amount        numeric(15,2) NOT NULL
created_at    timestamptz DEFAULT now()
UNIQUE (user_id, category_id, month)
```

### `user_settings`
```sql
user_id       uuid PRIMARY KEY REFERENCES auth.users
display_name  text
currency      text DEFAULT 'IDR'
locale        text DEFAULT 'id-ID'
updated_at    timestamptz DEFAULT now()
```

---

## Row Level Security (RLS)

All tables use the same pattern:
```sql
-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own rows
CREATE POLICY "user_isolation" ON transactions
  FOR ALL USING (auth.uid() = user_id);
```

Apply this to: `transactions`, `accounts`, `categories`, `account_balances`, `budgets`, `user_settings`.

---

## Auth

| Method | Notes |
|---|---|
| Email + Password | Built-in Supabase Auth |
| Google OAuth | Configure in Supabase Dashboard → Auth → Providers → Google |
| Session | Managed by `@supabase/supabase-js` — stored in localStorage automatically |
| JWT | Included automatically in all Supabase client requests |

React integration:
- `src/lib/supabase.js` — initializes and exports the Supabase client
- `src/contexts/AuthContext.jsx` — provides `user`, `signIn`, `signOut`, `signUp`
- Protected routes: redirect to `/login` if no active session

---

## Edge Function: `/functions/v1/ai-chat`

**Purpose:** Proxy all Anthropic API calls server-side so the API key never reaches the browser.

**Request (from client):**
```json
{
  "messages": [...],
  "context": "...financial data JSON...",
  "selectedMonth": "2026-03"
}
```

**What the function does:**
1. Verifies the user's JWT (`Authorization: Bearer <supabase_token>`)
2. Rejects unauthenticated requests
3. Prepends financial context to the first message
4. Calls `https://api.anthropic.com/v1/messages` using `ANTHROPIC_API_KEY` (env var, server-side only)
5. Returns the assistant's response

**Environment variables (Supabase Dashboard → Edge Functions → Secrets):**
- `ANTHROPIC_API_KEY` — never in client code
- `SUPABASE_URL` — injected automatically
- `SUPABASE_ANON_KEY` — injected automatically

---

## Key Client Files (target structure)

```
src/
  lib/
    supabase.js          — createClient(url, anonKey)
  contexts/
    AuthContext.jsx      — session state, signIn/signOut/signUp helpers
  hooks/
    useTransactions.js   — data fetching + mutations via supabase client
    useAnalytics.js      — derived analytics computed from transaction data
  pages/
    LoginPage.jsx        — Email/password + Google OAuth login
    SettingsPage.jsx     — Manage accounts, categories, budgets, profile
  components/
    ProtectedRoute.jsx   — Redirects to /login if no session
supabase/
  functions/
    ai-chat/
      index.ts           — Edge Function: Anthropic API proxy
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
    003_seed_default_data.sql
    004_remove_auto_seed_trigger.sql
```

---

## Deployment

| Version | Branch | Vercel Project | URL |
|---|---|---|---|
| Personal | `main` | `financial-tracker` | https://financial-tracker-self.vercel.app |
| SaaS | `saas-rebuild` | `financial-tracker-saas` | https://financial-tracker-saas.vercel.app |

- Setiap push ke `saas-rebuild` otomatis trigger re-deploy di Vercel.
- Supabase project ref: `nhoicsupaccepvnwtqpv`

---

## Edge Function Status

| Function | Status | Notes |
|---|---|---|
| `ai-chat` | ✅ Deployed | `ANTHROPIC_API_KEY` tersimpan di Supabase Edge Function Secrets |

Semua Anthropic API calls diproxy melalui Edge Function — API key tidak pernah sampai ke client bundle.

---

## Future Considerations

- **Pisahkan `purpose` dan `type` di tabel `accounts`** — saat ini `purpose` digunakan untuk Living/Playing/Saving/Investment sekaligus. Idealnya ada kolom terpisah: `purpose` (Living/Playing/Saving) dan `type` (Cash/Bank/Investment) untuk fleksibilitas analytics yang lebih baik.
- **Admin dashboard** — monitoring users, usage, dan error rates. Berguna saat onboarding users baru.
- **PWA setup** — manifest + service worker untuk offline support dan installable app di mobile. Belum dikerjakan.
- **Data migration dari Google Sheets** — tooling untuk import histori transaksi existing user ke Supabase. Diperlukan jika personal version user ingin pindah ke SaaS version.
