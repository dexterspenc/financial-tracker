import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTransactions } from '../hooks/useTransactions';
import { useData } from '../contexts/DataContext';
import { Dialog, DialogContent } from './ui/Dialog';
import { toast } from './ui/Toast';
import './EditModal.css';

function EditModal({ transaction, onClose, onSuccess }) {
  const { updateTransaction } = useTransactions();
  const { accounts, categories } = useData();

  const [formData, setFormData] = useState({
    date: '',
    accountId: '',
    categoryId: '',
    amount: '',
    flowType: 'Expense',
    note: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    const amount = transaction.debit > 0 ? transaction.debit : transaction.credit;
    setFormData({
      date: format(new Date(transaction.date + 'T00:00:00'), 'yyyy-MM-dd'),
      accountId: transaction.accountId ?? '',
      categoryId: transaction.categoryId ?? '',
      amount: amount?.toString() ?? '',
      flowType: transaction.flowType ?? 'Expense',
      note: transaction.note ?? '',
    });
  }, [transaction]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
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
      const month = format(new Date(formData.date + 'T00:00:00'), 'yyyy-MM-01');
      const amount = parseFloat(formData.amount) || 0;
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      const flowType = selectedCategory?.flow_type ?? formData.flowType;

      // For Transfer rows, preserve the original debit/credit direction
      const isTransferDebit = flowType === 'Transfer' && transaction.debit > 0;
      const isTransferCredit = flowType === 'Transfer' && transaction.credit > 0;

      const payload = {
        date: formData.date,
        month,
        account_id: formData.accountId,
        category_id: formData.categoryId,
        flow_type: flowType,
        debit:  flowType === 'Income'  || isTransferDebit  ? amount : 0,
        credit: flowType === 'Expense' || isTransferCredit ? amount : 0,
        note: formData.note || null,
      };

      const { error } = await updateTransaction(transaction.id, payload);
      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  const accountsByPurpose = accounts.reduce((groups, acc) => {
    if (!groups[acc.purpose]) groups[acc.purpose] = [];
    groups[acc.purpose].push(acc);
    return groups;
  }, {});

  const incomeCategories = categories.filter(c => c.flow_type === 'Income');
  const expenseCategories = categories.filter(c => c.flow_type === 'Expense');
  const transferCategories = categories.filter(c => c.flow_type === 'Transfer');

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent title="Edit Transaction">
          <form onSubmit={handleSubmit} className="edit-form">
            <div className="edit-form-grid">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Account</label>
                <select name="accountId" value={formData.accountId} onChange={handleChange} required>
                  <option value="">Select Account</option>
                  {Object.entries(accountsByPurpose).map(([purpose, accs]) => (
                    <optgroup key={purpose} label={purpose}>
                      {accs.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
                  <option value="">Select Category</option>
                  <optgroup label="Income">
                    {incomeCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </optgroup>
                  <optgroup label="Expense">
                    {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </optgroup>
                  {transferCategories.length > 0 && (
                    <optgroup label="Transfer">
                      {transferCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Amount (Rp)</label>
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
            </div>

            <div className="form-group">
              <label>Type</label>
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
              <label>Note</label>
              <input
                type="text"
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="Add a note…"
              />
            </div>

            <div className="edit-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditModal;
