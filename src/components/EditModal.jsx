import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { APPS_SCRIPT_URL, ACCOUNTS, CATEGORIES } from '../config';
import './EditModal.css';

function EditModal({ transaction, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    date: '',
    account: '',
    category: '',
    amount: '',
    type: 'Credit',
    note: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setFormData({
        date: format(new Date(transaction.date), 'yyyy-MM-dd'),
        account: transaction.account,
        category: transaction.category,
        amount: transaction.debit || transaction.credit || '',
        type: transaction.debit ? 'Debit' : 'Credit',
        note: transaction.note || ''
      });
    }
  }, [transaction]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const month = format(new Date(formData.date), 'yyyy-MM-01');
      
      const rowData = [
        transaction.id, // Keep original ID
        formData.date,
        month,
        formData.account,
        '', // Account_Purpose (calculated by script)
        formData.category,
        '', // Flow_Type (calculated by script)
        formData.type === 'Debit' ? formData.amount : '',
        formData.type === 'Credit' ? formData.amount : '',
        transaction.type, // Keep original transaction type
        transaction.transferPairId || '',
        formData.note
      ];

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          rowIndex: transaction.rowIndex,
          values: [rowData]
        })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!transaction) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Transaction</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

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

          <div className="form-group">
            <label>🏦 Account</label>
            <select
              name="account"
              value={formData.account}
              onChange={handleChange}
              required
            >
              <option value="">Select Account</option>
              {Object.entries(ACCOUNTS).map(([purpose, accounts]) => (
                <optgroup key={purpose} label={purpose}>
                  {accounts.map(acc => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>📂 Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>
              {Object.entries(CATEGORIES).map(([type, categories]) => (
                <optgroup key={type} label={type}>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </optgroup>
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

          <div className="form-group">
            <label>🔄 Type</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="Debit"
                  checked={formData.type === 'Debit'}
                  onChange={handleChange}
                />
                <span>Income (Debit)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="Credit"
                  checked={formData.type === 'Credit'}
                  onChange={handleChange}
                />
                <span>Expense (Credit)</span>
              </label>
            </div>
          </div>

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

          <div className="modal-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-btn"
              disabled={loading}
            >
              {loading ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditModal;