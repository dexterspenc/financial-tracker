import { useState, useEffect, useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, Filler,
} from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useBudgets } from '../hooks/useBudgets';
import AnalyticsTabs from '../components/AnalyticsTabs.jsx';
import AIAdvisor from '../components/AIAdvisor.jsx';
import { toast } from '../components/ui/Toast';
import './AnalyticsPage.css';

function AnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { allTransactions, accounts, accountBalances, loading } = useData();
  const { fetchBudgets } = useBudgets();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [analytics, setAnalytics] = useState({
    monthIncome: 0,
    monthExpense: 0,
    netCashflow: 0,
    savingRate: 0,
    momChange: 0,
    expenseByCategory: {},
    categoryPurposes: {},
    topExpenses: [],
    accountBalances: {
      Living: 0,
      Playing: 0,
      Saving: 0,
      Investment: 0
    },
    totalNetWorth: 0,
    expenseStability: 0,
    cashflowHealth: 0
  });
  const [trends, setTrends] = useState({
    months: [],
    incomeData: [],
    expenseData: [],
    weeklyData: []
  });
  const [accountsData, setAccountsData] = useState({
    balances: {},
    recentTransfers: [],
    activityStats: {
      mostUsed: { account: '', count: 0 },
      topTransferRoute: { from: '', to: '', count: 0 },
      lowestBalance: { account: '', amount: 0 }
    },
    selectedAccount: null
  });
  const [budgets, setBudgets] = useState([]);
  const [reportFilters, setReportFilters] = useState({
    dateFrom: format(new Date(format(new Date(), 'yyyy-MM') + '-01'), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    account: 'All',
    category: 'All',
    flowType: 'All'
  });

  useEffect(() => {
    if (allTransactions.length > 0) {
      calculateAnalytics(allTransactions, openingBalances.byPurpose);
      setTrends(calculateTrends(allTransactions));
    }
  }, [selectedMonth, allTransactions, openingBalances]);

  useEffect(() => {
    if (activeTab !== 'accounts') return;
    if (!allTransactions.length && Object.keys(openingBalances.byName).length === 0) return;
    setAccountsData(computeAccountsData(allTransactions, selectedMonth, openingBalances.byName));
  }, [activeTab, selectedMonth, allTransactions, openingBalances]);

  useEffect(() => {
    if (activeTab === 'budget' && user) {
      loadBudgets();
    }
  }, [activeTab, selectedMonth, user]);

  const openingBalances = useMemo(() => {
    const byName = {};
    const byPurpose = {};
    accountBalances.forEach(b => {
      if (b.accounts?.name)    byName[b.accounts.name]       = (byName[b.accounts.name]       || 0) + b.balance;
      if (b.accounts?.purpose) byPurpose[b.accounts.purpose] = (byPurpose[b.accounts.purpose] || 0) + b.balance;
    });
    return { byName, byPurpose };
  }, [accountBalances]);

  const calculateAnalytics = (txns, openingByPurpose = {}) => {
    const currentMonth = selectedMonth;
    const lastMonth = format(subMonths(new Date(selectedMonth + '-01'), 1), 'yyyy-MM');

    let monthIncome = 0;
    let monthExpense = 0;
    let lastMonthExpense = 0;
    const expenseByCategory = {};
    const categoryPurposes = {};
    const expenseTransactions = [];
    const accountBalances = {
      Living:     openingByPurpose.Living     || 0,
      Playing:    openingByPurpose.Playing    || 0,
      Saving:     openingByPurpose.Saving     || 0,
      Investment: openingByPurpose.Investment || 0,
    };

    txns.forEach(txn => {
      const txnMonth = txn.month?.substring(0, 7);
      const { flowType, debit, credit, category, accountPurpose, note, date } = txn;

      if (txnMonth === currentMonth) {
        if (flowType === 'Income') {
          monthIncome += debit || 0;
        }
        if (flowType === 'Expense') {
          monthExpense += credit || 0;
          if (category) {
            expenseByCategory[category] = (expenseByCategory[category] || 0) + (credit || 0);
            if (accountPurpose && !categoryPurposes[category]) {
              categoryPurposes[category] = accountPurpose;
            }
          }
          expenseTransactions.push({ category, amount: credit || 0, note, date });
        }
      }

      if (txnMonth === lastMonth && flowType === 'Expense') {
        lastMonthExpense += credit || 0;
      }

      if (accountPurpose) {
        accountBalances[accountPurpose] = (accountBalances[accountPurpose] || 0) + (debit || 0) - (credit || 0);
      }
    });

    const netCashflow = monthIncome - monthExpense;
    const savingRate = monthIncome > 0 ? ((netCashflow / monthIncome) * 100) : 0;
    const momChange = lastMonthExpense > 0 ? (((monthExpense - lastMonthExpense) / lastMonthExpense) * 100) : 0;
    const topExpenses = expenseTransactions.sort((a, b) => b.amount - a.amount).slice(0, 5);
    const totalNetWorth = Object.values(accountBalances).reduce((sum, val) => sum + val, 0);
    const totalExpense = Object.values(expenseByCategory).reduce((sum, val) => sum + val, 0);
    const topCategoryExpense = Math.max(...Object.values(expenseByCategory), 0);
    const concentration = totalExpense > 0 ? (topCategoryExpense / totalExpense) * 100 : 0;
    const expenseStability = Math.max(0, 100 - concentration);
    const cashflowHealth = netCashflow >= 0 ? 100 : Math.max(0, 50 + (netCashflow / monthIncome * 100));

    setAnalytics({
      monthIncome,
      monthExpense,
      netCashflow,
      savingRate,
      momChange,
      expenseByCategory,
      categoryPurposes,
      topExpenses,
      accountBalances,
      totalNetWorth,
      expenseStability,
      cashflowHealth
    });
  };

  const calculateTrends = (txns) => {
    const months = [];
    const monthlyData = {};
    const weeklyData = [0, 0, 0, 0, 0];

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      months.push(monthKey);
      monthlyData[monthKey] = { label: format(date, 'MMM yyyy'), income: 0, expense: 0 };
    }

    txns.forEach(txn => {
      const txnMonth = txn.month?.substring(0, 7);
      if (monthlyData[txnMonth]) {
        if (txn.flowType === 'Income') monthlyData[txnMonth].income += txn.debit || 0;
        if (txn.flowType === 'Expense') monthlyData[txnMonth].expense += txn.credit || 0;
      }
      if (txnMonth === selectedMonth && txn.date && txn.flowType === 'Expense') {
        const day = new Date(txn.date).getDate();
        const weekIndex = Math.floor((day - 1) / 7);
        if (weekIndex < 5) weeklyData[weekIndex] += txn.credit || 0;
      }
    });

    return {
      months: months.map(m => monthlyData[m].label),
      incomeData: months.map(m => monthlyData[m].income),
      expenseData: months.map(m => monthlyData[m].expense),
      weeklyData
    };
  };

  const computeAccountsData = (txns, month, openingBalanceMap = {}) => {
    // Compute all-time balances per account, seeded with opening balances
    const balances = { ...openingBalanceMap };
    txns.forEach(txn => {
      if (txn.account) {
        balances[txn.account] = (balances[txn.account] || 0) + (txn.debit || 0) - (txn.credit || 0);
      }
    });

    // Recent transfers (last 10 pairs)
    const reversedTxns = [...txns].reverse();
    const seenPairs = new Set();
    const allTransfers = [];
    for (const txn of reversedTxns) {
      if (txn.type === 'Transfer' && txn.transferPairId && !seenPairs.has(txn.transferPairId)) {
        seenPairs.add(txn.transferPairId);
        const creditRow = txns.find(t => t.transferPairId === txn.transferPairId && (t.credit || 0) > 0);
        const debitRow = txns.find(t => t.transferPairId === txn.transferPairId && (t.debit || 0) > 0);
        if (creditRow && debitRow) {
          allTransfers.push({
            date: creditRow.date,
            from: creditRow.account,
            to: debitRow.account,
            amount: creditRow.credit,
            note: creditRow.note,
            pairId: txn.transferPairId
          });
          if (allTransfers.length >= 10) break;
        }
      }
    }

    // Activity stats for selected month
    const accountUsage = {};
    const transferRoutes = {};
    txns.forEach(txn => {
      if (txn.month?.substring(0, 7) === month) {
        accountUsage[txn.account] = (accountUsage[txn.account] || 0) + 1;
        if (txn.type === 'Transfer' && txn.transferPairId && (txn.credit || 0) > 0) {
          const pair = txns.find(t => t.transferPairId === txn.transferPairId && (t.debit || 0) > 0);
          if (pair) {
            const route = `${txn.account} → ${pair.account}`;
            transferRoutes[route] = (transferRoutes[route] || 0) + 1;
          }
        }
      }
    });

    const mostUsed = Object.entries(accountUsage).reduce(
      (max, [acc, count]) => count > max.count ? { account: acc, count } : max,
      { account: '', count: 0 }
    );
    const topRoute = Object.entries(transferRoutes).reduce(
      (max, [route, count]) => count > max.count ? { route, count } : max,
      { route: '', count: 0 }
    );
    const [from = '', to = ''] = topRoute.route.split(' → ');
    const lowestBalance = Object.entries(balances).reduce(
      (min, [acc, amount]) => amount < min.amount ? { account: acc, amount } : min,
      { account: '', amount: Infinity }
    );

    return {
      balances,
      recentTransfers: allTransfers,
      activityStats: {
        mostUsed,
        topTransferRoute: { from, to, count: topRoute.count },
        lowestBalance: lowestBalance.amount !== Infinity ? lowestBalance : { account: '', amount: 0 }
      },
      selectedAccount: null
    };
  };

  const loadBudgets = async () => {
    const { data } = await fetchBudgets(user.id, selectedMonth);
    setBudgets(data ?? []);
  };

  const getBudgetByCategory = () => {
    const result = budgets.map(b => {
      const actual = analytics.expenseByCategory[b.categories?.name] || 0;
      const budget = b.amount || 0;
      const pct = budget > 0 ? (actual / budget * 100) : 0;
      return {
        categoryId: b.category_id,
        name: b.categories?.name || '?',
        budget,
        actual,
        percentage: pct,
        remaining: budget - actual,
        status: budget === 0 ? 'no-budget' : pct > 100 ? 'over' : pct > 80 ? 'warning' : 'good',
      };
    });
    // Also add expense categories with spending but no budget
    Object.entries(analytics.expenseByCategory).forEach(([name, actual]) => {
      if (!result.find(r => r.name === name)) {
        result.push({ name, budget: 0, actual, percentage: 0, remaining: -actual, status: 'no-budget' });
      }
    });
    return result.sort((a, b) => b.actual - a.actual);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Month', 'Account', 'Account Purpose', 'Category', 'Flow Type', 'Debit', 'Credit', 'Type', 'Transfer Pair ID', 'Note'];
    const filtered = allTransactions.filter(txn => {
      if (txn.date < reportFilters.dateFrom || txn.date > reportFilters.dateTo) return false;
      if (reportFilters.account !== 'All' && txn.account !== reportFilters.account) return false;
      if (reportFilters.flowType !== 'All' && txn.flowType !== reportFilters.flowType) return false;
      return true;
    });

    if (filtered.length === 0) {
      toast.info('No transactions match your filters');
      return;
    }

    const rows = filtered.map(txn => [
      txn.date, txn.month, txn.account, txn.accountPurpose, txn.category,
      txn.flowType, txn.debit || 0, txn.credit || 0, txn.type, txn.transferPairId || '', txn.note || ''
    ]);

    const csvContent = [headers, ...rows].map(row =>
      row.map(cell => {
        const cellStr = (cell || '').toString();
        return (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n'))
          ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${reportFilters.dateFrom}_to_${reportFilters.dateTo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filtered.length} transactions`);
  };

  const generateReport = () => {
    const reportData = {
      month: format(new Date(selectedMonth + '-01'), 'MMMM yyyy'),
      period: `${reportFilters.dateFrom} to ${reportFilters.dateTo}`,
      totalIncome: analytics.monthIncome,
      totalExpense: analytics.monthExpense,
      netCashflow: analytics.netCashflow,
      savingRate: analytics.savingRate,
      expenseByCategory: analytics.expenseByCategory,
      budgetPerformance: getBudgetByCategory(),
      topExpenses: analytics.topExpenses,
      cashflowHealth: analytics.cashflowHealth,
      expenseStability: analytics.expenseStability,
      momChange: analytics.momChange
    };
    const reportHTML = generateReportHTML(reportData);
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
  };

  const generateReportHTML = (data) => {
    const insights = generateInsights(data);
    const expenseEntries = Object.entries(data.expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const maxExpense = Math.max(...expenseEntries.map(e => e[1]));

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Financial Report - ${data.month}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1a202c;
      background: #f7fafc;
      padding: 40px 20px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #667eea;
    }

    .header h1 {
      font-size: 32px;
      color: #667eea;
      margin-bottom: 10px;
    }

    .header .period {
      font-size: 18px;
      color: #718096;
    }

    .section {
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 22px;
      color: #2d3748;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .summary-card {
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      text-align: center;
    }

    .summary-card.green {
      background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    }

    .summary-card.red {
      background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
    }

    .summary-card .label {
      font-size: 13px;
      opacity: 0.9;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-card .value {
      font-size: 28px;
      font-weight: 700;
    }

    .chart-container {
      margin: 20px 0;
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .bar-item {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .bar-label {
      min-width: 150px;
      font-weight: 600;
      font-size: 14px;
    }

    .bar-visual {
      flex: 1;
      height: 30px;
      background: #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 6px;
      transition: width 0.5s ease;
    }

    .bar-value {
      min-width: 120px;
      text-align: right;
      font-weight: 600;
      font-size: 14px;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    .table th {
      background: #f7fafc;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e2e8f0;
    }

    .table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    .table tr:hover {
      background: #f7fafc;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.good {
      background: #c6f6d5;
      color: #22543d;
    }

    .status-badge.warning {
      background: #fef5e7;
      color: #7d6608;
    }

    .status-badge.danger {
      background: #fed7d7;
      color: #742a2a;
    }

    .health-score {
      display: flex;
      align-items: center;
      gap: 15px;
      margin: 15px 0;
    }

    .health-label {
      min-width: 200px;
      font-weight: 600;
    }

    .health-bar {
      flex: 1;
      height: 24px;
      background: #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }

    .health-fill {
      height: 100%;
      border-radius: 12px;
      transition: width 0.5s ease;
    }

    .health-fill.good {
      background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    }

    .health-fill.warning {
      background: linear-gradient(135deg, #ecc94b 0%, #d69e2e 100%);
    }

    .health-fill.danger {
      background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
    }

    .health-value {
      min-width: 60px;
      text-align: right;
      font-weight: 700;
    }

    .insights {
      background: #f7fafc;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }

    .insights h3 {
      margin-bottom: 15px;
      color: #667eea;
    }

    .insights ul {
      list-style: none;
      padding-left: 0;
    }

    .insights li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
    }

    .insights li:before {
      content: "→";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
    }

    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
        padding: 20px;
      }

      .print-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="container">
    <div class="header">
      <h1>📊 Financial Report</h1>
      <div class="period">${data.month}</div>
    </div>

    <!-- Executive Summary -->
    <div class="section">
      <h2 class="section-title">💰 Executive Summary</h2>
      <div class="summary-grid">
        <div class="summary-card green">
          <div class="label">Total Income</div>
          <div class="value">Rp ${data.totalIncome.toLocaleString('id-ID')}</div>
        </div>
        <div class="summary-card red">
          <div class="label">Total Expense</div>
          <div class="value">Rp ${data.totalExpense.toLocaleString('id-ID')}</div>
        </div>
        <div class="summary-card ${data.netCashflow >= 0 ? 'green' : 'red'}">
          <div class="label">Net Cashflow</div>
          <div class="value">${data.netCashflow >= 0 ? '+' : ''}Rp ${Math.abs(data.netCashflow).toLocaleString('id-ID')}</div>
        </div>
        <div class="summary-card">
          <div class="label">Saving Rate</div>
          <div class="value">${data.savingRate.toFixed(1)}%</div>
        </div>
      </div>
    </div>

    <!-- Expense Breakdown -->
    <div class="section">
      <h2 class="section-title">📊 Expense Breakdown</h2>
      <div class="chart-container">
        <div class="bar-chart">
          ${expenseEntries.map(([category, amount]) => {
      const percentage = (amount / maxExpense * 100).toFixed(0);
      return `
              <div class="bar-item">
                <div class="bar-label">${category}</div>
                <div class="bar-visual">
                  <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="bar-value">Rp ${amount.toLocaleString('id-ID')}</div>
              </div>
            `;
    }).join('')}
        </div>
      </div>
    </div>

    <!-- Budget Performance -->
    <div class="section">
      <h2 class="section-title">🎯 Budget Performance</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Budget</th>
            <th>Aktual</th>
            <th>Sisa</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.budgetPerformance.filter(b => b.budget > 0 || b.actual > 0).map(b => {
      const statusLabel = b.status === 'over' ? 'Melebihi ⚠️' : b.status === 'warning' ? 'Hampir ⚠️' : b.status === 'no-budget' ? 'Belum diset' : 'Aman ✅';
      return `
              <tr>
                <td><strong>${b.name}</strong></td>
                <td>${b.budget > 0 ? `Rp ${b.budget.toLocaleString('id-ID')}` : '-'}</td>
                <td>Rp ${b.actual.toLocaleString('id-ID')}</td>
                <td>${b.budget > 0 ? (b.remaining >= 0 ? `+Rp ${b.remaining.toLocaleString('id-ID')}` : `-Rp ${Math.abs(b.remaining).toLocaleString('id-ID')}`) : '-'}</td>
                <td><span class="status-badge ${b.status}">${statusLabel}</span></td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Top Expenses -->
    <div class="section">
      <h2 class="section-title">🔥 Top 5 Expenses</h2>
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.topExpenses.map((exp, idx) => `
            <tr>
              <td><strong>${idx + 1}</strong></td>
              <td>${exp.category}</td>
              <td>${exp.note || '-'}</td>
              <td><strong>Rp ${exp.amount.toLocaleString('id-ID')}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Financial Health -->
    <div class="section">
      <h2 class="section-title">💪 Financial Health Scores</h2>
      <div class="health-score">
        <div class="health-label">Cashflow Health</div>
        <div class="health-bar">
          <div class="health-fill ${data.cashflowHealth >= 70 ? 'good' : data.cashflowHealth >= 40 ? 'warning' : 'danger'}"
               style="width: ${data.cashflowHealth}%"></div>
        </div>
        <div class="health-value">${data.cashflowHealth.toFixed(0)}/100</div>
      </div>
      <div class="health-score">
        <div class="health-label">Expense Diversification</div>
        <div class="health-bar">
          <div class="health-fill ${data.expenseStability >= 70 ? 'good' : data.expenseStability >= 40 ? 'warning' : 'danger'}"
               style="width: ${data.expenseStability}%"></div>
        </div>
        <div class="health-value">${data.expenseStability.toFixed(0)}/100</div>
      </div>
    </div>

    <!-- Insights & Recommendations -->
    <div class="section">
      <h2 class="section-title">💡 Insights & Recommendations</h2>
      <div class="insights">
        <h3>Key Findings:</h3>
        <ul>
          ${insights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; color: #718096; font-size: 14px;">
      Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')} | Financial Tracker App
    </div>
  </div>
</body>
</html>
  `;
  };

  const generateInsights = (data) => {
    const insights = [];

    if (data.netCashflow > 0) {
      insights.push(`Positive cashflow of Rp ${data.netCashflow.toLocaleString('id-ID')} - You're spending less than you earn! ✅`);
    } else {
      insights.push(`⚠️ Negative cashflow of Rp ${Math.abs(data.netCashflow).toLocaleString('id-ID')} - You're spending more than you earn. Consider reducing expenses.`);
    }

    if (data.savingRate >= 20) {
      insights.push(`Strong saving rate of ${data.savingRate.toFixed(1)}% - You're on track for financial goals! 💪`);
    } else if (data.savingRate >= 10) {
      insights.push(`Moderate saving rate of ${data.savingRate.toFixed(1)}% - Consider increasing savings for better financial health.`);
    } else {
      insights.push(`⚠️ Low saving rate of ${data.savingRate.toFixed(1)}% - Aim for at least 20% to build financial security.`);
    }

    const overBudget = data.budgetPerformance.filter(p => p.status === 'over' || p.status === 'under');
    if (overBudget.length > 0) {
      const names = overBudget.map(p => p.name).join(', ');
      insights.push(`⚠️ ${names} ${overBudget.length > 1 ? 'are' : 'is'} off-budget. Review and adjust spending or budget targets.`);
    } else {
      insights.push(`All budgets are on track! Great financial discipline! 🎯`);
    }

    if (data.topExpenses.length > 0) {
      const topCategory = data.topExpenses[0].category;
      const topAmount = data.topExpenses[0].amount;
      const percentage = ((topAmount / data.totalExpense) * 100).toFixed(1);
      insights.push(`Biggest expense: ${topCategory} (Rp ${topAmount.toLocaleString('id-ID')}, ${percentage}% of total). Monitor this category closely.`);
    }

    if (data.momChange > 10) {
      insights.push(`⚠️ Expenses increased ${data.momChange.toFixed(1)}% from last month. Identify the cause and control spending.`);
    } else if (data.momChange < -10) {
      insights.push(`✅ Expenses decreased ${Math.abs(data.momChange).toFixed(1)}% from last month. Great cost management!`);
    }

    if (data.expenseStability < 50) {
      insights.push(`⚠️ Low expense diversification - spending is concentrated in few categories. Diversify to reduce financial risk.`);
    }

    return insights;
  };

  const quickReport = (type) => {
    const today = new Date();
    let dateFrom, dateTo;

    switch (type) {
      case 'this-month':
        dateFrom = format(new Date(selectedMonth + '-01'), 'yyyy-MM-dd');
        dateTo = format(new Date(), 'yyyy-MM-dd');
        break;
      case 'last-30':
        dateFrom = format(subMonths(today, 1), 'yyyy-MM-dd');
        dateTo = format(today, 'yyyy-MM-dd');
        break;
      case 'last-3':
        dateFrom = format(subMonths(today, 3), 'yyyy-MM-dd');
        dateTo = format(today, 'yyyy-MM-dd');
        break;
      case 'this-year':
        dateFrom = format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd');
        dateTo = format(today, 'yyyy-MM-dd');
        break;
      case 'all-time':
        dateFrom = '2020-01-01';
        dateTo = format(today, 'yyyy-MM-dd');
        break;
    }

    setReportFilters({ ...reportFilters, dateFrom, dateTo });
  };

  const DONUT_COLORS = [
    '#3b82f6', '#8b5cf6', '#6366f1', '#06b6d4', '#10b981',
    '#f43f5e', '#f59e0b', '#14b8a6', '#a855f7', '#ec4899',
  ];

  const donutEntries = Object.entries(analytics.expenseByCategory)
    .sort((a, b) => b[1] - a[1]);

  const donutChartData = {
    labels: donutEntries.map(([name]) => name),
    datasets: [{
      data: donutEntries.map(([, value]) => value),
      backgroundColor: DONUT_COLORS.slice(0, donutEntries.length),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const donutOptions = {
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Rp ${ctx.parsed.toLocaleString('id-ID')}`,
        },
      },
    },
  };

  const lineChartData = {
    labels: trends.months,
    datasets: [
      {
        label: 'Income',
        data: trends.incomeData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#10b981',
      },
      {
        label: 'Expense',
        data: trends.expenseData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#ef4444',
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { family: 'Inter' }, boxWidth: 12, padding: 16 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: Rp ${(ctx.parsed.y / 1000000).toFixed(1)}M`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          font: { family: 'Inter', size: 11 },
          callback: (v) => `${(v / 1000000).toFixed(0)}M`,
        },
      },
    },
  };

  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const date = subMonths(new Date(), i);
    monthOptions.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy')
    });
  }

  // Group accounts by purpose for the accounts tab
  const accountsByPurpose = accounts.reduce((groups, acc) => {
    if (!groups[acc.purpose]) groups[acc.purpose] = [];
    groups[acc.purpose].push(acc.name);
    return groups;
  }, {});

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>📊 Analytics</h1>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="month-selector"
        >
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
          <span>Loading analytics…</span>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <>
              <div className="summary-card">
                <h2>💰 Monthly Summary</h2>
                <div className="summary-grid">
                  <div className="summary-item">
                    <div className="summary-label">Income</div>
                    <div className="summary-value positive">
                      Rp {analytics.monthIncome.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Expense</div>
                    <div className="summary-value negative">
                      Rp {analytics.monthExpense.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Net Cashflow</div>
                    <div className={`summary-value ${analytics.netCashflow >= 0 ? 'positive' : 'negative'}`}>
                      {analytics.netCashflow >= 0 ? '+' : ''}Rp {Math.abs(analytics.netCashflow).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Saving Rate</div>
                    <div className="summary-value">
                      {analytics.savingRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">MoM Change</div>
                    <div className={`summary-value ${analytics.momChange <= 0 ? 'positive' : 'negative'}`}>
                      {analytics.momChange > 0 ? '+' : ''}{analytics.momChange.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="breakdown-card">
                <h2>Expense Breakdown</h2>
                {donutEntries.length > 0 ? (
                  <>
                    <div className="donut-chart-wrapper">
                      <Doughnut data={donutChartData} options={donutOptions} />
                    </div>
                    <div className="category-list">
                      {donutEntries.map(([name, value], i) => {
                        const percentage = (value / analytics.monthExpense * 100).toFixed(1);
                        return (
                          <div key={name} className="category-item">
                            <div className="category-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                            <div className="category-info">
                              <div className="category-name">{name}</div>
                              <div className="category-amount">Rp {value.toLocaleString('id-ID')}</div>
                            </div>
                            <div className="category-percent">{percentage}%</div>
                            <div className="category-bar">
                              <div className="category-bar-fill" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="no-data">No expense data for this month</div>
                )}
              </div>

              <div className="allocation-card">
                <h2>🏦 Asset Allocation</h2>
                <div className="allocation-total">
                  Total Net Worth: <strong>Rp {analytics.totalNetWorth.toLocaleString('id-ID')}</strong>
                </div>
                <div className="allocation-list">
                  {Object.entries(analytics.accountBalances).map(([purpose, amount]) => {
                    const percentage = analytics.totalNetWorth > 0
                      ? (amount / analytics.totalNetWorth * 100).toFixed(1)
                      : 0;
                    return (
                      <div key={purpose} className="allocation-item">
                        <div className="allocation-header">
                          <span className="allocation-label">{purpose}</span>
                          <span className="allocation-amount">
                            Rp {amount.toLocaleString('id-ID')} ({percentage}%)
                          </span>
                        </div>
                        <div className="allocation-bar">
                          <div
                            className="allocation-bar-fill"
                            style={{ width: `${Math.abs(percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="health-card">
                <h2>💪 Financial Health</h2>
                <div className="health-metrics">
                  <div className="health-item">
                    <div className="health-label">Cashflow Health</div>
                    <div className="health-score">
                      <div className="health-bar">
                        <div
                          className={`health-bar-fill ${analytics.cashflowHealth >= 70 ? 'good' : analytics.cashflowHealth >= 40 ? 'warning' : 'danger'}`}
                          style={{ width: `${analytics.cashflowHealth}%` }}
                        ></div>
                      </div>
                      <span className="health-value">{analytics.cashflowHealth.toFixed(0)}/100</span>
                    </div>
                  </div>
                  <div className="health-item">
                    <div className="health-label">Expense Diversification</div>
                    <div className="health-score">
                      <div className="health-bar">
                        <div
                          className={`health-bar-fill ${analytics.expenseStability >= 70 ? 'good' : analytics.expenseStability >= 40 ? 'warning' : 'danger'}`}
                          style={{ width: `${analytics.expenseStability}%` }}
                        ></div>
                      </div>
                      <span className="health-value">{analytics.expenseStability.toFixed(0)}/100</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="top-expenses-card">
                <h2>Top Expenses</h2>
                {analytics.topExpenses.length > 0 ? (
                  <div className="top-expenses-list">
                    {analytics.topExpenses.slice(0, 5).map((exp, idx) => {
                      const maxAmount = analytics.topExpenses[0].amount;
                      const barWidth = ((exp.amount / maxAmount) * 100).toFixed(1);
                      const pct = analytics.monthExpense > 0
                        ? ((exp.amount / analytics.monthExpense) * 100).toFixed(0)
                        : 0;
                      return (
                        <div key={idx} className="top-expense-item">
                          <div className="top-expense-bar" style={{ width: `${barWidth}%` }} />
                          <div className="top-expense-content">
                            <span className="top-expense-label">
                              {exp.category}{exp.note ? ` · ${exp.note}` : ''}
                            </span>
                            <span className="top-expense-amount">
                              Rp {exp.amount.toLocaleString('id-ID')} · {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-data">No expense data for this month</div>
                )}
              </div>
            </>
          )}

          {activeTab === 'accounts' && (
            <>
              <div className="accounts-balance-card">
                <h2>🏦 Account Balances</h2>

                {Object.entries(accountsByPurpose).map(([purpose, accountNames]) => {
                  const purposeTotal = accountNames.reduce((sum, acc) =>
                    sum + (accountsData.balances[acc] || 0), 0
                  );

                  return (
                    <div key={purpose} className="purpose-section">
                      <div className="purpose-header">
                        <span className="purpose-name">{purpose}</span>
                        <span className="purpose-total">
                          Rp {purposeTotal.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="accounts-list">
                        {accountNames.map(account => {
                          const balance = accountsData.balances[account] || 0;
                          const percentage = purposeTotal > 0 ? (balance / purposeTotal * 100) : 0;

                          return (
                            <div
                              key={account}
                              className="account-item"
                              onClick={() => setAccountsData({
                                ...accountsData,
                                selectedAccount: account
                              })}
                            >
                              <div className="account-info">
                                <span className="account-name">{account}</span>
                                <span className="account-balance">
                                  Rp {balance.toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="account-bar">
                                <div
                                  className="account-bar-fill"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="transfers-card">
                <h2>🔄 Recent Transfers</h2>
                <div className="transfers-list">
                  {accountsData.recentTransfers.length > 0 ? (
                    accountsData.recentTransfers.map((transfer, idx) => (
                      <div key={idx} className="transfer-item">
                        <div className="transfer-date">
                          {format(new Date(transfer.date), 'MMM dd, yyyy')}
                        </div>
                        <div className="transfer-flow">
                          <span className="transfer-from">{transfer.from}</span>
                          <span className="transfer-arrow">→</span>
                          <span className="transfer-to">{transfer.to}</span>
                        </div>
                        <div className="transfer-details">
                          <span className="transfer-amount">
                            Rp {transfer.amount.toLocaleString('id-ID')}
                          </span>
                          {transfer.note && (
                            <span className="transfer-note">{transfer.note}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">No transfers found</div>
                  )}
                </div>
              </div>

              <div className="activity-card">
                <h2>📊 This Month Activity</h2>
                <div className="activity-grid">
                  <div className="activity-item">
                    <div className="activity-icon">🏆</div>
                    <div className="activity-content">
                      <div className="activity-label">Most Used Account</div>
                      <div className="activity-value">
                        {accountsData.activityStats.mostUsed.account || 'N/A'}
                      </div>
                      <div className="activity-subtext">
                        {accountsData.activityStats.mostUsed.count} transactions
                      </div>
                    </div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">🔄</div>
                    <div className="activity-content">
                      <div className="activity-label">Top Transfer Route</div>
                      <div className="activity-value">
                        {accountsData.activityStats.topTransferRoute.from &&
                          accountsData.activityStats.topTransferRoute.to ? (
                          `${accountsData.activityStats.topTransferRoute.from} → ${accountsData.activityStats.topTransferRoute.to}`
                        ) : 'N/A'}
                      </div>
                      <div className="activity-subtext">
                        {accountsData.activityStats.topTransferRoute.count} times
                      </div>
                    </div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">⚠️</div>
                    <div className="activity-content">
                      <div className="activity-label">Lowest Balance</div>
                      <div className="activity-value">
                        {accountsData.activityStats.lowestBalance.account || 'N/A'}
                      </div>
                      <div className="activity-subtext">
                        Rp {(accountsData.activityStats.lowestBalance.amount || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {accountsData.selectedAccount && (
                <div className="account-modal-overlay" onClick={() => setAccountsData({
                  ...accountsData,
                  selectedAccount: null
                })}>
                  <div className="account-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>💳 {accountsData.selectedAccount}</h3>
                      <button
                        className="close-btn"
                        onClick={() => setAccountsData({
                          ...accountsData,
                          selectedAccount: null
                        })}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="modal-content">
                      <div className="modal-balance">
                        <div className="modal-label">Current Balance</div>
                        <div className="modal-value">
                          Rp {(accountsData.balances[accountsData.selectedAccount] || 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="modal-info">
                        Click History tab to see all transactions for this account
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'trends' && (
            <>
              <div className="trend-card">
                <h2>6-Month Trend</h2>
                <div className="line-chart-wrapper">
                  <Line data={lineChartData} options={lineOptions} />
                </div>
              </div>

              <div className="weekly-card">
                <h2>📅 Weekly Breakdown - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</h2>
                <div className="weekly-list">
                  {trends.weeklyData.map((amount, idx) => (
                    <div key={idx} className="week-item">
                      <div className="week-label">Week {idx + 1}</div>
                      <div className="week-bar-container">
                        <div
                          className="week-bar"
                          style={{
                            width: `${trends.weeklyData.length > 0 ? (amount / Math.max(...trends.weeklyData) * 100) : 0}%`
                          }}
                        ></div>
                      </div>
                      <div className="week-amount">
                        Rp {amount.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="comparison-card">
                <h2>🔄 Month Comparison</h2>
                <div className="comparison-grid">
                  <div className="comparison-item">
                    <div className="comparison-label">Expense Change</div>
                    <div className={`comparison-value ${analytics.momChange <= 0 ? 'positive' : 'negative'}`}>
                      {analytics.momChange > 0 ? '+' : ''}{analytics.momChange.toFixed(1)}%
                    </div>
                  </div>
                  <div className="comparison-item">
                    <div className="comparison-label">Saving Rate</div>
                    <div className="comparison-value">
                      {analytics.savingRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="comparison-item">
                    <div className="comparison-label">Net Cashflow</div>
                    <div className={`comparison-value ${analytics.netCashflow >= 0 ? 'positive' : 'negative'}`}>
                      {analytics.netCashflow >= 0 ? '+' : ''}Rp {Math.abs(analytics.netCashflow / 1000000).toFixed(1)}M
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'budget' && (
            <>
              {(() => {
                const budgetData = getBudgetByCategory();
                const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
                const totalSpent = analytics.monthExpense;
                const remaining = totalBudget - totalSpent;

                return (
                  <>
                    <div className="budget-header-card">
                      <div className="budget-header-top">
                        <h2>Budget - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</h2>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate('/settings?tab=budget')}
                        >
                          Kelola Budget
                        </button>
                      </div>
                      {totalBudget > 0 && (
                        <div className="budget-summary">
                          <div className="summary-row">
                            <span className="summary-label">Total Budget:</span>
                            <span className="summary-value">Rp {totalBudget.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Total Pengeluaran:</span>
                            <span className="summary-value negative">Rp {totalSpent.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Sisa:</span>
                            <span className={`summary-value ${remaining >= 0 ? 'positive' : 'negative'}`}>
                              {remaining >= 0 ? '+' : ''}Rp {Math.abs(remaining).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="budget-categories-card">
                      <h2>Per Kategori</h2>
                      {budgetData.length === 0 && (
                        <div className="no-data">Tidak ada pengeluaran bulan ini</div>
                      )}
                      <div className="budget-cat-list">
                        {budgetData.map(b => (
                          <div key={b.name} className="budget-cat-item">
                            <div className="budget-cat-top">
                              <span className="budget-cat-name">{b.name}</span>
                              <span className={`budget-cat-status ${b.status}`}>
                                {b.status === 'over' ? 'Melebihi' : b.status === 'warning' ? 'Hampir' : b.status === 'no-budget' ? '—' : 'Aman'}
                              </span>
                            </div>
                            <div className="budget-cat-amounts">
                              <span className="budget-cat-actual">
                                Rp {b.actual.toLocaleString('id-ID')}
                              </span>
                              {b.budget > 0 && (
                                <span className="budget-cat-limit">
                                  / Rp {b.budget.toLocaleString('id-ID')}
                                </span>
                              )}
                            </div>
                            {b.budget > 0 && (
                              <div className="budget-cat-bar">
                                <div
                                  className={`budget-cat-fill ${b.status}`}
                                  style={{ width: `${Math.min(b.percentage, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {activeTab === 'reports' && (
            <>
              <div className="reports-card">
                <h2>📄 Export Reports</h2>

                <div className="report-filters">
                  <div className="filter-group">
                    <label>Date Range</label>
                    <div className="date-inputs">
                      <input
                        type="date"
                        value={reportFilters.dateFrom}
                        onChange={(e) => setReportFilters({ ...reportFilters, dateFrom: e.target.value })}
                      />
                      <span>to</span>
                      <input
                        type="date"
                        value={reportFilters.dateTo}
                        onChange={(e) => setReportFilters({ ...reportFilters, dateTo: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="filter-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={reportFilters.account !== 'All'}
                        onChange={(e) => setReportFilters({
                          ...reportFilters,
                          account: e.target.checked ? (accounts[0]?.name || 'All') : 'All'
                        })}
                      />
                      Filter by Account
                    </label>
                    {reportFilters.account !== 'All' && (
                      <select
                        value={reportFilters.account}
                        onChange={(e) => setReportFilters({ ...reportFilters, account: e.target.value })}
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.name}>{acc.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="filter-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={reportFilters.flowType !== 'All'}
                        onChange={(e) => setReportFilters({
                          ...reportFilters,
                          flowType: e.target.checked ? 'Income' : 'All'
                        })}
                      />
                      Filter by Type
                    </label>
                    {reportFilters.flowType !== 'All' && (
                      <select
                        value={reportFilters.flowType}
                        onChange={(e) => setReportFilters({ ...reportFilters, flowType: e.target.value })}
                      >
                        <option value="Income">Income</option>
                        <option value="Expense">Expense</option>
                        <option value="Transfer">Transfer</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="export-buttons">
                  <button className="export-btn primary" onClick={generateReport}>
                    📊 Generate Summary Report
                  </button>
                  <button className="export-btn secondary" onClick={exportToCSV}>
                    📥 Export Transactions (CSV)
                  </button>
                </div>
              </div>

              <div className="quick-reports-card">
                <h2>📊 Quick Reports</h2>
                <div className="quick-reports-grid">
                  <button className="quick-report-btn" onClick={() => quickReport('this-month')}>
                    📅 This Month
                    <span className="quick-report-desc">{format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</span>
                  </button>
                  <button className="quick-report-btn" onClick={() => quickReport('last-30')}>
                    🗓️ Last 30 Days
                    <span className="quick-report-desc">Rolling month</span>
                  </button>
                  <button className="quick-report-btn" onClick={() => quickReport('last-3')}>
                    📆 Last 3 Months
                    <span className="quick-report-desc">Quarterly view</span>
                  </button>
                  <button className="quick-report-btn" onClick={() => quickReport('this-year')}>
                    🗓️ This Year
                    <span className="quick-report-desc">{new Date().getFullYear()}</span>
                  </button>
                  <button className="quick-report-btn" onClick={() => quickReport('all-time')}>
                    ♾️ All Time
                    <span className="quick-report-desc">Complete history</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'ai' && (
            <AIAdvisor
              analytics={analytics}
              trends={trends}
              selectedMonth={selectedMonth}
            />
          )}
        </>
      )}
    </div>
  );
}

export default AnalyticsPage;
