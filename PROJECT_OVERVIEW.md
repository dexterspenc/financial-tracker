# PROJECT_OVERVIEW.md — Financial Tracker

> Gambaran menyeluruh project untuk siapapun yang baru pertama kali melihat codebase ini.
> Untuk log progress harian, lihat `PROGRESS.md`. Untuk catatan sesi, lihat `SESSION_LOG.md`.

---

## 1. Tentang Aplikasi

**Nama:** Financial Tracker *(nama final TBD)*

**Deskripsi:** Aplikasi pencatat keuangan pribadi berbasis web. User bisa mencatat transaksi harian (pemasukan, pengeluaran, transfer antar akun), memantau saldo per akun, menganalisis pola pengeluaran, mengatur budget per kategori, dan berkonsultasi dengan AI advisor untuk insight keuangan.

**Target pengguna:** Individual — pengguna yang ingin memantau keuangan pribadi secara terstruktur dengan konteks lokal Indonesia (mata uang IDR, bank lokal, kebiasaan keuangan sehari-hari).

**Bahasa UI:** Bahasa Indonesia

**Mata uang:** Indonesian Rupiah (Rp), diformat dengan locale `id-ID`

---

## 2. Fitur Utama

Semua fitur berikut sudah live di production:

- **Pencatatan transaksi** — Normal (pemasukan/pengeluaran) dan Transfer antar akun; form dengan kategori, akun, tanggal, dan catatan
- **Manajemen akun per purpose** — Akun dikelompokkan berdasarkan tujuan: Living, Playing, Saving, Investment
- **Kategori transaksi** — Tiga flow type: Expense, Income, Transfer; kategori fully customizable per user
- **Analytics lengkap** — 6 tab: Overview (summary bulanan), Accounts (saldo per akun/purpose), Trends (grafik), Budget (progress per kategori), Reports, AI
- **AI Financial Advisor** — Chat dengan Claude; mendapat konteks data keuangan user secara otomatis; diproxy via Supabase Edge Function (API key tidak pernah di client)
- **Budget per kategori** — Set budget bulanan per kategori pengeluaran; progress bar visual
- **Onboarding wizard** — 4-step setup saat pertama kali masuk: pilih akun → pilih kategori → isi saldo awal → selesai; resume jika terputus
- **Settings** — Kelola akun (CRUD + purpose), kelola kategori (CRUD + flow type), kelola budget, profil (display name, logout)
- **Auth** — Email/password + Google OAuth via Supabase Auth; session persistence; forgot password flow

---

## 3. Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | React 19, Vite 7 |
| Routing | React Router 7 |
| Styling | Custom CSS design tokens (`index.css`), Tailwind CSS 4 |
| Charts | Chart.js 4 + react-chartjs-2 |
| UI Primitives | shadcn/ui (@radix-ui/react-dialog, select), sonner (toast) |
| Icons | lucide-react |
| Dates | date-fns 4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Email/Password + Google OAuth |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) via Supabase Edge Function |
| Deployment | Vercel (auto-deploy on push) |

---

## 4. Arsitektur Singkat

### Branching

| Branch | Tujuan | Status |
|---|---|---|
| `main` | Personal version (Google Sheets backend) | FROZEN — jangan disentuh |
| `saas-rebuild` | SaaS version (Supabase backend) | Active — semua kerja di sini |

### Data Flow

```
Login → DataContext (Promise.all: transactions + accounts + categories + balances)
      → semua halaman baca dari context via useData()
      → mutasi (add/edit/delete) → refetch() → context diperbarui
```

`DataContext` mencegah re-fetch per navigasi; data di-load sekali saat login dan di-invalidate hanya setelah mutasi.

### Auth Flow

```
App load → AuthContext (supabase.auth.getSession + onAuthStateChange)
         → ProtectedRoute: cek session → redirect /login jika tidak ada
         → OnboardingGuard: cek onboarding_completed → redirect /onboarding jika false
         → Halaman utama dirender
```

### AI Flow

```
Client (AIAdvisor / AIAdvisorWidget)
  → supabase.functions.invoke('ai-chat', { body: { messages, context } })
  → Supabase Edge Function (Deno):
      1. Verifikasi JWT user
      2. Inject konteks keuangan ke system message
      3. POST ke api.anthropic.com/v1/messages dengan ANTHROPIC_API_KEY (server-side)
      4. Return response ke client
```

API key Anthropic **tidak pernah sampai ke browser**.

---

## 5. URLs & References

| Resource | URL |
|---|---|
| Production (SaaS) | https://financial-tracker-saas.vercel.app |
| Personal version | https://financial-tracker-self.vercel.app |
| Supabase project | https://nhoicsupaccepvnwtqpv.supabase.co |
| GitHub | https://github.com/dexterspenc/financial-tracker |

---

## 6. Konvensi Penting

### Debit / Credit

> Konvensi SaaS berbeda dari kolom Google Sheets lama — jangan sampai tertukar.

| Kolom | Arti | Contoh |
|---|---|---|
| `debit` | Uang **keluar** — Expense + Transfer-out | Bayar makan, transfer ke tabungan |
| `credit` | Uang **masuk** — Income + Transfer-in | Terima gaji, transfer masuk dari rekening lain |

*Google Sheets lama menggunakan konvensi terbalik (Debit = Income, Credit = Expense).*

### Format

| Field | Format | Contoh |
|---|---|---|
| Amount | Integer IDR, tanpa desimal | `150000` |
| Date | `yyyy-MM-dd` | `2026-04-01` |
| Month | `yyyy-MM-01` | `2026-04-01` |
| Currency display | `id-ID` locale | `Rp 150.000` |

### Account Purpose

| Purpose | Deskripsi |
|---|---|
| Living | Kebutuhan sehari-hari (rekening utama) |
| Playing | Hiburan dan gaya hidup |
| Saving | Tabungan dan dana darurat |
| Investment | Investasi (saham, reksa dana, dll) |

---

## 7. Roadmap

Fitur yang sudah dibahas dan direncanakan untuk versi berikutnya:

| Fitur | Prioritas | Catatan |
|---|---|---|
| Dark mode | Medium | CSS tokens sudah siap untuk extension |
| PWA setup | Medium | Manifest + service worker + offline fallback |
| Credit card account support | Low | Logika saldo berbeda (hutang, bukan aset); perlu perubahan skema |
| Calendar view transaksi | Low | Tampilan transaksi dalam format kalender per bulan |
| Data migration tools | Low | Sudah dilakukan manual (363 txn); tools untuk future use |
| Admin dashboard | Low | Monitoring users dan usage |
