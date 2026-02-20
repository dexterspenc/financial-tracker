import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { APPS_SCRIPT_URL } from '../config';
import { format } from 'date-fns';
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
        // Calculate stats (EXCLUDE TRANSFERS!)
        const currentMonth = format(new Date(), 'yyyy-MM');
        let monthIncome = 0;
        let monthExpense = 0;
        
        // Get last 5 transactions
        const recentTxns = rows.slice(-6, -1).reverse();
        
        // Calculate month totals
        for (let i = 1; i < rows.length; i++) {
          const txnMonth = rows[i][2]; // Column C (Month)
          const flowType = rows[i][6]; // Column G (Flow_Type)
          const debit = parseFloat(rows[i][7]) || 0; // Column H
          const credit = parseFloat(rows[i][8]) || 0; // Column I
          
          if (txnMonth && txnMonth.toString().startsWith(currentMonth)) {
            // Only count Income and Expense (EXCLUDE Transfer!)
            if (flowType === 'Income') {
              monthIncome += debit;
            }
            if (flowType === 'Expense') {
              monthExpense += credit;
            }
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

  const formatCurrency = (amount) => {
    if (hideBalance) return '••••••••';
    return amount.toLocaleString('id-ID');
  };

  return (
    <div className="home-page">
      <div className="page-header">
        <h1>💰 Financial Tracker</h1>
        <p className="subtitle">Welcome back!</p>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <div className="stats-section">
            <div className="stats-card">
              <div className="stats-header">
                <div className="stats-title">
                  📊 This Month Summary
                </div>
                <button 
                  className="toggle-visibility"
                  onClick={() => setHideBalance(!hideBalance)}
                  title={hideBalance ? 'Show balance' : 'Hide balance'}
                >
                  {hideBalance ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>

              <div className="stats-body">
                <div className="stat-row">
                  <span className="stat-label">Income</span>
                  <span className="stat-value positive">
                    Rp {formatCurrency(stats.monthIncome)}
                  </span>
                </div>

                <div className="stat-row">
                  <span className="stat-label">Expense</span>
                  <span className="stat-value negative">
                    Rp {formatCurrency(stats.monthExpense)}
                  </span>
                </div>

                <div className="stat-divider"></div>

                <div className="stat-row total-row">
                  <span className="stat-label">Net Cashflow</span>
                  <span className={`stat-value ${stats.netCashflow >= 0 ? 'positive' : 'negative'}`}>
                    {hideBalance 
                      ? 'Rp ••••••••' 
                      : `${stats.netCashflow >= 0 ? '+' : ''}Rp ${Math.abs(stats.netCashflow).toLocaleString('id-ID')}`
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="quick-add">
            <button className="quick-add-btn" onClick={() => navigate('/add')}>
              ➕ Quick Add Transaction
            </button>
          </div>

          <div className="recent-section">
            <div className="section-header">
              <h2>Recent Transactions</h2>
              <button className="view-all-btn" onClick={() => navigate('/history')}>
                View All →
              </button>
            </div>
            
            <div className="transaction-list">
              {stats.recentTransactions.map((txn, idx) => (
                <div key={idx} className="transaction-card">
                  <div className="txn-main">
                    <div className="txn-info">
                      <div className="txn-category">{txn.category}</div>
                      <div className="txn-account">{txn.account}</div>
                      {txn.note && <div className="txn-note">{txn.note}</div>}
                    </div>
                    <div className={`txn-amount ${txn.credit ? 'expense' : 'income'}`}>
                      {`${txn.credit ? '-' : '+'} Rp ${(txn.debit || txn.credit || 0).toLocaleString('id-ID')}`}
                    </div>
                  </div>
                  <div className="txn-date">
                    {new Date(txn.date).toLocaleDateString('id-ID', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default HomePage;