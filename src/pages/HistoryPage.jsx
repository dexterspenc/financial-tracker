import { useState, useEffect } from 'react';
import { APPS_SCRIPT_URL } from '../config';
import { format } from 'date-fns';
import EditModal from '../components/EditModal';
import './HistoryPage.css';

function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    month: 'all',
    account: 'all',
    category: 'all',
    search: ''
  });
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [displayCount, setDisplayCount] = useState(20);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(APPS_SCRIPT_URL);
      const data = await response.json();
      const rows = data.values || [];
      
      if (rows.length > 1) {
        const txns = rows.slice(1).map((row, idx) => ({
          rowIndex: idx + 2,  // Actual sheet row number
          id: row[0],
          date: row[1],
          month: row[2],
          account: row[3],
          accountPurpose: row[4],
          category: row[5],
          flowType: row[6],
          debit: parseFloat(row[7]) || 0,
          credit: parseFloat(row[8]) || 0,
          type: row[9],
          transferPairId: row[10],
          note: row[11]
        })).reverse();  // ← Reverse AFTER we have correct rowIndex

        setTransactions(txns);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filters.month !== 'all') {
      filtered = filtered.filter(txn => 
        txn.month && txn.month.toString().startsWith(filters.month)
      );
    }

    if (filters.account !== 'all') {
      filtered = filtered.filter(txn => txn.account === filters.account);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(txn => txn.category === filters.category);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(txn => 
        (txn.note && txn.note.toLowerCase().includes(searchLower)) ||
        (txn.account && txn.account.toLowerCase().includes(searchLower)) ||
        (txn.category && txn.category.toLowerCase().includes(searchLower))
      );
    }

    setFilteredTransactions(filtered);
    setDisplayCount(20);
  };

  const handleDelete = async (txn) => {
    if (!window.confirm(`Delete transaction?\n\n${txn.category} - Rp ${(txn.debit || txn.credit).toLocaleString('id-ID')}\n${txn.note || ''}`)) {
      return;
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          rowIndex: txn.rowIndex
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh transactions
        await fetchTransactions();
        alert('✅ Transaction deleted successfully!');
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('❌ Failed to delete transaction: ' + error.message);
    }
  };

  const handleEdit = (txn) => {
    setEditingTransaction(txn);
  };

  const handleEditSuccess = async () => {
    await fetchTransactions();
    alert('✅ Transaction updated successfully!');
  };

  const loadMore = () => {
    setDisplayCount(prev => prev + 20);
  };

  const groupedTransactions = filteredTransactions.slice(0, displayCount).reduce((groups, txn) => {
    const date = format(new Date(txn.date), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(txn);
    return groups;
  }, {});

  const uniqueMonths = [...new Set(transactions.map(t => t.month?.toString().substring(0, 7)))].filter(Boolean).sort().reverse();
  const uniqueAccounts = [...new Set(transactions.map(t => t.account))].filter(Boolean).sort();
  const uniqueCategories = [...new Set(transactions.map(t => t.category))].filter(Boolean).sort();

  return (
    <div className="history-page">
      <div className="page-header">
        <h1>📝 Transaction History</h1>
        <p className="subtitle">{filteredTransactions.length} transactions</p>
      </div>

      <div className="filters">
        <select 
          value={filters.month} 
          onChange={(e) => setFilters({...filters, month: e.target.value})}
          className="filter-select"
        >
          <option value="all">All Months</option>
          {uniqueMonths.map(month => (
            <option key={month} value={month}>
              {format(new Date(month + '-01'), 'MMMM yyyy')}
            </option>
          ))}
        </select>

        <select 
          value={filters.account} 
          onChange={(e) => setFilters({...filters, account: e.target.value})}
          className="filter-select"
        >
          <option value="all">All Accounts</option>
          {uniqueAccounts.map(acc => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>

        <select 
          value={filters.category} 
          onChange={(e) => setFilters({...filters, category: e.target.value})}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="🔍 Search notes..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : (
        <>
          <div className="transaction-groups">
            {Object.entries(groupedTransactions).map(([date, txns]) => (
              <div key={date} className="date-group">
                <div className="date-header">
                  📅 {format(new Date(date), 'EEEE, dd MMMM yyyy')}
                </div>
                
                {txns.map(txn => (
                  <div key={txn.id} className="history-card">
                    <div className="card-main">
                      <div className="card-info">
                        <div className="card-category">{txn.category}</div>
                        <div className="card-account">
                          {txn.account}
                          {txn.transferPairId && (
                            <span className="transfer-badge">🔄 {txn.transferPairId}</span>
                          )}
                        </div>
                        {txn.note && <div className="card-note">{txn.note}</div>}
                      </div>
                      <div className={`card-amount ${txn.credit ? 'expense' : 'income'}`}>
                        {txn.credit ? '-' : '+'} Rp {(txn.debit || txn.credit).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="card-actions">
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleEdit(txn)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(txn)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {filteredTransactions.length > displayCount && (
            <button className="load-more-btn" onClick={loadMore}>
              Load More ({displayCount} of {filteredTransactions.length})
            </button>
          )}

          {filteredTransactions.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-text">No transactions found</div>
              <div className="empty-subtext">Try adjusting your filters</div>
            </div>
          )}
        </>
      )}

      {editingTransaction && (
        <EditModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

export default HistoryPage;