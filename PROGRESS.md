# PROGRESS.md — SaaS Rebuild Progress Log

Last updated: 2026-03-15 (Session 6 — Auth polish + code hygiene)

---

## Personal Version (main branch) — COMPLETE

- ✅ Core transaction tracking (add, edit, delete, transfer)
- ✅ Google Sheets backend via Apps Script
- ✅ Full UI overhaul: design system tokens, shadcn/ui dialogs, sonner toasts
- ✅ Tremor charts (DonutChart, AreaChart, BarList) → migrated to Chart.js (Doughnut, Line)
- ✅ Lucide icons (replaced emojis in BottomNav, AI widget, forms)
- ✅ AI Advisor: full-page chat (Analytics tab) + floating FAB widget (all pages)
- ✅ AI Advisor: sends full transaction history as context (not just monthly summary)
- ✅ Bug fixes: donut chart colors, top expenses % display, trends chart rendering
- ✅ Analytics: Overview, Accounts, Trends, Budget, AI tabs

---

## SaaS Rebuild (saas-rebuild branch)

### Infrastructure
- ✅ `saas-rebuild` branch created
- ✅ Supabase project created (`nhoicsupaccepvnwtqpv.supabase.co`)
- ✅ Environment variables configured (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — `.env.example` added
- ✅ `@supabase/supabase-js` installed
- ✅ `src/lib/supabase.js` — Supabase client initialized and exported

### Database
- ✅ `supabase/migrations/001_initial_schema.sql` — all 6 tables with indexes
- ✅ `supabase/migrations/002_rls_policies.sql` — RLS on all tables (user_id isolation)
- ✅ `supabase/migrations/003_seed_default_data.sql` — trigger seeds accounts + categories on new user signup
- ⚠️ **ACTION REQUIRED**: Run migrations 001→002→003 in Supabase Dashboard → SQL Editor

### Auth
- ✅ Supabase Auth — Email + Password (configured in `AuthContext`)
- ✅ Supabase Auth — Google OAuth (configured in `AuthContext`, requires Dashboard setup)
- ✅ `src/contexts/AuthContext.jsx` — provides `user`, `session`, `loading`, `signIn`, `signUp`, `signInWithGoogle`, `signOut`
- ✅ `src/components/ProtectedRoute.jsx` — redirects to `/login`, renders BottomNav + AIAdvisorWidget only when authenticated
- ✅ `src/pages/LoginPage.jsx` + `LoginPage.css` — email/password form + Google OAuth button
- ✅ `src/pages/RegisterPage.jsx` + `RegisterPage.css` — registration form (shares LoginPage.css)
- ✅ `src/App.jsx` updated — AuthProvider wraps all routes, `/login` + `/register` added, existing routes protected
- ⚠️ **ACTION REQUIRED (Google OAuth)**: Supabase Dashboard → Auth → Providers → Google → add Client ID + Secret

### Technical decisions
- ProtectedRoute uses React Router 7 `<Outlet />` pattern — BottomNav and AIAdvisorWidget moved into ProtectedRoute so they only render when authenticated
- RegisterPage imports `LoginPage.css` (same design, no duplication)
- `VITE_ANTHROPIC_API_KEY` removed from `.env` — now lives only in Supabase Edge Function secrets

### Data Layer (Step 4 — COMPLETE)
- ✅ `src/hooks/useTransactions.js` — `fetchTransactions`, `addTransaction`, `addTransactionPair`, `updateTransaction`, `deleteTransaction` + `normalizeTxn` helper
- ✅ `src/hooks/useAccounts.js` — `fetchAccounts`, `fetchAccountBalances`
- ✅ `src/hooks/useCategories.js` — `fetchCategories`
- ✅ `src/hooks/useBudgets.js` — `fetchBudgets`, `upsertBudget`, `deleteBudget`
- ✅ `src/pages/HomePage.jsx` — rewritten with `useAuth` + `useTransactions`; saldo per akun via `fetchAccountBalances`
- ✅ `src/pages/HistoryPage.jsx` — rewritten; delete/edit by UUID; filters use normalized fields
- ✅ `src/TransactionForm.jsx` — rewritten; atomic transfer insert; accounts/categories from DB
- ✅ `src/components/EditModal.jsx` — rewritten; pre-fills from normalized txn; updates by UUID
- ✅ `src/components/AIAdvisorWidget.jsx` — uses `supabase.functions.invoke('ai-chat')` (no client-side API key)
- ✅ `src/pages/AnalyticsPage.jsx` — budget tab migrated to `useBudgets` hook (Supabase); removed localStorage; per-category read-only view with link to Settings
- ✅ `src/config.js` — `APPS_SCRIPT_URL`, `ACCOUNTS`, `CATEGORIES` removed; file cleared

### P1 — AI Edge Function (COMPLETE)
- ✅ `supabase/functions/ai-chat/index.ts` — Deno Edge Function; JWT verification; Anthropic API proxy; CORS
- ✅ `src/components/AIAdvisor.jsx` — uses `supabase.functions.invoke('ai-chat', { body: { messages, context } })`
- ✅ `src/components/AIAdvisorWidget.jsx` — uses `supabase.functions.invoke('ai-chat', { body: { messages, context } })`
- ✅ `.env` — `VITE_ANTHROPIC_API_KEY` removed
- ✅ `.env.example` — `VITE_ANTHROPIC_API_KEY` removed; comment added explaining Edge Function secrets
- ⚠️ **ACTION REQUIRED**: Supabase Dashboard → Edge Functions → Secrets → add `ANTHROPIC_API_KEY`
- ⚠️ **ACTION REQUIRED**: Deploy Edge Function: `supabase functions deploy ai-chat`

### P2 — Onboarding Wizard (COMPLETE)
- ✅ `supabase/migrations/004_remove_auto_seed_trigger.sql` — drops old auto-seed trigger; adds `onboarding_completed` column to `user_settings`
- ✅ `src/contexts/AuthContext.jsx` — added `onboardingCompleted` state (null/true/false), `checkOnboarding()`, `completeOnboarding()`
- ✅ `src/components/ProtectedRoute.jsx` — two-layer guard: auth + onboarding; no chrome on `/onboarding`
- ✅ `src/pages/OnboardingPage.jsx` — 4-step wizard: Pilih Akun → Pilih Kategori → Saldo Awal → Selesai; resume logic; custom account/category input
- ✅ `src/pages/OnboardingPage.css` — wizard CSS
- ⚠️ **ACTION REQUIRED**: Run migration 004 in Supabase Dashboard → SQL Editor

### P3 — Settings Page (COMPLETE)
- ✅ `src/pages/SettingsPage.jsx` — 4 sections: Profil (display_name + logout), Kelola Akun (CRUD), Kelola Kategori (CRUD), Budget (per-category, `useBudgets`)
- ✅ `src/pages/SettingsPage.css`
- ✅ `src/App.jsx` — `/settings` + `/onboarding` routes added inside `<ProtectedRoute>`
- ✅ `src/components/BottomNav.jsx` — 5th tab: Pengaturan (Settings icon)
- ✅ `src/pages/AnalyticsPage.jsx` — budget tab: read-only per-category view; "Kelola Budget" button navigates to `/settings?tab=budget`

### P4 — Polish & Minor Fixes (COMPLETE)
- ✅ `src/pages/HomePage.jsx` — saldo per akun section added (grid cards, respects hideBalance toggle)
- ✅ `src/pages/LoginPage.jsx` — already-authenticated users redirected to `/` via `<Navigate>`
- ✅ `src/pages/RegisterPage.jsx` — shows "Cek Email Kamu" confirmation view after successful signup (no automatic redirect)

---

## User Journey Audit — Session 4 (2026-03-15)

### Phase 1 — Auth ✅ (mostly complete, 3 minor gaps)
- ✅ ProtectedRoute → /login redirect, loading spinner
- ✅ LoginPage + RegisterPage: email/password + Google OAuth
- ✅ Session persistence via `getSession()` + `onAuthStateChange`
- ⚠️ `/login` doesn't redirect already-authenticated users away — **kecil** (`src/pages/LoginPage.jsx`: add check `if (user) navigate('/')`)
- ⚠️ No "cek email kamu" after signup — if Supabase email confirmation is on, user gets no guidance — **kecil** (`src/pages/RegisterPage.jsx`: show message instead of navigating to /login)
- ⚠️ No forgot password / reset flow — **kecil** (new `/forgot-password` page + `supabase.auth.resetPasswordForEmail()`)

### Phase 2 — Onboarding ⚠️ (functional, 1 gap)
- ✅ `003_seed_default_data.sql` trigger: seeds 17 accounts + 28 categories + user_settings on any signup (email or Google)
- ❌ No welcome / empty-state guidance for new users on first login — **kecil** (detect zero transactions in HomePage, show onboarding prompt)

### Phase 3 — Core App ⚠️ (functional, 2 gaps)
- ✅ BottomNav: Home, Add, History, Analytics
- ✅ All 4 pages fully migrated to Supabase (no GSheets references)
- ✅ HistoryPage: filter, search, edit, delete by UUID
- ✅ AnalyticsPage: all 5 tabs (Overview, Accounts, Trends, Budget, Reports) + AI tab
- ⚠️ **HomePage missing "saldo per akun"** — Phase 3 requires per-account balance breakdown. `fetchAccountBalances` hook exists but unused in HomePage — **kecil** (`src/pages/HomePage.jsx`: call `fetchAccountBalances`, display by purpose group)
- ⚠️ **BottomNav: no Settings tab** — Phase 4 requires Settings accessible via bottom nav — **kecil** (add 5th item once SettingsPage exists)
- ⚠️ **Budget tab (AnalyticsPage) uses localStorage** — `useBudgets` hook targeting Supabase `budgets` table exists but is not wired up. Budget still uses `localStorage` keyed by `budgets_{user.id}_{month}` — **sedang** (wire up `useBudgets` in AnalyticsPage; schema stores by `category_id` not "purpose", needs design decision)

### Phase 4 — Settings ❌ (not started — largest gap)
- ❌ `src/pages/SettingsPage.jsx` — file doesn't exist — **besar**
- ❌ `/settings` route not in `App.jsx`
- ❌ Settings tab not in `BottomNav.jsx`
- ❌ Profil sub-view: display name, email display, logout button
- ❌ Kelola Akun: add, rename, deactivate accounts, set purpose
- ❌ Kelola Kategori: add, rename, deactivate categories
- ❌ Budget & Data: migrate budgets from localStorage → Supabase `budgets` table
- **Files to create/modify:** `src/pages/SettingsPage.jsx`, `src/pages/SettingsPage.css`, update `App.jsx` (+1 route), update `BottomNav.jsx` (+1 item)

### Phase 5 — AI Advisor ❌ (CRITICAL — API key exposed, one component broken)
- ❌ `supabase/functions/ai-chat/index.ts` — **doesn't exist** — Edge Function not created
- ❌ `VITE_ANTHROPIC_API_KEY` still in `.env` and used in both AI components — **violates CLAUDE.md API key rules**
- ⚠️ `AIAdvisorWidget.jsx` (line 93): calls `https://api.anthropic.com/v1/messages` directly — works but wrong target
- ⚠️ `AIAdvisor.jsx` (line 76): calls `/api/anthropic/v1/messages` (relative URL, **doesn't exist** → broken) AND exposes API key — **AI tab in Analytics is currently broken**
- **Fix plan:** Create `supabase/functions/ai-chat/index.ts` (verify JWT, call Anthropic server-side), update both components to call Supabase Edge Function URL with `Authorization: Bearer <session.access_token>` — **sedang**

### Phase 6 — Data Layer ⚠️ (mostly complete, 2 action items)
- ✅ All hooks (useTransactions, useAccounts, useCategories, useBudgets) use Supabase client
- ✅ All queries filter by `user_id` + RLS as second layer
- ✅ Migrations written (001, 002, 003)
- ✅ Atomic transfer insert
- ⚠️ **ACTION REQUIRED**: Run migrations 001→002→003 in Supabase Dashboard → SQL Editor
- ⚠️ **ACTION REQUIRED (Google OAuth)**: Supabase Dashboard → Auth → Providers → Google → add Client ID + Secret
- ⚠️ `useBudgets` hook exists but unused (blocked by Phase 4 Settings work)
- ⚠️ `console.error` remains in `AnalyticsPage.jsx`, `HomePage.jsx`, `AIAdvisor.jsx` — minor code hygiene issue

---

### P5 — Auth Polish + Code Hygiene (COMPLETE)
- ✅ `src/pages/ForgotPasswordPage.jsx` — `/forgot-password` route; calls `supabase.auth.resetPasswordForEmail()`; shows "Cek Email Kamu" confirmation; "Kirim ulang" re-send option
- ✅ `src/pages/LoginPage.jsx` — "Lupa kata sandi?" link added below password field
- ✅ `src/App.jsx` — `/forgot-password` route added (public)
- ✅ `src/pages/HomePage.jsx` — empty state enhanced: CTA button "Tambah Transaksi Pertama" → `/add`; `console.error` removed
- ✅ `src/pages/AnalyticsPage.jsx` — `console.error` removed

---

## Remaining Work

### 🟢 Infrastructure
1. **Run migration 004** in Supabase Dashboard → SQL Editor (if not yet applied)
2. **Deploy Edge Function**: `supabase functions deploy ai-chat` + add `ANTHROPIC_API_KEY` secret (already done in Session 5)
3. **PWA setup** (manifest, service worker, offline fallback)
4. **Deploy to Vercel** + custom domain
