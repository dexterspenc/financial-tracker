import { useState } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTransactions } from '../hooks/useTransactions';
import { toast } from './ui/Toast';
import './QuickActionPopup.css';

function QuickActionPopup({ action, onClose }) {
  const { user } = useAuth();
  const { accounts, categories, refetch } = useData();
  const { addTransaction } = useTransactions();

  const category = categories.find(c => c.id === action.category_id);

  const accountsByPurpose = accounts.reduce((groups, acc) => {
    if (!groups[acc.purpose]) groups[acc.purpose] = [];
    groups[acc.purpose].push(acc);
    return groups;
  }, {});

  const [accountId, setAccountId] = useState(action.default_account_id || accounts[0]?.id || '');
  const [amount, setAmount]       = useState('');
  const [note, setNote]           = useState('');
  const [saving, setSaving]       = useState(false);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Masukkan jumlah yang valid'); return; }
    if (!accountId)       { toast.error('Pilih akun terlebih dahulu'); return; }
    setSaving(true);
    try {
      const today    = format(new Date(), 'yyyy-MM-dd');
      const month    = format(new Date(), 'yyyy-MM-01');
      const flowType = category?.flow_type ?? 'Expense';

      const { error } = await addTransaction({
        user_id:     user.id,
        date:        today,
        month,
        account_id:  accountId,
        category_id: action.category_id,
        flow_type:   flowType,
        debit:       flowType === 'Expense' ? amt : 0,
        credit:      flowType === 'Income'  ? amt : 0,
        type:        'Normal',
        note:        note || null,
      });
      if (error) throw error;

      toast.success('Transaksi berhasil ditambahkan!');
      try { await refetch(); } catch {}
      onClose();
    } catch {
      toast.error('Gagal menambah transaksi');
      setSaving(false);
    }
  };

  return (
    <div className="qa-overlay" onClick={onClose}>
      <div className="qa-sheet" onClick={e => e.stopPropagation()}>

        <div className="qa-header">
          <span className="qa-title">{category?.name ?? 'Quick Action'}</span>
          <button type="button" className="qa-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="qa-body">
          <div className="qa-field">
            <label>Akun</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">Pilih Akun</option>
              {Object.entries(accountsByPurpose).map(([purpose, accs]) => (
                <optgroup key={purpose} label={purpose}>
                  {accs.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="qa-field">
            <label>Jumlah (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              autoFocus
            />
          </div>

          <div className="qa-field">
            <label>Catatan <span className="qa-opt">(opsional)</span></label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Tambah catatan…"
            />
          </div>
        </div>

        <div className="qa-footer">
          <button
            type="button"
            className="btn btn-primary qa-submit"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? <span className="spinner" /> : 'Tambah Transaksi'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default QuickActionPopup;
