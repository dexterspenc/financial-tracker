import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const { allTransactions, accountBalances, loading } = useData();
  const [hideBalance, setHideBalance] = useState(true);

  const stats = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    let monthIncome = 0;
    let monthExpense = 0;
    allTransactions.forEach(txn => {
      if (txn.month?.substring(0, 7) === currentMonth) {
        if (txn.flowType === 'Income')  monthIncome  += txn.credit;
        if (txn.flowType === 'Expense') monthExpense += txn.debit;
      }
    });
    return {
      netCashflow: monthIncome - monthExpense,
      monthIncome,
      monthExpense,
      recentTransactions: allTransactions.slice(0, 5),
    };
  }, [allTransactions]);

  // Running balance per account = opening balance + all credits - all debits
  const runningBalances = useMemo(() => {
    const map = {};
    accountBalances.forEach(ab => {
      map[ab.account_id] = Number(ab.balance) || 0;
    });
    allTransactions.forEach(txn => {
      if (txn.accountId && txn.accountId in map) {
        map[txn.accountId] += (txn.credit || 0) - (txn.debit || 0);
      }
    });
    return map;
  }, [accountBalances, allTransactions]);

  const fmt = (amount) => {
    if (hideBalance) return '••••••';
    return Number(amount).toLocaleString('id-ID');
  };

  // Formats net cashflow with explicit sign: '+Rp X' for positive, '-Rp X' for negative
  const fmtCashflow = (amount) => {
    if (hideBalance) return 'Rp ••••••';
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}Rp ${Math.abs(amount).toLocaleString('id-ID')}`;
  };

  const currentMonthLabel = format(new Date(), 'MMMM yyyy');

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="home-greeting">
          <h1>Financial Tracker</h1>
          <p>{currentMonthLabel}</p>
        </div>
        <button
          className="toggle-visibility"
          onClick={() => setHideBalance(!hideBalance)}
          title={hideBalance ? 'Show balance' : 'Hide balance'}
        >
          {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading your data…</span>
        </div>
      ) : (
        <>
          <div className="summary-hero">
            <div className="hero-label">Net Cashflow</div>
            <div className="hero-amount">
              {fmtCashflow(stats.netCashflow)}
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-label">Income</div>
                <div className="hero-stat-value">Rp {fmt(stats.monthIncome)}</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-label">Expenses</div>
                <div className="hero-stat-value">Rp {fmt(stats.monthExpense)}</div>
              </div>
            </div>
          </div>

          <div className="quick-add">
            <button className="quick-add-btn" onClick={() => navigate('/add')}>
              <Plus size={18} />
              Add Transaction
            </button>
          </div>

          {accountBalances.length > 0 && (
            <div className="accounts-section">
              <div className="section-header">
                <h2>Saldo Akun</h2>
              </div>
              <div className="accounts-grid">
                {accountBalances.map(ab => (
                  <div key={ab.id} className="account-balance-card">
                    <div className="account-balance-name">{ab.accounts?.name}</div>
                    <div className="account-balance-purpose">{ab.accounts?.purpose}</div>
                    <div className="account-balance-amount">
                      Rp {hideBalance ? '••••••' : (runningBalances[ab.account_id] ?? ab.balance).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="recent-section">
            <div className="section-header">
              <h2>Recent Transactions</h2>
              <button className="view-all-btn" onClick={() => navigate('/history')}>
                View all →
              </button>
            </div>

            <div className="transaction-list">
              {stats.recentTransactions.map((txn) => {
                const isIncome = txn.credit > 0 && txn.debit === 0;
                const amount = txn.credit || txn.debit;
                return (
                  <div key={txn.id} className="transaction-card">
                    <div className="txn-main">
                      <div className="txn-info">
                        <div className="txn-category">{txn.category}</div>
                        <div className="txn-account">{txn.account}</div>
                        {txn.note && <div className="txn-note">{txn.note}</div>}
                      </div>
                      <div className={`txn-amount ${isIncome ? 'income' : 'expense'}`}>
                        {isIncome ? '+' : '-'} Rp {hideBalance ? '••••••' : amount.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="txn-date">
                      {new Date(txn.date).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                  </div>
                );
              })}
              {stats.recentTransactions.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-text">Belum ada transaksi</div>
                  <div className="empty-subtext">Mulai catat keuanganmu sekarang</div>
                  <button className="btn btn-primary" onClick={() => navigate('/add')} style={{ marginTop: 16 }}>
                    <Plus size={16} />
                    Tambah Transaksi Pertama
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default HomePage;
