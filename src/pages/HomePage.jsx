import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { APPS_SCRIPT_URL } from '../config';
import { format } from 'date-fns';
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    netCashflow: 0,
    monthIncome: 0,
    monthExpense: 0,
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(APPS_SCRIPT_URL);
      const data = await response.json();
      const rows = data.values || [];

      if (rows.length > 1) {
        const currentMonth = format(new Date(), 'yyyy-MM');
        let monthIncome = 0;
        let monthExpense = 0;

        const recentTxns = rows.slice(-6, -1).reverse();

        for (let i = 1; i < rows.length; i++) {
          const txnMonth = rows[i][2];
          const flowType = rows[i][6];
          const debit = parseFloat(rows[i][7]) || 0;
          const credit = parseFloat(rows[i][8]) || 0;

          if (txnMonth && txnMonth.toString().startsWith(currentMonth)) {
            if (flowType === 'Income')  monthIncome  += debit;
            if (flowType === 'Expense') monthExpense += credit;
          }
        }

        setStats({
          netCashflow: monthIncome - monthExpense,
          monthIncome,
          monthExpense,
          recentTransactions: recentTxns.map(row => ({
            id: row[0],
            date: row[1],
            account: row[3],
            category: row[5],
            flowType: row[6],
            debit: row[7],
            credit: row[8],
            note: row[11]
          }))
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (amount) => {
    if (hideBalance) return '••••••';
    return Number(amount).toLocaleString('id-ID');
  };

  const currentMonthLabel = format(new Date(), 'MMMM yyyy');

  return (
    <div className="home-page">
      {/* Header */}
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
          {/* Hero cashflow card */}
          <div className="summary-hero">
            <div className="hero-label">Net Cashflow</div>
            <div className="hero-amount">
              {hideBalance
                ? 'Rp ••••••'
                : `${stats.netCashflow >= 0 ? '+' : ''}Rp ${Math.abs(stats.netCashflow).toLocaleString('id-ID')}`}
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

          {/* Quick add */}
          <div className="quick-add">
            <button className="quick-add-btn" onClick={() => navigate('/add')}>
              <Plus size={18} />
              Add Transaction
            </button>
          </div>

          {/* Recent */}
          <div className="recent-section">
            <div className="section-header">
              <h2>Recent Transactions</h2>
              <button className="view-all-btn" onClick={() => navigate('/history')}>
                View all →
              </button>
            </div>

            <div className="transaction-list">
              {stats.recentTransactions.map((txn, idx) => {
                const isIncome = !!txn.debit && !txn.credit;
                const amount = parseFloat(txn.debit || txn.credit || 0);
                return (
                  <div key={idx} className="transaction-card">
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default HomePage;
