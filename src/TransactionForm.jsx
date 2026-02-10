import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { APPS_SCRIPT_URL, ACCOUNTS, CATEGORIES } from './config';

function TransactionForm() {
  const [mode, setMode] = useState('normal'); // 'normal' or 'transfer'
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    account: '',
    category: '',
    amount: '',
    type: 'Credit',
    note: '',
    // Transfer mode fields
    fromAccount: '',
    toAccount: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [lastTransactionId, setLastTransactionId] = useState('');
  const [lastTransferPairId, setLastTransferPairId] = useState('');

  useEffect(() => {
    fetchLastTransactionId();
  }, []);

  const fetchLastTransactionId = async () => {
  try {
    const response = await fetch(APPS_SCRIPT_URL);
    const data = await response.json();
    const rows = data.values || [];
    
    if (rows.length > 1) {
      // Find actual last row (skip header)
      const lastRow = rows[rows.length - 1];
      const lastId = lastRow[0]; // Column A
      const lastTransferPair = lastRow[10]; // Column K
      
      console.log('Last Transaction ID from sheet:', lastId);
      console.log('Last Transfer Pair ID from sheet:', lastTransferPair);
      
      setLastTransactionId(lastId);
      
      if (lastTransferPair && lastTransferPair.startsWith('TRF-')) {
        setLastTransferPairId(lastTransferPair);
      } else {
        // Scan all rows for highest TRF-XXX
        let highestTrfNum = 0;
        for (let i = 1; i < rows.length; i++) {
          const trfId = rows[i][10]; // Column K
          if (trfId && trfId.startsWith('TRF-')) {
            const num = parseInt(trfId.split('-')[1]);
            if (num > highestTrfNum) {
              highestTrfNum = num;
            }
          }
        }
        if (highestTrfNum > 0) {
          setLastTransferPairId(`TRF-${highestTrfNum.toString().padStart(3, '0')}`);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching last ID:', error);
  }
};

  const generateNextId = () => {
    const today = new Date();
    const yearMonth = format(today, 'yyyyMM');
    
    if (lastTransactionId && lastTransactionId.startsWith(yearMonth)) {
      const lastNumber = parseInt(lastTransactionId.split('-')[1]);
      const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `${yearMonth}-${nextNumber}`;
    } else {
      return `${yearMonth}-001`;
    }
  };

  const generateNextTransferId = () => {
    if (lastTransferPairId && lastTransferPairId.startsWith('TRF-')) {
      const lastNumber = parseInt(lastTransferPairId.split('-')[1]);
      const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `TRF-${nextNumber}`;
    } else {
      return 'TRF-001';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (mode === 'normal') {
        await submitNormalTransaction();
      } else {
        await submitTransferTransaction();
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ 
        type: 'error', 
        text: '❌ Failed to add transaction' 
      });
    } finally {
      setLoading(false);
    }
  };

  const submitNormalTransaction = async () => {
    const transactionId = generateNextId();
    const month = format(new Date(formData.date), 'yyyy-MM-01');
    
    const rowData = [
      transactionId,
      formData.date,
      month,
      formData.account,
      '', // Account_Purpose (formula)
      formData.category,
      '', // Flow_Type (formula)
      formData.type === 'Debit' ? formData.amount : '',
      formData.type === 'Credit' ? formData.amount : '',
      'Normal',
      '',
      formData.note
    ];

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ values: [rowData] })
    });

    setMessage({ 
      type: 'success', 
      text: `✅ Transaction ${transactionId} added!` 
    });
    
    setLastTransactionId(transactionId);
    resetForm();
  };

  const submitTransferTransaction = async () => {
    const transferPairId = generateNextTransferId();
    const month = format(new Date(formData.date), 'yyyy-MM-01');
    
    // Transaction 1: Credit from source account
    const transactionId1 = generateNextId();
    const rowData1 = [
      transactionId1,
      formData.date,
      month,
      formData.fromAccount,
      '', // Account_Purpose (formula)
      'Transfer',
      '', // Flow_Type (formula)
      '', // Debit
      formData.amount, // Credit (keluar)
      'Transfer',
      transferPairId,
      formData.note
    ];

    // Transaction 2: Debit to destination account
    const id1Number = parseInt(transactionId1.split('-')[1]);
    const transactionId2 = `${transactionId1.split('-')[0]}-${(id1Number + 1).toString().padStart(3, '0')}`;
    
    const rowData2 = [
      transactionId2,
      formData.date,
      month,
      formData.toAccount,
      '', // Account_Purpose (formula)
      'Transfer',
      '', // Flow_Type (formula)
      formData.amount, // Debit (masuk)
      '', // Credit
      'Transfer',
      transferPairId,
      formData.note
    ];

    // Send both transactions
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ values: [rowData1] })
    });

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ values: [rowData2] })
    });

    setMessage({ 
      type: 'success', 
      text: `✅ Transfer ${transferPairId} created! (${transactionId1} & ${transactionId2})` 
    });
    
    setLastTransactionId(transactionId2);
    setLastTransferPairId(transferPairId);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      account: '',
      category: '',
      amount: '',
      type: 'Credit',
      note: '',
      fromAccount: '',
      toAccount: ''
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const quickButtons = [
    { label: '🍽️ Lunch', category: 'Daily Needs', account: 'BCA', type: 'Credit' },
    { label: '❤️ Dating', category: 'Dating', account: 'BCA', type: 'Credit' },
    { label: '🚗 Transport', category: 'Transport', account: 'Cash', type: 'Credit' },
    { label: '🛒 Shopping', category: 'Shopping', account: 'BCA', type: 'Credit' }
  ];

  const applyQuickButton = (preset) => {
    setMode('normal');
    setFormData({
      ...formData,
      category: preset.category,
      account: preset.account,
      type: preset.type
    });
  };

  const allAccounts = Object.values(ACCOUNTS).flat();

  return (
    <div className="transaction-form">
      <div className="form-header">
        <h1>💰 Add Transaction</h1>
        <p className="subtitle">Quick & Easy Financial Tracking</p>
      </div>

      {/* Mode Toggle */}
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

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
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

        {mode === 'normal' ? (
          <>
            {/* Normal Mode Fields */}
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
          </>
        ) : (
          <>
            {/* Transfer Mode Fields */}
            <div className="form-group">
              <label>📤 From Account</label>
              <select
                name="fromAccount"
                value={formData.fromAccount}
                onChange={handleChange}
                required
              >
                <option value="">Select Source Account</option>
                {allAccounts.map(acc => (
                  <option key={acc} value={acc}>{acc}</option>
                ))}
              </select>
            </div>

            <div className="transfer-arrow">⬇️</div>

            <div className="form-group">
              <label>📥 To Account</label>
              <select
                name="toAccount"
                value={formData.toAccount}
                onChange={handleChange}
                required
              >
                <option value="">Select Destination Account</option>
                {allAccounts.map(acc => (
                  <option key={acc} value={acc}>{acc}</option>
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
          {loading ? '⏳ Adding...' : mode === 'transfer' ? '🔄 Create Transfer' : '✨ Add Transaction'}
        </button>
      </form>

      <div className="next-id">
        {mode === 'normal' ? (
          <>Next ID: <strong>{generateNextId()}</strong></>
        ) : (
          <>Next Transfer: <strong>{generateNextTransferId()}</strong></>
        )}
      </div>
    </div>
  );
}

export default TransactionForm;