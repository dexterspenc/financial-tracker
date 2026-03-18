import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import './TransactionForm.css';
import { ArrowDown } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useTransactions } from './hooks/useTransactions';
import { useAccounts } from './hooks/useAccounts';
import { useCategories } from './hooks/useCategories';
import { toast } from './components/ui/Toast';

const EMPTY_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  accountId: '',
  categoryId: '',
  amount: '',
  flowType: 'Expense', // 'Income' | 'Expense'
  note: '',
  fromAccountId: '',
  toAccountId: '',
};

function TransactionForm() {
  const { user } = useAuth();
  const { addTransaction, addTransactionPair } = useTransactions();
  const { fetchAccounts } = useAccounts();
  const { fetchCategories } = useCategories();

  const [mode, setMode] = useState('normal');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) loadFormData();
  }, [user]);

  const loadFormData = async () => {
    setDataLoading(true);
    const [{ data: accs }, { data: cats }] = await Promise.all([
      fetchAccounts(user.id),
      fetchCategories(user.id),
    ]);
    setAccounts(accs);
    setCategories(cats);
    setDataLoading(false);
  };

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
      debit: flowType === 'Income' ? amount : 0,
      credit: flowType !== 'Income' ? amount : 0,
      type: 'Normal',
      note: formData.note || null,
    };

    const { error } = await addTransaction(payload);
    if (error) throw error;

    toast.success('Transaksi berhasil ditambahkan!');
    setFormData({ ...EMPTY_FORM, date: formData.date });
  };

  const submitTransfer = async () => {
    const month = format(new Date(formData.date + 'T00:00:00'), 'yyyy-MM-01');
    const amount = parseFloat(formData.amount) || 0;
    // Find the Transfer category (or the first transfer-type category)
    const transferCategory = categories.find(c => c.flow_type === 'Transfer' && c.name === 'Transfer')
      ?? categories.find(c => c.flow_type === 'Transfer');

    if (!transferCategory) {
      toast.error('Kategori Transfer tidak ditemukan. Pastikan data sudah ter-seed.');
      return;
    }

    // Row 1: Credit (money leaves source account)
    const debitRow = {
      user_id: user.id,
      date: formData.date,
      month,
      account_id: formData.fromAccountId,
      category_id: transferCategory.id,
      flow_type: 'Transfer',
      debit: 0,
      credit: amount,
      type: 'Transfer',
      note: formData.note || null,
    };

    // Row 2: Debit (money arrives at destination account)
    const creditRow = {
      user_id: user.id,
      date: formData.date,
      month,
      account_id: formData.toAccountId,
      category_id: transferCategory.id,
      flow_type: 'Transfer',
      debit: amount,
      credit: 0,
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
          import('./lib/supabase').then(({ supabase }) =>
            supabase.from('transactions').update({ transfer_pair_id: pairId }).eq('id', t.id)
          )
        )
      );
    }

    toast.success('Transfer berhasil dibuat!');
    setFormData({ ...EMPTY_FORM, date: formData.date });
  };

  // Group accounts by purpose for <optgroup> rendering
  const accountsByPurpose = accounts.reduce((groups, acc) => {
    if (!groups[acc.purpose]) groups[acc.purpose] = [];
    groups[acc.purpose].push(acc);
    return groups;
  }, {});

  // Filter categories for normal mode: Income or Expense (not Transfer)
  const incomeCategories = categories.filter(c => c.flow_type === 'Income');
  const expenseCategories = categories.filter(c => c.flow_type === 'Expense');

  const quickButtons = [
    { label: '🍽️ Lunch',    categoryName: 'Daily Needs', accountName: 'BCA',  flowType: 'Expense' },
    { label: '❤️ Dating',   categoryName: 'Dating',      accountName: 'BCA',  flowType: 'Expense' },
    { label: '🚗 Transport', categoryName: 'Transport',   accountName: 'Cash', flowType: 'Expense' },
    { label: '🛒 Shopping',  categoryName: 'Shopping',    accountName: 'BCA',  flowType: 'Expense' },
  ];

  const applyQuickButton = (preset) => {
    const matchedAccount  = accounts.find(a => a.name === preset.accountName);
    const matchedCategory = categories.find(c => c.name === preset.categoryName);
    setMode('normal');
    setFormData(prev => ({
      ...prev,
      accountId:  matchedAccount?.id  ?? '',
      categoryId: matchedCategory?.id ?? '',
      flowType:   preset.flowType,
    }));
  };

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
          onClick={() => setMode('normal')}
        >
          💵 Normal
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'transfer' ? 'active' : ''}`}
          onClick={() => setMode('transfer')}
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
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0"
                required
                min="0"
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
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="transfer-arrow"><ArrowDown size={20} /></div>

            <div className="form-group">
              <label>📥 To Account</label>
              <select name="toAccountId" value={formData.toAccountId} onChange={handleChange} required>
                <option value="">Select Destination Account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>💵 Amount (Rp)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0"
                required
                min="0"
              />
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
            <p className="quick-label">Quick Actions:</p>
            <div className="button-grid">
              {quickButtons.map((btn, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-btn"
                  onClick={() => applyQuickButton(btn)}
                >
                  {btn.label}
                </button>
              ))}
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
    </div>
  );
}

export default TransactionForm;
