# CLAUDE.md — Project Instructions for Claude Code

> Auto-read every session. Follow these rules exactly.

## Project Identity

**Name:** [App Name TBD] — AI-powered personal finance tracker
**Language:** UI copy and AI system prompts in **Bahasa Indonesia**
**Currency:** Indonesian Rupiah (Rp), formatted with `id-ID` locale

---

## Branch Rules (CRITICAL)

- `main` — personal version, **FROZEN**. Never modify, never commit to, never merge into.
- `saas-rebuild` — all SaaS work happens here. Always confirm branch before making changes.

```bash
# Always verify before working
git branch --show-current
```

---

## Current Stack (main / personal version)

| Layer | Technology |
|---|---|
| Framework | React 19, Vite 7 |
| Routing | React Router 7 |
| Styling | Custom CSS design tokens (`index.css`), Tailwind CSS 4 (installed, minimal use) |
| Charts | Chart.js 4 + react-chartjs-2, @tremor/react (partially used) |
| UI Primitives | shadcn/ui (@radix-ui/react-dialog, select, toast), sonner |
| Icons | lucide-react |
| Dates | date-fns 4 |
| "Database" | Google Sheets via Google Apps Script HTTP endpoint |
| AI | Anthropic Claude API — **currently called directly from browser (insecure, must fix)** |
| Auth | None |

---

## Target Stack (saas-rebuild branch)

Same frontend, plus:

| Layer | Technology |
|---|---|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Email/Password + Google OAuth |
| API | Supabase REST API (replaces Google Apps Script) |
| AI proxy | Supabase Edge Function `/functions/v1/ai-chat` |
| User settings | Supabase DB tables (replaces hardcoded config.js + localStorage) |

---

## API Key Rules (CRITICAL)

- `VITE_ANTHROPIC_API_KEY` **must never appear in the client bundle** in the SaaS version.
- All Anthropic API calls must go through the Supabase Edge Function.
- Supabase anon key is safe to expose. Service role key is never exposed client-side.

---

## Coding Conventions

- **Functional React components only** — no class components
- **Per-component CSS files** — `ComponentName.css` co-located with `ComponentName.jsx`
- No inline styles unless strictly necessary
- Tailwind utility classes are acceptable for layout; component-specific styles go in CSS files
- All `fetch` calls in the SaaS version use the Supabase JS client (`@supabase/supabase-js`), not raw fetch
- No `any` types if TypeScript is introduced — prefer explicit types
- No `console.log` left in production code

---

## Google Sheet Column Map (personal version reference)

| Col | Index | Field | Notes |
|---|---|---|---|
| A | 0 | ID | `yyyyMM-NNN`, client-generated |
| B | 1 | Date | `yyyy-MM-dd` |
| C | 2 | Month | `yyyy-MM-01` |
| D | 3 | Account | e.g. BCA, Cash |
| E | 4 | Account_Purpose | Formula (Living/Playing/Saving/Investment) |
| F | 5 | Category | e.g. Daily Needs, Salary |
| G | 6 | Flow_Type | Formula (Income/Expense/Transfer) |
| H | 7 | Debit | Income and Transfer-in |
| I | 8 | Credit | Expense and Transfer-out |
| J | 9 | Type | `Normal` or `Transfer` |
| K | 10 | TransferPairId | `TRF-NNN` |
| L | 11 | Note | Free text |

---

## Known Issues to Fix in SaaS Rebuild

1. **Security**: API key exposed in browser bundle
2. **Race condition**: Client-side ID generation causes duplicate IDs on concurrent writes
3. **Fragile deletes/updates**: Targeting rows by positional index (`rowIndex = idx + 2`) breaks if rows shift
4. **No transactions**: Transfer creates 2 sequential POSTs — partial failure leaves corrupt state
5. **No caching**: Full sheet re-fetched on every navigation
6. **Per-device budgets**: localStorage means budgets don't sync across devices
