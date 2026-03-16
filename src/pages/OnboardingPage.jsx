import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Check, ChevronRight, ChevronLeft, Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/Toast';
import './OnboardingPage.css';

// ── Preset data ────────────────────────────────────────────────

const PRESET_ACCOUNTS = [
  { name: 'BCA',        purpose: 'Living'     },
  { name: 'Mandiri',    purpose: 'Living'     },
  { name: 'BNI',        purpose: 'Living'     },
  { name: 'BRI',        purpose: 'Living'     },
  { name: 'CIMB Niaga', purpose: 'Living'     },
  { name: 'Gopay',      purpose: 'Living'     },
  { name: 'OVO',        purpose: 'Living'     },
  { name: 'Dana',       purpose: 'Living'     },
  { name: 'ShopeePay',  purpose: 'Living'     },
  { name: 'Tunai',      purpose: 'Living'     },
  { name: 'Blu',        purpose: 'Saving'     },
  { name: 'Jenius',     purpose: 'Saving'     },
];

const PRESET_EXPENSE = [
  'Daily Needs', 'Makan & Minum', 'Transport', 'Utilitas', 'Kesehatan',
  'Hiburan', 'Belanja', 'Travel', 'Pendidikan', 'Self Improvement',
  'Keluarga', 'Sosial', 'Lainnya',
];

const PRESET_INCOME = [
  'Gaji', 'Freelance', 'Hasil Investasi', 'Hadiah', 'Pemasukan Lain',
];

const TRANSFER_CATEGORIES = ['Transfer', 'Topup', 'Tabungan', 'Penarikan Tabungan'];
const PURPOSE_OPTIONS = ['Living', 'Playing', 'Saving', 'Investment'];

const PURPOSE_COLOR = {
  Living:     'purpose-living',
  Playing:    'purpose-playing',
  Saving:     'purpose-saving',
  Investment: 'purpose-investment',
};

const STEP_LABELS = ['Akun', 'Kategori', 'Saldo', 'Selesai'];

// ── Component ──────────────────────────────────────────────────

function OnboardingPage() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(null);
  const [resumeStep, setResumeStep] = useState(1);
  const [resumeAccounts, setResumeAccounts] = useState([]);

  // Step 1 — accounts
  const [selectedAccounts, setSelectedAccounts] = useState(
    PRESET_ACCOUNTS.slice(0, 3).map(a => ({ ...a })) // BCA, Mandiri, BNI
  );
  const [customName, setCustomName] = useState('');
  const [customPurpose, setCustomPurpose] = useState('Living');

  // Step 2 — categories
  const [selectedExpense, setSelectedExpense] = useState(['Daily Needs', 'Transport', 'Belanja', 'Kesehatan']);
  const [selectedIncome, setSelectedIncome]   = useState(['Gaji']);
  const [customExpenseName, setCustomExpenseName] = useState('');
  const [customIncomeName,  setCustomIncomeName]  = useState('');

  // Step 3 — balances
  const [initialBalances, setInitialBalances] = useState({});

  const [saving, setSaving] = useState(false);

  // ── Resume check ────────────────────────────────────────────

  // Use the user from AuthContext — ProtectedRoute already validated the session,
  // so this is guaranteed non-null. Avoids an extra network call (getUser()) that
  // can fail/hang and leave `step` stuck at null forever.
  useEffect(() => {
    if (user?.id) checkResume(user.id);
  }, [user?.id]);

  const checkResume = async (userId) => {
    try {
      const [{ data: accs }, { data: cats }] = await Promise.all([
        supabase.from('accounts').select('id, name, purpose').eq('user_id', userId),
        supabase.from('categories').select('id').eq('user_id', userId),
      ]);
      if (!accs?.length) {
        setResumeStep(1); setStep(1);
      } else if (!cats?.length) {
        setResumeAccounts(accs); setResumeStep(2); setStep(2);
      } else {
        setResumeAccounts(accs); setResumeStep(3); setStep(3);
      }
    } catch {
      // On DB error, start fresh from step 1
      setResumeStep(1); setStep(1);
    }
  };

  // ── Account helpers ─────────────────────────────────────────

  const toggleAccount = (preset) => {
    setSelectedAccounts(prev => {
      const exists = prev.find(a => a.name === preset.name);
      return exists
        ? prev.filter(a => a.name !== preset.name)
        : [...prev, { ...preset }];
    });
  };

  const setAccountPurpose = (name, purpose) => {
    setSelectedAccounts(prev =>
      prev.map(a => a.name === name ? { ...a, purpose } : a)
    );
  };

  const addCustomAccount = () => {
    const name = customName.trim();
    if (!name) return;
    if (selectedAccounts.find(a => a.name === name)) { toast.info('Akun sudah ada'); return; }
    setSelectedAccounts(prev => [...prev, { name, purpose: customPurpose }]);
    setCustomName('');
  };

  const removeCustom = (name) => {
    setSelectedAccounts(prev => prev.filter(a => a.name !== name));
  };

  // ── Category helpers ────────────────────────────────────────

  const toggleExpense = (cat) =>
    setSelectedExpense(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const toggleIncome = (cat) =>
    setSelectedIncome(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const addCustomExpense = () => {
    const name = customExpenseName.trim();
    if (!name) return;
    if (selectedExpense.includes(name) || PRESET_EXPENSE.includes(name)) {
      toast.info('Kategori sudah ada'); return;
    }
    setSelectedExpense(prev => [...prev, name]);
    setCustomExpenseName('');
  };

  const addCustomIncome = () => {
    const name = customIncomeName.trim();
    if (!name) return;
    if (selectedIncome.includes(name) || PRESET_INCOME.includes(name)) {
      toast.info('Kategori sudah ada'); return;
    }
    setSelectedIncome(prev => [...prev, name]);
    setCustomIncomeName('');
  };

  const displayAccounts = resumeStep >= 2 ? resumeAccounts : selectedAccounts;

  // ── Save ────────────────────────────────────────────────────

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Always get user fresh from Supabase auth — never trust stale React state for DB writes
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user?.id) {
        throw new Error('Sesi tidak valid. Silakan login ulang.');
      }
      const userId = user.id;

      let finalAccounts = resumeAccounts;

      // Insert accounts only on fresh start (step 1)
      if (resumeStep === 1) {
        const { data, error } = await supabase
          .from('accounts')
          .insert(
            selectedAccounts.map((acc, idx) => ({
              user_id:    userId,
              name:       acc.name,
              purpose:    acc.purpose,
              sort_order: idx + 1,
            }))
          )
          .select('id, name, purpose');
        if (error) throw error;
        finalAccounts = data || [];
      }

      // Insert categories if step 1 or 2
      if (resumeStep <= 2) {
        const rows = [
          ...selectedExpense.map((name, i) => ({
            user_id: userId, name, flow_type: 'Expense', sort_order: i + 1,
          })),
          ...selectedIncome.map((name, i) => ({
            user_id: userId, name, flow_type: 'Income', sort_order: 50 + i,
          })),
          ...TRANSFER_CATEGORIES.map((name, i) => ({
            user_id: userId, name, flow_type: 'Transfer', sort_order: 100 + i,
          })),
        ];
        const { error } = await supabase.from('categories').insert(rows);
        if (error) throw error;
      }

      // Insert initial balances for any account with amount > 0
      const balanceRows = Object.entries(initialBalances)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([accName, amount]) => {
          const account = finalAccounts.find(a => a.name === accName);
          return account
            ? {
                user_id:    userId,
                account_id: account.id,
                balance:    parseFloat(amount),
                as_of_date: format(new Date(), 'yyyy-MM-dd'),
              }
            : null;
        })
        .filter(Boolean);

      if (balanceRows.length > 0) {
        const { error } = await supabase.from('account_balances').insert(balanceRows);
        if (error) throw error;
      }

      // Mark onboarding complete
      const { error: settingsErr } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: userId, onboarding_completed: true },
          { onConflict: 'user_id' }
        );
      if (settingsErr) throw settingsErr;

      completeOnboarding();
      navigate('/');
    } catch (err) {
      toast.error('Gagal menyimpan: ' + err.message);
      setSaving(false);
    }
  };

  const canNext1 = selectedAccounts.length >= 1;
  const canNext2 = selectedExpense.length >= 1 && selectedIncome.length >= 1;

  // ── Loading ─────────────────────────────────────────────────

  if (step === null) {
    return (
      <div className="ob-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="ob-page">
      <div className="ob-wrap">

        {/* Brand */}
        <div className="ob-brand">
          <span className="ob-brand-icon">💰</span>
          <span className="ob-brand-name">Financial Tracker</span>
        </div>

        {/* Step progress bar */}
        <div className="ob-stepper">
          {STEP_LABELS.map((label, i) => {
            const num    = i + 1;
            const done   = step > num;
            const active = step === num;
            return (
              <div key={num} className="ob-step-item">
                <div className={`ob-step-circle ${done ? 'done' : active ? 'active' : ''}`}>
                  {done ? <Check size={13} strokeWidth={2.5} /> : num}
                </div>
                <span className={`ob-step-label ${active ? 'active' : ''}`}>{label}</span>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`ob-step-line ${done ? 'done' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="ob-card">

          {/* ── Step 1: Pilih Akun ── */}
          {step === 1 && (
            <div className="ob-step">
              <div className="ob-step-header">
                <h2>Akun yang kamu punya</h2>
                <p>Pilih semua akun bank, dompet digital, atau tunai yang kamu gunakan</p>
              </div>

              <div className="ob-account-grid">
                {PRESET_ACCOUNTS.map(preset => {
                  const selAcc  = selectedAccounts.find(a => a.name === preset.name);
                  const selected = !!selAcc;
                  const purpose  = selAcc?.purpose ?? preset.purpose;

                  return (
                    <div key={preset.name} className={`ob-account-card ${selected ? 'selected' : ''}`}>
                      {/* Toggle selection on card click */}
                      <button
                        type="button"
                        className="ob-account-tap"
                        onClick={() => toggleAccount(preset)}
                        aria-pressed={selected}
                      >
                        {selected && (
                          <span className="ob-account-check">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                        <span className="ob-account-avatar">
                          {preset.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="ob-account-name">{preset.name}</span>
                      </button>

                      {/* Purpose selector — shown when selected */}
                      {selected && (
                        <div className="ob-purpose-pills" onClick={e => e.stopPropagation()}>
                          {PURPOSE_OPTIONS.map(p => (
                            <button
                              key={p}
                              type="button"
                              className={`ob-purpose-pill ${PURPOSE_COLOR[p]} ${purpose === p ? 'active' : ''}`}
                              onClick={() => setAccountPurpose(preset.name, p)}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Purpose badge — shown when NOT selected */}
                      {!selected && (
                        <span className={`ob-purpose-badge ${PURPOSE_COLOR[preset.purpose]}`}>
                          {preset.purpose}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Custom accounts */}
                {selectedAccounts
                  .filter(a => !PRESET_ACCOUNTS.find(p => p.name === a.name))
                  .map(a => (
                    <div key={a.name} className="ob-account-card selected custom">
                      <button
                        type="button"
                        className="ob-account-tap"
                        onClick={() => removeCustom(a.name)}
                      >
                        <span className="ob-account-check">
                          <Check size={11} strokeWidth={3} />
                        </span>
                        <span className="ob-account-avatar">
                          {a.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="ob-account-name">{a.name}</span>
                      </button>
                      <div className="ob-purpose-pills" onClick={e => e.stopPropagation()}>
                        {PURPOSE_OPTIONS.map(p => (
                          <button
                            key={p}
                            type="button"
                            className={`ob-purpose-pill ${PURPOSE_COLOR[p]} ${a.purpose === p ? 'active' : ''}`}
                            onClick={() => setAccountPurpose(a.name, p)}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="ob-account-remove"
                        onClick={e => { e.stopPropagation(); removeCustom(a.name); }}
                        aria-label="Hapus"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
              </div>

              {/* Add custom account */}
              <div className="ob-add-row">
                <input
                  type="text"
                  className="ob-add-input"
                  placeholder="Tambah akun lain…"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomAccount()}
                />
                <select
                  className="ob-add-select"
                  value={customPurpose}
                  onChange={e => setCustomPurpose(e.target.value)}
                >
                  {PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button
                  type="button"
                  className="ob-add-btn"
                  onClick={addCustomAccount}
                  disabled={!customName.trim()}
                >
                  <Plus size={16} />
                </button>
              </div>

              <p className="ob-count">{selectedAccounts.length} akun dipilih</p>
            </div>
          )}

          {/* ── Step 2: Pilih Kategori ── */}
          {step === 2 && (
            <div className="ob-step">
              <div className="ob-step-header">
                <h2>Kategori transaksi</h2>
                <p>Pilih minimal 1 pengeluaran dan 1 pemasukan</p>
              </div>

              {/* Expense */}
              <div className="ob-cat-section">
                <div className="ob-cat-heading">
                  <span className="ob-cat-dot expense" />
                  Pengeluaran
                </div>
                <div className="ob-pill-grid">
                  {/* Preset pills */}
                  {PRESET_EXPENSE.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`ob-pill expense ${selectedExpense.includes(cat) ? 'selected' : ''}`}
                      onClick={() => toggleExpense(cat)}
                    >
                      {selectedExpense.includes(cat) && <Check size={11} strokeWidth={3} />}
                      {cat}
                    </button>
                  ))}
                  {/* Custom expense pills */}
                  {selectedExpense
                    .filter(c => !PRESET_EXPENSE.includes(c))
                    .map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className="ob-pill expense selected custom-pill"
                        onClick={() => toggleExpense(cat)}
                      >
                        <Check size={11} strokeWidth={3} />
                        {cat}
                        <X size={9} className="pill-remove" />
                      </button>
                    ))}
                </div>
                {/* Add custom expense */}
                <div className="ob-add-row ob-add-row-sm">
                  <input
                    type="text"
                    className="ob-add-input"
                    placeholder="Tambah kategori pengeluaran…"
                    value={customExpenseName}
                    onChange={e => setCustomExpenseName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomExpense()}
                  />
                  <button
                    type="button"
                    className="ob-add-btn"
                    onClick={addCustomExpense}
                    disabled={!customExpenseName.trim()}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Income */}
              <div className="ob-cat-section">
                <div className="ob-cat-heading">
                  <span className="ob-cat-dot income" />
                  Pemasukan
                </div>
                <div className="ob-pill-grid">
                  {PRESET_INCOME.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`ob-pill income ${selectedIncome.includes(cat) ? 'selected' : ''}`}
                      onClick={() => toggleIncome(cat)}
                    >
                      {selectedIncome.includes(cat) && <Check size={11} strokeWidth={3} />}
                      {cat}
                    </button>
                  ))}
                  {selectedIncome
                    .filter(c => !PRESET_INCOME.includes(c))
                    .map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className="ob-pill income selected custom-pill"
                        onClick={() => toggleIncome(cat)}
                      >
                        <Check size={11} strokeWidth={3} />
                        {cat}
                        <X size={9} className="pill-remove" />
                      </button>
                    ))}
                </div>
                {/* Add custom income */}
                <div className="ob-add-row ob-add-row-sm">
                  <input
                    type="text"
                    className="ob-add-input"
                    placeholder="Tambah kategori pemasukan…"
                    value={customIncomeName}
                    onChange={e => setCustomIncomeName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomIncome()}
                  />
                  <button
                    type="button"
                    className="ob-add-btn"
                    onClick={addCustomIncome}
                    disabled={!customIncomeName.trim()}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="ob-transfer-note">
                🔄 Kategori Transfer (Transfer, Topup, Tabungan) ditambahkan otomatis
              </div>
            </div>
          )}

          {/* ── Step 3: Saldo Awal ── */}
          {step === 3 && (
            <div className="ob-step">
              <div className="ob-step-header">
                <h2>Saldo awal</h2>
                <p>Masukkan saldo saat ini untuk setiap akun. Opsional — bisa dilewati.</p>
              </div>

              <div className="ob-balance-list">
                {displayAccounts.map(acc => (
                  <div key={acc.name} className="ob-balance-row">
                    <div className="ob-balance-info">
                      <span className="ob-balance-name">{acc.name}</span>
                      <span className={`ob-purpose-badge ${PURPOSE_COLOR[acc.purpose] || ''}`}>
                        {acc.purpose}
                      </span>
                    </div>
                    <div className="ob-balance-input-wrap">
                      <span className="ob-balance-rp">Rp</span>
                      <input
                        type="number"
                        className="ob-balance-input"
                        placeholder="0"
                        min="0"
                        value={initialBalances[acc.name] || ''}
                        onChange={e =>
                          setInitialBalances(prev => ({ ...prev, [acc.name]: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Selesai ── */}
          {step === 4 && (
            <div className="ob-step ob-done">
              <div className="ob-done-icon">🎉</div>
              <h2 className="ob-done-title">Semua siap!</h2>
              <p className="ob-done-desc">
                Akun dan kategori kamu sudah dikonfigurasi. Mulai catat transaksi sekarang!
              </p>

              <div className="ob-done-summary">
                <div className="ob-done-row">
                  <span>Akun</span>
                  <strong>{displayAccounts.length} akun</strong>
                </div>
                <div className="ob-done-row">
                  <span>Pengeluaran</span>
                  <strong>{resumeStep <= 2 ? selectedExpense.length : '—'} kategori</strong>
                </div>
                <div className="ob-done-row">
                  <span>Pemasukan</span>
                  <strong>{resumeStep <= 2 ? selectedIncome.length : '—'} kategori</strong>
                </div>
                <div className="ob-done-row">
                  <span>Saldo diisi</span>
                  <strong>
                    {Object.values(initialBalances).filter(v => parseFloat(v) > 0).length} akun
                  </strong>
                </div>
              </div>

              <p className="ob-done-note">
                Kamu bisa mengubah akun dan kategori kapan saja di menu <strong>Pengaturan</strong>.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className={`ob-nav ${step === 1 || step === 4 ? 'ob-nav-single' : ''}`}>
            {step > 1 && step <= 3 && (
              <button
                type="button"
                className="btn btn-secondary ob-btn-back"
                onClick={() => setStep(s => s - 1)}
              >
                <ChevronLeft size={16} /> Kembali
              </button>
            )}

            {step < 4 && (
              <button
                type="button"
                className="btn btn-primary ob-btn-next"
                onClick={() => setStep(s => s + 1)}
                disabled={
                  (step === 1 && !canNext1) ||
                  (step === 2 && !canNext2)
                }
              >
                Lanjut <ChevronRight size={16} />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                className="btn btn-primary ob-btn-finish"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? <span className="spinner" /> : '🚀 Mulai Tracking!'}
              </button>
            )}
          </div>

          {step === 3 && (
            <button type="button" className="ob-skip" onClick={() => setStep(4)}>
              Lewati, isi nanti
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;
