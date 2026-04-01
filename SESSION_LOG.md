# SESSION_LOG.md — Catatan Sesi Pengembangan

---

## Session 9 — Migration, Debit/Credit Fix, History Grouping & Transaksi Hari Ini (2026-04-01)

Sesi ini berfokus pada migrasi data historis dari Google Sheets ke Supabase, perbaikan konvensi debit/credit di seluruh codebase, dan beberapa fitur UI baru.

**Migrasi 363 transaksi dari Google Sheets.** Data historis diekspor dari Google Sheets dalam format CSV, lalu diimport ke tabel `transactions` di Supabase via script di folder `scripts/`. Proses migrasi menemukan inkonsistensi pada baris Transfer — kolom `type` tidak terisi dengan benar — yang diperbaiki sebagai bagian dari migration script.

**Fix debit/credit convention.** Ditemukan bahwa konvensi debit/credit antara Google Sheets dan Supabase berbeda arah: di Google Sheets, kolom Debit = Income (uang masuk) dan kolom Credit = Expense (uang keluar). Di SaaS rebuild, konvensi dibalik ke standar akuntansi yang lebih intuitif: `debit` = Expense + Transfer-out, `credit` = Income + Transfer-in. Seluruh file yang membaca atau menulis transaksi (hooks, pages, utilities) diaudit dan disesuaikan ke konvensi baru. ARCHITECTURE.md diperbarui untuk mencerminkan konvensi ini.

**DataContext & bug fixes.** Beberapa bug post-deploy diperbaiki: cashflow minus kini tampil dengan tanda negatif di HomePage, session expiry terdeteksi dan redirect ke login, radio button spacing diperbaiki, dan `refetch()` dipastikan terpanggil di SettingsPage setelah mutasi akun/kategori.

**History filter kategori grouped.** Filter kategori di HistoryPage sebelumnya tampil sebagai flat list. Sekarang dikelompokkan menjadi tiga grup: Pengeluaran, Pemasukan, dan Transfer — mempermudah pemilihan filter di kategori yang banyak.

**Transaksi Hari Ini section di Home.** HomePage mendapat section baru yang menampilkan daftar transaksi hari ini beserta summary pemasukan dan pengeluaran, diletakkan di atas daftar transaksi terkini. Section ini hanya muncul jika ada transaksi hari ini.

**Onboarding: Logout button + hint tooltip.** Tombol "Ganti Akun" ditambahkan di OnboardingPage untuk memudahkan user berganti akun tanpa harus masuk dulu ke Settings. Di Step 1 (pilih akun), hint tips ditambahkan untuk menjelaskan konsep pemisahan akun berdasarkan tujuan (Living/Playing/Saving) — membantu user baru memahami filosofi di balik purpose classification.

---

## Session 8 — Bug Fixes, DataContext & Account Balance (2026-03-27)

Sesi ini dimulai dengan serangkaian bug fix post-deploy, dilanjutkan dengan dua perubahan arsitektur besar.

**AI Advisor fixes.** Sebelum sesi dimulai, beberapa commit kecil sudah masuk: redesign FAB button AI menjadi pill dengan ikon Sparkles, perbaikan Bot icon yang hilang, fix markdown spacing via komponen override, dan sinkronisasi sesi AI chat via `AIChatContext`. Satu infinite loop dari storage sync sempat di-revert lalu diperbaiki dengan pendekatan yang benar.

**Onboarding user pertama.** User pertama berhasil menyelesaikan onboarding wizard end-to-end — memilih akun, kategori, mengisi saldo awal, dan masuk ke dashboard. Proses ini mengungkap inkonsistensi data: konstanta `TRANSFER_CATEGORIES` di `OnboardingPage.jsx` berisi 4 nama Indonesia (`Tabungan`, `Penarikan Tabungan`, dll), sementara SQL seed migration 003 mendefinisikan 6 nama Inggris (`Saving`, `Saving Withdrawal`, `Investment Buy`, `Investment Sell`). Fix dilakukan di dua tempat: `OnboardingPage.jsx` diupdate ke 6 nama kanonik, dan migration baru `005_fix_transfer_categories.sql` dibuat untuk memperbaiki data user yang sudah ada — merename 2 nama dan INSERT 2 kategori yang hilang per user. Migration 005 dijalankan di Supabase Dashboard.

**Account balance di Analytics.** Ditemukan bahwa tab Accounts dan Overview di `AnalyticsPage.jsx` menghitung saldo hanya dari akumulasi transaksi (debit − credit), tanpa memperhitungkan saldo awal yang diinput saat onboarding dan disimpan di tabel `account_balances`. Fix: `loadAnalytics` diubah untuk fetch `account_balances` secara parallel, membangun dua map (`byName` dan `byPurpose`), lalu seed kedua fungsi kalkulasi (`calculateAnalytics` dan `computeAccountsData`) dengan opening balance sebelum menambah/kurangi dari transaksi.

**DataContext — eliminasi per-page re-fetch.** Masalah utama yang dilaporkan: setiap navigasi antar tab (Home → History → Analytics) men-trigger re-fetch dari Supabase karena masing-masing halaman di-mount ulang (React Router exclusive routing). Solusi: `DataContext` baru yang fetch semua data — transactions, accounts, categories, accountBalances — sekali saat login via satu `Promise.all`, expose hasilnya ke semua halaman, dan sediakan `refetch()` untuk invalidasi setelah mutasi. Semua halaman (`HomePage`, `HistoryPage`, `AnalyticsPage`) dan komponen (`TransactionForm`, `EditModal`) dimigrasikan untuk pakai `useData()` alih-alih fetch sendiri. `EditModal` kini tidak perlu loading state untuk akun/kategori karena data sudah tersedia di context.

**TDZ production build error — debugging marathon.** Error `"Cannot access 'M' before initialization"` muncul di production bundle setelah DataContext diimplementasikan. Debugging dilakukan dalam 4 iterasi: (1) DataContext awalnya import hook factories (`useTransactions()`, dll) yang bukan real hooks — dihapus, diganti dengan supabase calls langsung; (2) `normalizeTxn` yang masih diimport dari `useTransactions` diekstrak ke `src/utils/normalizeTxn.js` untuk memutus semua dependency ke hooks layer; (3) ditemukan `import('./lib/supabase')` dynamic import di `TransactionForm.jsx` yang bercampur dengan static import modul yang sama di seluruh codebase — diubah ke static import; (4) penyebab sesungguhnya ditemukan via sourcemap: `openingBalances` (`useMemo`) dideklarasikan di baris 90 tapi dipakai di dependency array `useEffect` di baris 76 dan 82 — `const` tidak di-hoist sehingga menjadi TDZ. Fix: pindahkan deklarasi `openingBalances` ke atas useEffects yang menggunakannya.

---

## Session 7 — Deploy & Documentation (2026-03-16)

Sesi ini berfokus pada finalisasi dan deployment branch `saas-rebuild` ke production. Setelah enam sesi sebelumnya membangun fondasi infrastruktur, auth, data layer, onboarding, settings, dan AI proxy, sesi ini menutup loop dengan mendorong semua perubahan ke GitHub dan mendeploy ke Vercel.

Langkah pertama adalah melakukan commit besar yang mengumpulkan seluruh hasil kerja SaaS rebuild — 46 file dengan 5.247 insertions — ke dalam satu commit terstruktur di branch `saas-rebuild`. File-file yang di-commit mencakup seluruh halaman baru (Login, Register, ForgotPassword, Onboarding, Settings), semua hooks Supabase (`useTransactions`, `useAccounts`, `useCategories`, `useBudgets`), `AuthContext`, `ProtectedRoute`, Supabase Edge Function `ai-chat`, empat SQL migrations, serta file dokumentasi (`CLAUDE.md`, `ARCHITECTURE.md`, `PROGRESS.md`). File `.env` dan folder `.claude/` sengaja dikecualikan karena mengandung secrets dan memory personal yang tidak boleh masuk ke repository publik.

Setelah push berhasil ke `github.com/dexterspenc/financial-tracker`, proses deployment ke Vercel ditemukan memerlukan autentikasi interaktif via browser — sesuatu yang tidak bisa dilakukan oleh Claude Code CLI secara langsung. User kemudian menjelaskan opsi deployment: bisa via Vercel CLI di terminal lokal, atau dengan menyuplai Vercel token. Sesi ini juga mendiskusikan strategi membedakan dua versi yang live: personal version (`main`) di project `financial-tracker` dan SaaS version (`saas-rebuild`) di project `financial-tracker-saas` sebagai dua Vercel project terpisah dengan production branch masing-masing, sehingga setiap push ke branch yang relevan otomatis mentrigger re-deploy tanpa overlap.

Keputusan teknis penting yang dikonfirmasi di sesi ini: budget tetap menggunakan tabel `budgets` di Supabase (bukan localStorage), onboarding wizard 4-step menggantikan auto-seed trigger yang sebelumnya berjalan otomatis saat signup, dan field `Investment` tetap masuk sebagai nilai `purpose` di tabel `accounts` alih-alih dipisah menjadi tipe tersendiri — keputusan ini dicatat sebagai future consideration karena membutuhkan perubahan skema dan logika UI yang lebih besar dari scope sesi ini. Resume onboarding juga diputuskan untuk dideteksi lewat logika cek data (apakah user sudah punya akun dan `onboarding_completed = true`) daripada menyimpan kolom `step` terpisah di database, karena lebih sederhana dan tidak memerlukan migration tambahan.

Dua bug yang ditemukan dan dicatat namun belum diperbaiki di sesi ini: net cashflow negatif tidak menampilkan tanda minus di `HomePage` (kemungkinan masalah di logika format angka), dan beberapa halaman seperti Onboarding dan Settings masih memerlukan polish visual terutama di tampilan mobile.

State project saat ini: SaaS rebuild sudah live di `financial-tracker-saas.vercel.app` dengan Supabase project `nhoicsupaccepvnwtqpv` sebagai backend. Semua fitur inti sudah berjalan — auth email/password dan Google OAuth, onboarding wizard, manajemen akun dan kategori per user, pencatatan transaksi via Supabase, analytics, budget, dan AI Advisor yang memanggil Anthropic via Edge Function tanpa API key di client. Yang tersisa adalah bug fixes minor, UI polish, dan nice-to-have seperti PWA setup dan tools migrasi data dari Google Sheets.

---

## Session 6 — Auth Polish + Code Hygiene (2026-03-15)

Sesi ini menyelesaikan sisa celah di auth flow yang ditemukan saat user journey audit (Session 4): halaman ForgotPassword dibuat dengan alur `resetPasswordForEmail()` dan tampilan konfirmasi "Cek Email Kamu", link "Lupa kata sandi?" ditambahkan di LoginPage, redirect untuk user yang sudah login diperbaiki, dan empty state di HomePage diperkuat dengan CTA button "Tambah Transaksi Pertama". Beberapa `console.error` yang tersisa di AnalyticsPage dan HomePage juga dihapus sesuai coding conventions di CLAUDE.md.

---

## Session 5 — Onboarding + Settings (2026-03-14)

Dua fitur besar diselesaikan di sesi ini. Settings page dibangun dengan empat sub-section: Profil (display name + logout), Kelola Akun (CRUD dengan purpose selector), Kelola Kategori (CRUD dengan flow type selector), dan Budget (per-category upsert via `useBudgets`). Onboarding wizard 4-step dibangun untuk menggantikan auto-seed trigger — user memilih akun dan kategori yang relevan dari daftar default, mengisi saldo awal, lalu menyelesaikan setup. Migration 004 menghapus trigger lama dan menambahkan kolom `onboarding_completed` di `user_settings`. ProtectedRoute diperluas dengan dua-layer guard: auth check dan onboarding check.

---

## Session 4 — User Journey Audit (2026-03-13)

Sesi audit menyeluruh terhadap seluruh user journey dari login hingga penggunaan fitur. Ditemukan beberapa celah yang dikategorikan per severity: Auth (3 gaps kecil), Onboarding (1 gap), Core App (2 gaps), Settings (belum ada sama sekali — gap terbesar), AI Advisor (kritis — API key exposed di browser), dan Data Layer (2 action items). Hasil audit ini menjadi roadmap eksplisit untuk Session 5 dan 6.

---

## Session 3 — Data Layer Migration (2026-03-12)

Seluruh data layer dimigrasikan dari Google Apps Script ke Supabase. Hooks `useTransactions`, `useAccounts`, `useCategories`, dan `useBudgets` dibuat. Semua halaman (HomePage, HistoryPage, AnalyticsPage) dan komponen (TransactionForm, EditModal) ditulis ulang menggunakan hooks baru. Transfer transaksi diubah menjadi atomic insert menggunakan `addTransactionPair`. Edge Function `ai-chat` dibuat sebagai proxy Anthropic API — `VITE_ANTHROPIC_API_KEY` dihapus dari `.env`. `config.js` dikosongkan dari data hardcoded.

---

## Session 2 — Auth Infrastructure (2026-03-11)

`AuthContext` dibuat dengan `signIn`, `signUp`, `signInWithGoogle`, `signOut`, dan session persistence via `onAuthStateChange`. `ProtectedRoute` diimplementasikan. LoginPage, RegisterPage dibuat dengan desain yang konsisten. `App.jsx` diperbarui dengan `AuthProvider` wrapping semua routes. Supabase client (`src/lib/supabase.js`) diinisialisasi dan diekspor.

---

## Session 1 — Foundation (2026-03-10)

Branch `saas-rebuild` dibuat. Supabase project `nhoicsupaccepvnwtqpv` di-setup. Environment variables dikonfigurasi. `@supabase/supabase-js` diinstall. Empat migration SQL ditulis: schema (001), RLS policies (002), seed default data (003), onboarding migration (004). Dokumen `ARCHITECTURE.md`, `CLAUDE.md`, `PROGRESS.md` dibuat untuk memandu sesi-sesi berikutnya.
