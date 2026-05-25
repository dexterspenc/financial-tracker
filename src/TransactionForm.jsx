import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import './TransactionForm.css';
import { ArrowDown } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useTransactions } from './hooks/useTransactions';
import { useData } from './contexts/DataContext';
import { supabase } from './lib/supabase';
import { toast } from './components/ui/Toast';
import QuickActionPopup from './components/QuickActionPopup';

const EMPTY_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  accountId: '',
  categoryId: '',
  amount: '',
  amountTo: '', // destination amount for cross-currency transfers
  flowType: 'Expense', // 'Income' | 'Expense'
  note: '',
  fromAccountId: '',
  toAccountId: '',
};

// Strip input to a numeric string: integer-only for IDR, one decimal point allowed for valas
const cleanAmount = (raw, currency) =>
  (currency && currency !== 'IDR')
    ? raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
    : raw.replace(/\D/g, '');

// Display value for an amount input: grouped thousands for IDR, raw for valas (preserves decimals)
const displayAmount = (val, currency) => {
  if (!val) return '';
  return (currency && currency !== 'IDR') ? val : Number(val).toLocaleString('id-ID');
};

function TransactionForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addTransaction, addTransactionPair } = useTransactions();
  const { accounts, categories, quickActions, loading: dataLoading, refetch } = useData();

  const [mode, setMode] = useState('normal');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-set flowType when a category is selected
      if (name === 'categoryId') {
        const cat = categories.find(c => c.id === value);
        if (cat && cat.flow_type !== 'Transfer') {
          updated.flowType = cat.flow_type;
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'normal') {
        await submitNormal();
      } else {
        await submitTransfer();
      }
    } catch (err) {
      console.error('Transaction error:', err);
      toast.error('Gagal menambah transaksi');
    } finally {
      setLoading(false);
    }
  };

  const submitNormal = async () => {
    const month = format(new Date(formData.date + 'T00:00:00'), 'yyyy-MM-01');
    const amount = parseFloat(formData.amount) || 0;
    const selectedCategory = categories.find(c => c.id === formData.categoryId);
    const flowType = selectedCategory?.flow_type ?? formData.flowType;

    const payload = {
      user_id: user.id,
      date: formData.date,
      month,
      account_id: formData.accountId,
      category_id: formData.categoryId,
      flow_type: flowType,
      debit: flowType === 'Expense' ? amount : 0,
      credit: flowType === 'Income' ? amount : 0,
      type: 'Normal',
      note: formData.note || null,
    };

    const { error } = await addTransaction(payload);
    if (error) throw error;

    toast.success('Transaksi berhasil ditambahkan!');
    setFormData({ ...EMPTY_FORM, date: formData.date });
    try { await refetch(); } catch { /* refetch is best-effort */ }
  };

  const submitTransfer = async () => {
    const month = format(new Date(formData.date + 'T00:00:00'), 'yyyy-MM-01');
    const fromAcc = accounts.find(a => a.id === formData.fromAccountId);
    const toAcc = accounts.find(a => a.id === formData.toAccountId);
    const fromCur = fromAcc?.currency || 'IDR';
    const toCur = toAcc?.currency || 'IDR';
    const crossCurrency = fromCur !== toCur;

    // Amount leaving the source account, in the source account's currency
    const amountOut = parseFloat(formData.amount) || 0;
    // Amount arriving at the destination, in the destination's currency.
    // Same-currency transfers reuse the single amount; cross-currency uses the second field.
    const amountIn = crossCurrency ? (parseFloat(formData.amountTo) || 0) : amountOut;

    // Row 1: Transfer-out (money leaves source account) → debit (source currency)
    const debitRow = {
      user_id: user.id,
      date: formData.date,
      month,
      account_id: formData.fromAccountId,
      category_id: formData.categoryId,
      flow_type: 'Transfer',
      debit: amountOut,
      credit: 0,
      type: 'Transfer',
      note: formData.note || null,
    };

    // Row 2: Transfer-in (money arrives at destination account) → credit (dest currency)
    const creditRow = {
      user_id: user.id,
      date: formData.date,
      month,
      account_id: formData.toAccountId,
      category_id: formData.categoryId,
      flow_type: 'Transfer',
      debit: 0,
      credit: amountIn,
      type: 'Transfer',
      note: formData.note || null,
    };

    // Single atomic insert — both rows or neither
    const { data, error } = await addTransactionPair([debitRow, creditRow]);
    if (error) throw error;

    // Link the pair using the IDs assigned by DB (update transfer_pair_id)
    if (data && data.length === 2) {
      const pairId = `TRF-${data[0].id.slice(0, 6).toUpperCase()}`;
      await Promise.all(
        data.map(t =>
          supabase.from('transactions').update({ transfer_pair_id: pairId }).eq('id', t.id)
        )
      );
    }

    toast.success('Transfer berhasil dibuat!');
    setFormData({ ...EMPTY_FORM, date: formData.date });
    try { await refetch(); } catch { /* refetch is best-effort */ }
  };

  // Normal transactions exclude valas accounts (storage-only, funded via transfer)
  const accountsByPurpose = accounts
    .filter(acc => !acc.currency || acc.currency === 'IDR')
    .reduce((groups, acc) => {
      if (!groups[acc.purpose]) groups[acc.purpose] = [];
      groups[acc.purpose].push(acc);
      return groups;
    }, {});

  // Cross-currency transfer detection
  const fromAcc = accounts.find(a => a.id === formData.fromAccountId);
  const toAcc = accounts.find(a => a.id === formData.toAccountId);
  const fromCur = fromAcc?.currency || 'IDR';
  const toCur = toAcc?.currency || 'IDR';
  const crossCurrency = mode === 'transfer' && fromAcc && toAcc && fromCur !== toCur;

  // Filter categories by flow type
  const incomeCategories    = categories.filter(c => c.flow_type === 'Income');
  const expenseCategories   = categories.filter(c => c.flow_type === 'Expense');
  const transferCategories  = categories.filter(c => c.flow_type === 'Transfer');

  if (dataLoading) {
    return (
      <div className="transaction-form">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Memuat data akun dan kategori…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-form">
      <div className="form-header">
        <h1>💰 Add Transaction</h1>
        <p className="subtitle">Quick & Easy Financial Tracking</p>
      </div>

      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-btn ${mode === 'normal' ? 'active' : ''}`}
          onClick={() => { setMode('normal'); setFormData(prev => ({ ...prev, categoryId: '' })); }}
        >
          💵 Normal
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'transfer' ? 'active' : ''}`}
          onClick={() => { setMode('transfer'); setFormData(prev => ({ ...prev, categoryId: '' })); }}
        >
          🔄 Transfer
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>📅 Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        {mode === 'normal' ? (
          <>
            <div className="form-group">
              <label>🏦 Account</label>
              <select name="accountId" value={formData.accountId} onChange={handleChange} required>
                <option value="">Select Account</option>
                {Object.entries(accountsByPurpose).map(([purpose, accs]) => (
                  <optgroup key={purpose} label={purpose}>
                    {accs.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>🔄 Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="flowType"
                    value="Income"
                    checked={formData.flowType === 'Income'}
                    onChange={handleChange}
                  />
                  <span>Income</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="flowType"
                    value="Expense"
                    checked={formData.flowType === 'Expense'}
                    onChange={handleChange}
                  />
                  <span>Expense</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>📂 Category</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
                <option value="">Select Category</option>
                {formData.flowType === 'Income' ? (
                  <optgroup label="Income">
                    {incomeCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </optgroup>
                ) : (
                  <optgroup label="Expense">
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="form-group">
              <label>💵 Amount (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                name="amount"
                value={formData.amount ? Number(formData.amount).toLocaleString('id-ID') : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value.replace(/\D/g, '') }))}
                placeholder="0"
                required
              />
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>📤 From Account</label>
              <select name="fromAccountId" value={formData.fromAccountId} onChange={handleChange} required>
                <option value="">Select Source Account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}{acc.currency && acc.currency !== 'IDR' ? ` (${acc.currency})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="transfer-arrow"><ArrowDown size={20} /></div>

            <div className="form-group">
              <label>📥 To Account</label>
              <select name="toAccountId" value={formData.toAccountId} onChange={handleChange} required>
                <option value="">Select Destination Account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}{acc.currency && acc.currency !== 'IDR' ? ` (${acc.currency})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {crossCurrency ? (
              <>
                <div className="form-group">
                  <label>💸 Jumlah Keluar ({fromCur})</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="amount"
                    value={displayAmount(formData.amount, fromCur)}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: cleanAmount(e.target.value, fromCur) }))}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>💰 Jumlah Masuk ({toCur})</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="amountTo"
                    value={displayAmount(formData.amountTo, toCur)}
                    onChange={(e) => setFormData(prev => ({ ...prev, amountTo: cleanAmount(e.target.value, toCur) }))}
                    placeholder="0"
                    required
                  />
                </div>
                <p className="subtitle">Isi sesuai mutasi myBCA — nominal keluar & masuk apa adanya.</p>
              </>
            ) : (
              <div className="form-group">
                <label>💵 Amount ({fromCur})</label>
                <input
                  type="text"
                  inputMode={fromCur === 'IDR' ? 'numeric' : 'decimal'}
                  name="amount"
                  value={displayAmount(formData.amount, fromCur)}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: cleanAmount(e.target.value, fromCur) }))}
                  placeholder="0"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>📂 Kategori</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
                <option value="">Pilih Kategori Transfer</option>
                {transferCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label>📝 Note</label>
          <input
            type="text"
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="Add a note..."
          />
        </div>

        {mode === 'normal' && (
          <div className="quick-buttons">
            <p className="quick-label">Quick Actions</p>
            <div className="quick-actions-grid">
              {(quickActions ?? [null, null, null, null]).map((action, idx) => {
                const cat = action ? categories.find(c => c.id === action.category_id) : null;
                return cat ? (
                  <button
                    key={idx}
                    type="button"
                    className="quick-slot quick-slot-filled"
                    onClick={() => setActiveQuickAction(action)}
                  >
                    <span className="qa-slot-icon">⚡</span>{cat.name}
                  </button>
                ) : (
                  <button
                    key={idx}
                    type="button"
                    className="quick-slot quick-slot-empty"
                    onClick={() => navigate('/settings?tab=quick-actions')}
                  >
                    + Tambah
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={loading}
        >
          {loading ? '⏳ Menyimpan...' : mode === 'transfer' ? '🔄 Create Transfer' : '✨ Add Transaction'}
        </button>
      </form>

      {activeQuickAction && (
        <QuickActionPopup
          action={activeQuickAction}
          onClose={() => setActiveQuickAction(null)}
        />
      )}
    </div>
  );
}

export default TransactionForm;
