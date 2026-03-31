import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useData } from '../contexts/DataContext';
import EditModal from '../components/EditModal';
import { ConfirmDialog } from '../components/ui/Dialog';
import { toast } from '../components/ui/Toast';
import './HistoryPage.css';

function HistoryPage() {
  const { allTransactions: transactions, loading, refetch } = useData();
  const { deleteTransaction } = useTransactions();
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [filters, setFilters] = useState({
    month: 'all',
    account: 'all',
    category: 'all',
    search: ''
  });
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [displayCount, setDisplayCount] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { applyFilters(); }, [transactions, filters]);

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filters.month !== 'all') {
      filtered = filtered.filter(txn => txn.month?.substring(0, 7) === filters.month);
    }
    if (filters.account !== 'all') {
      filtered = filtered.filter(txn => txn.account === filters.account);
    }
    if (filters.category !== 'all') {
      filtered = filtered.filter(txn => txn.category === filters.category);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(txn =>
        (txn.note && txn.note.toLowerCase().includes(q)) ||
        (txn.account && txn.account.toLowerCase().includes(q)) ||
        (txn.category && txn.category.toLowerCase().includes(q))
      );
    }

    setFilteredTransactions(filtered);
    setDisplayCount(20);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { error } = await deleteTransaction(deleteTarget.id);
    if (error) {
      toast.error(`Gagal hapus: ${error.message}`);
    } else {
      setDeleteTarget(null);
      refetch();
      toast.success('Transaksi berhasil dihapus');
    }
    setDeleteLoading(false);
  };

  const handleEditSuccess = () => {
    refetch();
    toast.success('Transaksi berhasil diperbarui');
  };

  const loadMore = () => setDisplayCount(prev => prev + 20);

  const groupedTransactions = filteredTransactions.slice(0, displayCount).reduce((groups, txn) => {
    const date = format(new Date(txn.date), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(txn);
    return groups;
  }, {});

  const uniqueMonths = [...new Set(transactions.map(t => t.month?.substring(0, 7)))].filter(Boolean).sort().reverse();
  const uniqueAccounts = [...new Set(transactions.map(t => t.account))].filter(Boolean).sort();
  const uniqueCategories = [...new Set(transactions.map(t => t.category))].filter(Boolean).sort();

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>History</h1>
        <span className="history-count">{filteredTransactions.length} transactions</span>
      </div>

      <div className="filters">
        <select
          value={filters.month}
          onChange={(e) => setFilters({ ...filters, month: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Months</option>
          {uniqueMonths.map(month => (
            <option key={month} value={month}>
              {format(new Date(month + '-01'), 'MMM yyyy')}
            </option>
          ))}
        </select>

        <select
          value={filters.account}
          onChange={(e) => setFilters({ ...filters, account: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Accounts</option>
          {uniqueAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <input
          type="text"
          placeholder="Search notes, account, category…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading transactions…</span>
        </div>
      ) : (
        <>
          <div className="transaction-groups">
            {Object.entries(groupedTransactions).map(([date, txns]) => (
              <div key={date} className="date-group">
                <div className="date-header">
                  {format(new Date(date), 'EEEE, dd MMM yyyy')}
                </div>

                {txns.map(txn => (
                  <div key={txn.id} className="history-card">
                    <div className="card-main">
                      <div className="card-info">
                        <div className="card-category">{txn.category}</div>
                        <div className="card-account">
                          {txn.account}
                          {txn.transferPairId && (
                            <span className="transfer-badge">{txn.transferPairId}</span>
                          )}
                        </div>
                        {txn.note && <div className="card-note">{txn.note}</div>}
                      </div>
                      <div className={`card-amount ${txn.debit > 0 ? 'expense' : 'income'}`}>
                        {txn.debit > 0 ? '-' : '+'} Rp {(txn.debit || txn.credit).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="card-actions">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => setEditingTransaction(txn)}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => setDeleteTarget(txn)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {filteredTransactions.length > displayCount && (
            <button className="load-more-btn" onClick={loadMore}>
              Load more ({displayCount} of {filteredTransactions.length})
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Transaction?"
        description={deleteTarget
          ? `${deleteTarget.category} · Rp ${(deleteTarget.debit || deleteTarget.credit).toLocaleString('id-ID')}${deleteTarget.note ? ` · "${deleteTarget.note}"` : ''}`
          : ''}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  );
}

export default HistoryPage;
