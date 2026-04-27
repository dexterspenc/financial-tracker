import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { holdingsToOverrides } from '../utils/portfolioOverrides';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const { allTransactions, accountBalances, accounts, portfolioHoldings, loading } = useData();

  const investmentOverrides = useMemo(
    () => holdingsToOverrides(portfolioHoldings),
    [portfolioHoldings]
  );
  const [hideBalance, setHideBalance] = useState(true);

  const stats = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const today = format(new Date(), 'yyyy-MM-dd');
    let monthIncome = 0;
    let monthExpense = 0;
    allTransactions.forEach(txn => {
      if (txn.month?.substring(0, 7) === currentMonth) {
        if (txn.flowType === 'Income')  monthIncome  += txn.credit;
        if (txn.flowType === 'Expense') monthExpense += txn.debit;
      }
    });
    const todayTxns = allTransactions.filter(t => t.date === today);
    const todayExpense = todayTxns
      .filter(t => t.flowType === 'Expense')
      .reduce((sum, t) => sum + t.debit, 0);
    const todayIncome = todayTxns
      .filter(t => t.flowType === 'Income')
      .reduce((sum, t) => sum + t.credit, 0);
    const hasTodayTxns = todayTxns.length > 0;
    return {
      netCashflow: monthIncome - monthExpense,
      monthIncome,
      monthExpense,
      todayTxns,
      todayExpense,
      todayIncome,
      hasTodayTxns,
      recentTransactions: allTransactions.slice(0, 5),
    };
  }, [allTransactions]);

  // Running balance per account = opening balance + all credits - all debits
  const runningBalances = useMemo(() => {
    const map = {};
    accountBalances.forEach(ab => {
      map[ab.account_id] = Number(ab.balance) || 0;
    });
    // Seed CC accounts at 0 even if they have no account_balances entry
    accounts.forEach(a => {
      if (a.is_credit_account && !(a.id in map)) map[a.id] = 0;
    });
    allTransactions.forEach(txn => {
      if (txn.accountId && txn.accountId in map) {
        map[txn.accountId] += (txn.credit || 0) - (txn.debit || 0);
      }
    });
    // Override mapped Investment accounts with live portfolio values
    console.log('[homepage] accounts (Investment):', accounts.filter(a => a.purpose === 'Investment').map(a => ({ id: a.id, name: a.name })));
    console.log('[homepage] investmentOverrides:', investmentOverrides);
    accounts.forEach(a => {
      if (a.purpose === 'Investment' && a.name in investmentOverrides) {
        console.log(`[homepage] overriding ${a.name} (${a.id}): ${map[a.id]} → ${investmentOverrides[a.name]}`);
        map[a.id] = investmentOverrides[a.name];
      }
    });
    console.log('[homepage] runningBalances (after override):', { ...map });
    return map;
  }, [accountBalances, allTransactions, accounts, investmentOverrides]);

  const accountsById = useMemo(() => {
    const map = {};
    accounts.forEach(a => { map[a.id] = a; });
    return map;
  }, [accounts]);

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
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading your data…</span>
        </div>
      ) : (
        <>
          <div className="summary-hero">
            <button
              className="hero-visibility-btn"
              onClick={() => setHideBalance(!hideBalance)}
              title={hideBalance ? 'Show balance' : 'Hide balance'}
            >
              {hideBalance ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
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
                {accountBalances
                  .filter(ab => !accountsById[ab.account_id]?.is_credit_account)
                  .map(ab => (
                    <div key={ab.id} className="account-balance-card">
                      <div className="account-balance-name">{ab.accounts?.name}</div>
                      <div className="account-balance-purpose">{ab.accounts?.purpose}</div>
                      <div className="account-balance-amount">
                        Rp {hideBalance ? '••••••' : (runningBalances[ab.account_id] ?? ab.balance).toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}

                {accounts.filter(a => a.is_credit_account).map(a => {
                  const runningBal = runningBalances[a.id] ?? 0;
                  const bill = runningBal === 0 ? 0 : -runningBal;
                  return (
                    <div key={a.id} className="account-balance-card cc-account-card">
                      <div className="account-balance-name">{a.name}</div>
                      <div className="account-balance-purpose">{a.purpose}</div>
                      <div className={`account-balance-amount${bill > 0 ? ' cc-bill-amount' : ''}`}>
                        <span className="cc-tagihan-prefix">TAGIHAN</span>
                        Rp {hideBalance ? '••••••' : bill.toLocaleString('id-ID')}
                      </div>
                      {!hideBalance && a.credit_limit && (
                        <div className="cc-limit-info">
                          {bill > 0 ? Math.min(100, (bill / Number(a.credit_limit) * 100)).toFixed(0) : 0}% dari Rp {Number(a.credit_limit).toLocaleString('id-ID')}
                        </div>
                      )}
                      {!hideBalance && a.credit_limit && (
                        <div className="cc-sisa-info">
                          Sisa: Rp {(Number(a.credit_limit) - bill).toLocaleString('id-ID')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="recent-section">
            <div className="section-header">
              <h2>{stats.hasTodayTxns ? 'Transaksi Hari Ini' : 'Transaksi Terbaru'}</h2>
              <button className="view-all-btn" onClick={() => navigate('/history')}>
                View all →
              </button>
            </div>

            {stats.hasTodayTxns && (
              <div className="today-summary-card">
                <div className="today-summary-col income">
                  <span className="today-summary-label">PEMASUKAN</span>
                  <span className="today-summary-amount income">
                    +{hideBalance ? '••••••' : `Rp ${stats.todayIncome.toLocaleString('id-ID')}`}
                  </span>
                </div>
                <div className="today-summary-col expense">
                  <span className="today-summary-label">PENGELUARAN</span>
                  <span className="today-summary-amount expense">
                    -{hideBalance ? '••••••' : `Rp ${stats.todayExpense.toLocaleString('id-ID')}`}
                  </span>
                </div>
              </div>
            )}

            <div className="transaction-list">
              {(stats.hasTodayTxns ? stats.todayTxns : stats.recentTransactions).map((txn) => {
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
              {!stats.hasTodayTxns && stats.recentTransactions.length === 0 && (
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
