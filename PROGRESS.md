# PROGRESS.md — SaaS Rebuild Progress Log

Last updated: 2026-05-25 (Session 10 — Valas accounts, transfer integrity, perf, code-quality)

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
- ✅ `supabase/migrations/004_remove_auto_seed_trigger.sql` — drops old auto-seed trigger; adds `onboarding_completed` to `user_settings`
- ✅ Migrations 001→002→003→004 applied in Supabase Dashboard → SQL Editor

### Auth
- ✅ Supabase Auth — Email + Password (configured in `AuthContext`)
- ✅ Supabase Auth — Google OAuth (configured in `AuthContext`, requires Dashboard setup)
- ✅ `src/contexts/AuthContext.jsx` — provides `user`, `session`, `loading`, `signIn`, `signUp`, `signInWithGoogle`, `signOut`
- ✅ `src/components/ProtectedRoute.jsx` — redirects to `/login`, renders BottomNav + AIAdvisorWidget only when authenticated
- ✅ `src/pages/LoginPage.jsx` + `LoginPage.css` — email/password form + Google OAuth button
- ✅ `src/pages/RegisterPage.jsx` + `RegisterPage.css` — registration form (shares LoginPage.css)
- ✅ `src/App.jsx` updated — AuthProvider wraps all routes, `/login` + `/register` added, existing routes protected
- ✅ Google OAuth — configured in Supabase Dashboard → Auth → Providers → Google

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
- ✅ `ANTHROPIC_API_KEY` added to Supabase Edge Function Secrets
- ✅ Edge Function deployed: `supabase functions deploy ai-chat`

### P2 — Onboarding Wizard (COMPLETE)
- ✅ `supabase/migrations/004_remove_auto_seed_trigger.sql` — drops old auto-seed trigger; adds `onboarding_completed` column to `user_settings`
- ✅ `src/contexts/AuthContext.jsx` — added `onboardingCompleted` state (null/true/false), `checkOnboarding()`, `completeOnboarding()`
- ✅ `src/components/ProtectedRoute.jsx` — two-layer guard: auth + onboarding; no chrome on `/onboarding`
- ✅ `src/pages/OnboardingPage.jsx` — 4-step wizard: Pilih Akun → Pilih Kategori → Saldo Awal → Selesai; resume logic; custom account/category input
- ✅ `src/pages/OnboardingPage.css` — wizard CSS
- ✅ Migration 004 applied in Supabase Dashboard → SQL Editor

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

### Phase 5 — AI Advisor ✅ RESOLVED (see "P1 — AI Edge Function" above; this audit snapshot is historical)
> Note: items below were the Session-4 audit findings. All resolved — AI now uses `supabase.functions.invoke('ai-chat')`, Anthropic key lives only in Edge Function secrets, both AI components work.
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

### P6 — Deploy (COMPLETE)
- ✅ Branch `saas-rebuild` pushed to GitHub (`github.com/dexterspenc/financial-tracker`)
- ✅ Deployed to Vercel — project `financial-tracker-saas` (production, branch `saas-rebuild`)
- ✅ Vercel production URL: `financial-tracker-saas.vercel.app`

---

### P7 — Bug Fixes, DataContext & Account Balance (Session 8 — 2026-03-27)

**AI Advisor fixes (pre-session commits):**
- ✅ AI FAB button redesigned as pill with Sparkles icon and label
- ✅ Bot icon restored; markdown spacing fixed via component override
- ✅ AI chat session synced via AIChatContext; storage sync infinite loop reverted and fixed properly

**Transfer categories consistency:**
- ✅ `src/pages/OnboardingPage.jsx` — `TRANSFER_CATEGORIES` updated from 4 Indonesian names to 6 canonical English names matching SQL seed
- ✅ `supabase/migrations/005_fix_transfer_categories.sql` — renames `Tabungan`→`Saving`, `Penarikan Tabungan`→`Saving Withdrawal` for existing users; INSERTs missing `Investment Buy` and `Investment Sell` per user
- ✅ Migration 005 applied in Supabase Dashboard

**Account balance in Analytics:**
- ✅ `src/hooks/useAccounts.js` — `fetchAccountBalances` confirmed returning `accounts(id, name, purpose)` join
- ✅ `src/pages/AnalyticsPage.jsx` — opening balance from `account_balances` table now included in both `calculateAnalytics` (by purpose) and `computeAccountsData` (by account name)

**DataContext — centralized data fetching:**
- ✅ `src/contexts/DataContext.jsx` — new context; fetches transactions, accounts, categories, accountBalances in one `Promise.all` on login; exposes `refetch()` to invalidate after mutations; clears all state on logout
- ✅ `src/App.jsx` — `<DataProvider>` wraps protected routes
- ✅ `src/pages/HomePage.jsx` — migrated to `useData()`; stats via `useMemo`; eliminates per-navigation re-fetch
- ✅ `src/pages/HistoryPage.jsx` — migrated to `useData()`; delete/edit success calls `refetch()` instead of re-fetching locally
- ✅ `src/pages/AnalyticsPage.jsx` — migrated to `useData()`; `openingBalances` derived via `useMemo` from context `accountBalances`
- ✅ `src/TransactionForm.jsx` — migrated to `useData()`; calls `refetch()` after successful submit
- ✅ `src/components/EditModal.jsx` — migrated to `useData()`; eliminates per-open fetch of accounts/categories

**TDZ production build error — fixed (4 iterations):**
- ✅ Removed hook factory imports (`useTransactions`, `useAccounts`, `useCategories`) from DataContext — supabase called directly
- ✅ `src/utils/normalizeTxn.js` — extracted `normalizeTxn` to standalone utility; DataContext and useTransactions both import from here (no circular path)
- ✅ `src/TransactionForm.jsx` — replaced `import('./lib/supabase')` dynamic import with static import (mixed static/dynamic on same module caused Rollup TDZ)
- ✅ `src/pages/AnalyticsPage.jsx` — moved `openingBalances` `useMemo` declaration above useEffects that reference it in dependency arrays

**Onboarding:**
- ✅ First real user completed onboarding successfully — wizard confirmed working end-to-end

### P8 — Session 9: Migration, Debit/Credit Fix, UI Features (2026-04-01)

**Data migration:**
- ✅ 363 transaksi dari Google Sheets dimigrasi ke Supabase via CSV import script (`scripts/`)
- ✅ Fix `type=Transfer` — migrasi menyertakan nilai `type` yang benar untuk baris Transfer
- ✅ Fix debit/credit convention di semua file — konvensi SaaS: Income→credit, Expense→debit (kebalikan dari Google Sheets; ARCHITECTURE.md dan semua hooks/pages sudah disesuaikan)

**Bug fixes:**
- ✅ Fix cashflow minus display — nilai cashflow negatif kini tampil dengan tanda `-` di HomePage summary cards
- ✅ Fix radio button spacing — spacing pada komponen radio button/pill diperbaiki
- ✅ Session expiry check — AuthContext mendeteksi sesi expired dan redirect ke `/login`
- ✅ `refetch()` di Settings — SettingsPage kini panggil `refetch()` setelah add/edit/delete akun dan kategori (sudah ada di EditModal dan TransactionForm sejak P7)

**UI features:**
- ✅ History filter kategori grouped — HistoryPage filter kategori kini ditampilkan per grup (Pengeluaran / Pemasukan / Transfer)
- ✅ Transaksi Hari Ini section di Home — HomePage menampilkan section khusus transaksi hari ini di atas daftar transaksi terkini
- ✅ Logout button di Onboarding — tombol "Ganti Akun" ditambahkan di OnboardingPage untuk memudahkan ganti akun tanpa harus navigasi ke Settings
- ✅ Onboarding hint tooltip — hint tips pemilihan akun berdasarkan tujuan ditambahkan di Step 1 onboarding

### P9 — Session 10: Valas Accounts, Transfer Integrity, Perf & Code-Quality (2026-05-25)

**Valas (foreign currency) accounts — storage-only:**
- ✅ `supabase/migrations/008_valas_support.sql` — adds `currency` (default `IDR`) to `accounts`
- ✅ `src/utils/exchangeRates.js` — `fetchRates()` (frankfurter.dev, USD pivot, localStorage cache 1h) + `toIDR()` helper
- ✅ `src/contexts/DataContext.jsx` — exposes `exchangeRates` + `ratesDate`; fetches rates when valas accounts present
- ✅ `src/pages/SettingsPage.jsx` — currency dropdown (16 BCA Forex Pocket currencies that ECB supports) in add/edit account + valas badge
- ✅ `src/pages/HomePage.jsx` — valas balance cards show native amount + `≈ Rp` equivalent
- ✅ `src/pages/AnalyticsPage.jsx` — `valasAdjustment` memo converts valas balances to IDR in purpose totals + net worth; Accounts tab/modal show native + IDR
- ✅ `src/TransactionForm.jsx` — cross-currency transfer (dual amount fields, out/in); valas excluded from normal-mode account dropdown
- Decision: native storage, live mid-market rate (not BCA rate), funding via cross-currency transfer. SAR/AED excluded (no ECB rate).

**Transfer integrity fix:**
- ✅ `src/hooks/useTransactions.js` — `deleteTransferPair(pairId)` deletes both legs
- ✅ `src/pages/HistoryPage.jsx` — deleting a transfer removes both legs (was: orphaned leg → wrong balances)
- ✅ `src/components/EditModal.jsx` — editing a transfer syncs date/note to the pair; mirrors amount for same-currency legs

**Performance:**
- ✅ `src/App.jsx` — routes lazy-loaded via `React.lazy` + `Suspense`; initial JS ~923KB→604KB; Chart.js/tremor deferred to Analytics chunk

**Code quality:**
- ✅ `src/contexts/DataContext.jsx` — core fetch errors surfaced via toast (was silently swallowed)
- ✅ Empty best-effort `catch {}` blocks annotated (no-empty)
- Note: remaining lint warnings (react-refresh/only-export-components, exhaustive-deps, use-before-declare in SettingsPage) are framework/strictness cosmetics, not bugs — deferred intentionally.

### P9 — Session 11: Net Worth Trend Chart di Tab Trends (2026-07-15)

- ✅ `src/pages/AnalyticsPage.jsx` — card baru **"Net Worth Trend"** di paling atas tab Trends: line chart 12 bulan berisi net worth di akhir tiap bulan (memo `netWorthTrend`)
  - Snapshot `account_balances` dihitung mulai `as_of_date`-nya (akun yang dibuka belakangan, mis. valas per Jun 2026, tidak menggelembungkan bulan-bulan sebelumnya)
  - Valas diakumulasi dalam native currency per mata uang, dikonversi pakai kurs live hari ini (kurs historis tidak disimpan → kurva murni mencerminkan arus uang, bukan pergerakan kurs)
  - Titik bulan berjalan ditambah `investmentDelta` (live portfolio Mini-Aladdin) sehingga sama persis dengan angka Net Worth di Overview (`adjustedNetWorthBreakdown.netWorth`); CC balance ikut dihitung (negatif = utang)
  - Bulan-bulan sebelum data pertama (snapshot/transaksi paling awal) di-trim dari chart
  - Warna series `#2563eb` (brand-600), lolos validasi CVD/kontras terhadap hijau income + merah expense
- ✅ Trend income/expense diperpanjang **6 → 12 bulan** (konstanta `TREND_MONTHS`)
- ✅ Verifikasi: logika `netWorthTrend` di-mirror ke script test dgn data sintetis (6 assertion: kumulatif, as_of_date, valas, trimming, empty, missing rate → semua pass); build bersih; lint AnalyticsPage identik dgn HEAD (4 err/2 warn pre-existing)

**Follow-up dari review browser (sesi yang sama):**
- ✅ Chart income/expense ikut di-trim ke bulan pertama ada data (konsisten dgn net worth; sebelumnya render 12 bulan penuh → garis nol Aug–Dec 25); fallback "No data yet" ditambahkan
- ✅ Judul card "12-Month Trend" → **"Income & Expense Trend"** (jumlah bulan bisa < 12 setelah trim)
- ✅ Headline di card Net Worth Trend: nilai net worth sekarang (match Overview) + delta vs bulan lalu (Rp & %, hijau/merah) — CSS `.networth-trend-*` di `AnalyticsPage.css`
- Keputusan: jendela trend tetap **rolling 12 bulan** (bukan YTD) — YTD reset tiap Januari jadi 1 titik; rolling + trim memberi konteks setahun penuh begitu datanya ada

---

## Known Bugs / In Progress

- ⚠️ **Valas rate-date label** — `kurs <tanggal>` di header Saldo Akun kadang tidak tampil di preview meski konversi jalan; sudah dibuat selalu-render dgn fallback "memuat kurs…" (commit a7b3e0c), perlu konfirmasi di deploy terbaru
- ⚠️ **Mini-Aladdin API key di client bundle** (`DataContext.jsx`) — `VITE_MINI_ALADDIN_API_KEY` ikut ke browser; ditunda selama deploy ber-PIN, wajib pindah ke Edge Function sebelum publik/multi-user

- ⚠️ **Transfer form: tidak ada kategori selector** — saat mode Transfer, user tidak bisa memilih kategori spesifik (Topup, Tabungan, dll); form langsung pakai kategori 'Transfer' default
- ⚠️ **ARCHITECTURE.md perlu update lanjutan** — konvensi debit/credit sudah berubah dari Google Sheets (Income=Debit, Expense=Credit) ke SaaS (Income=credit, Expense=debit); schema SQL sudah benar tapi CLAUDE.md Google Sheet Column Map masih pakai konvensi lama sebagai referensi historis

---

## Keputusan Teknis

- **Budget di Supabase** — Budget tetap menggunakan tabel `budgets` di Supabase (bukan localStorage). Keputusan ini sudah diterapkan sejak P3; localStorage sepenuhnya dihapus.
- **Onboarding wizard 4-step** — Menggantikan auto-seed trigger (migration 004). User memilih sendiri akun dan kategori yang relevan; data default di-seed hanya sebagai pilihan, bukan langsung dimasukkan. Resume onboarding dideteksi via logika cek data (cek `accounts` dan `onboarding_completed`), bukan kolom `step` terpisah.
- **Investment sebagai purpose** — `Investment` tetap masuk sebagai nilai `purpose` di tabel `accounts` (sejajar dengan Living/Playing/Saving). Belum dipisah menjadi `type` tersendiri — dicatat sebagai future consideration karena butuh perubahan skema dan UI.
- **ProtectedRoute pattern** — Menggunakan React Router 7 `<Outlet />` sehingga `BottomNav` dan `AIAdvisorWidget` hanya render saat user terautentikasi, tanpa conditional rendering di `App.jsx`.

---

## Remaining Work

### 🟡 Nice to Have
- **UI Polish mobile** — Onboarding dan Settings masih perlu review visual di mobile: spacing, font size, loading states
- **Dark mode** — belum diimplementasikan; CSS tokens sudah siap untuk extension
- **PWA setup** — manifest + service worker + offline fallback (belum dikerjakan)
- **Calendar view** — tampilan transaksi dalam format kalender per bulan (future)
- ~~**Credit card account support**~~ — ✅ DONE (migration 007; saldo CC, limit, statement/due date)
- **Custom domain** — belum dikonfigurasi di Vercel
- **Admin dashboard** — monitoring users dan usage (future)
