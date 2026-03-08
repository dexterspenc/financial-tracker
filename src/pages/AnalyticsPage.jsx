import { useState, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
import { APPS_SCRIPT_URL, ACCOUNTS } from '../config';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import AnalyticsTabs from '../components/AnalyticsTabs.jsx';
import './AnalyticsPage.css';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [analytics, setAnalytics] = useState({
    monthIncome: 0,
    monthExpense: 0,
    netCashflow: 0,
    savingRate: 0,
    momChange: 0,
    expenseByCategory: {},
    categoryPurposes: {},  // ADD THIS
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
  const [budgets, setBudgets] = useState({});
  const [editingBudget, setEditingBudget] = useState(null);
  const [expandedPurpose, setExpandedPurpose] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportFilters, setReportFilters] = useState({
    dateFrom: format(new Date(selectedMonth + '-01'), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    account: 'All',
    category: 'All',
    flowType: 'All'
  });

  useEffect(() => {
    fetchAnalytics();
  }, [selectedMonth]);

  useEffect(() => {
    if (activeTab === 'accounts') {
      fetchAccountsData();
    }
    if (activeTab === 'budget') {
      loadBudgets();
    }
  }, [activeTab, selectedMonth]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(APPS_SCRIPT_URL);
      const data = await response.json();
      const rows = data.values || [];

      if (rows.length > 1) {
        calculateAnalytics(rows);
        const trendsData = calculateTrends(rows);
        setTrends(trendsData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountsData = async () => {
    try {
      const balanceResponse = await fetch(`${APPS_SCRIPT_URL}?sheet=Account_Balance`);
      const balanceData = await balanceResponse.json();
      const balanceRows = balanceData.values || [];

      const txnResponse = await fetch(APPS_SCRIPT_URL);
      const txnData = await txnResponse.json();
      const txnRows = txnData.values || [];

      calculateAccountsData(balanceRows, txnRows);
    } catch (error) {
      console.error('Error fetching accounts data:', error);
    }
  };

  const calculateAnalytics = (rows) => {
    const currentMonth = selectedMonth;
    const lastMonth = format(subMonths(new Date(selectedMonth + '-01'), 1), 'yyyy-MM');

    let monthIncome = 0;
    let monthExpense = 0;
    let lastMonthExpense = 0;
    const expenseByCategory = {};
    const transactions = [];
    const categoryPurposes = {}; // Track which purpose each category belongs to
    const accountBalances = {
      Living: 0,
      Playing: 0,
      Saving: 0,
      Investment: 0
    };

    for (let i = 1; i < rows.length; i++) {
      const txnMonth = rows[i][2];
      const flowType = rows[i][6];
      const debit = parseFloat(rows[i][7]) || 0;
      const credit = parseFloat(rows[i][8]) || 0;
      const category = rows[i][5];
      const accountPurpose = rows[i][4];

      if (txnMonth && txnMonth.toString().startsWith(currentMonth)) {
        if (flowType === 'Income') {
          monthIncome += debit;
        }
        if (flowType === 'Expense') {
          monthExpense += credit;

          if (category) {
            expenseByCategory[category] = (expenseByCategory[category] || 0) + credit;

            // Store category purpose mapping (we'll get this from transactions)
            const accountPurpose = rows[i][4];
            if (accountPurpose && !categoryPurposes[category]) {
              categoryPurposes[category] = accountPurpose;
            }
          }

          transactions.push({
            category,
            amount: credit,
            note: rows[i][11],
            date: rows[i][1]
          });
        }
      }

      if (txnMonth && txnMonth.toString().startsWith(lastMonth)) {
        if (flowType === 'Expense') {
          lastMonthExpense += credit;
        }
      }

      if (accountPurpose) {
        accountBalances[accountPurpose] = (accountBalances[accountPurpose] || 0) + debit - credit;
      }
    }

    const netCashflow = monthIncome - monthExpense;
    const savingRate = monthIncome > 0 ? ((netCashflow / monthIncome) * 100) : 0;
    const momChange = lastMonthExpense > 0 ? (((monthExpense - lastMonthExpense) / lastMonthExpense) * 100) : 0;

    const topExpenses = transactions
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

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
      categoryPurposes,  // ADD THIS
      topExpenses,
      accountBalances,
      totalNetWorth,
      expenseStability,
      cashflowHealth
    });
  };

  const calculateTrends = (rows) => {
    const months = [];
    const monthlyData = {};
    const weeklyData = [0, 0, 0, 0, 0];

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM yyyy');
      months.push(monthKey);
      monthlyData[monthKey] = {
        label: monthLabel,
        income: 0,
        expense: 0
      };
    }

    for (let i = 1; i < rows.length; i++) {
      const txnMonth = rows[i][2]?.toString().substring(0, 7);
      const flowType = rows[i][6];
      const debit = parseFloat(rows[i][7]) || 0;
      const credit = parseFloat(rows[i][8]) || 0;
      const txnDate = rows[i][1];

      if (monthlyData[txnMonth]) {
        if (flowType === 'Income') {
          monthlyData[txnMonth].income += debit;
        }
        if (flowType === 'Expense') {
          monthlyData[txnMonth].expense += credit;
        }
      }

      if (txnMonth === selectedMonth && txnDate) {
        const date = new Date(txnDate);
        const day = date.getDate();
        const weekIndex = Math.floor((day - 1) / 7);

        if (weekIndex < 5 && flowType === 'Expense') {
          weeklyData[weekIndex] += credit;
        }
      }
    }

    return {
      months: months.map(m => monthlyData[m].label),
      incomeData: months.map(m => monthlyData[m].income),
      expenseData: months.map(m => monthlyData[m].expense),
      weeklyData
    };
  };

  const calculateAccountsData = (balanceRows, txnRows) => {
    const balances = {};

    for (let i = 1; i < balanceRows.length; i++) {
      const accountName = balanceRows[i][0];
      const balance = parseFloat(balanceRows[i][5]) || 0;

      if (accountName) {
        balances[accountName] = balance;
      }
    }

    const allTransfers = [];
    const seenPairs = new Set();

    for (let i = txnRows.length - 1; i > 0; i--) {
      const txnType = txnRows[i][9];
      const transferPairId = txnRows[i][10];
      const txnDate = txnRows[i][1];

      if (txnType === 'Transfer' && transferPairId && !seenPairs.has(transferPairId)) {
        seenPairs.add(transferPairId);

        const creditRow = txnRows.find(row =>
          row[10] === transferPairId && row[8] && parseFloat(row[8]) > 0
        );

        const debitRow = txnRows.find(row =>
          row[10] === transferPairId && row[7] && parseFloat(row[7]) > 0
        );

        if (creditRow && debitRow) {
          allTransfers.push({
            date: creditRow[1],
            from: creditRow[3],
            to: debitRow[3],
            amount: parseFloat(creditRow[8]) || 0,
            note: creditRow[11],
            pairId: transferPairId
          });

          if (allTransfers.length >= 10) break;
        }
      }
    }

    const transfers = allTransfers;

    const accountUsage = {};
    const transferRoutes = {};

    for (let i = 1; i < txnRows.length; i++) {
      const txnMonth = txnRows[i][2]?.toString().substring(0, 7);
      const account = txnRows[i][3];
      const txnType = txnRows[i][9];
      const transferPairId = txnRows[i][10];

      if (txnMonth === selectedMonth) {
        accountUsage[account] = (accountUsage[account] || 0) + 1;

        if (txnType === 'Transfer' && transferPairId && txnRows[i][8]) {
          const pairTxn = txnRows.find((row, idx) =>
            idx !== i && row[10] === transferPairId
          );
          if (pairTxn) {
            const route = `${account} → ${pairTxn[3]}`;
            transferRoutes[route] = (transferRoutes[route] || 0) + 1;
          }
        }
      }
    }

    const mostUsed = Object.entries(accountUsage).reduce((max, [acc, count]) =>
      count > max.count ? { account: acc, count } : max
      , { account: '', count: 0 });

    const topRoute = Object.entries(transferRoutes).reduce((max, [route, count]) =>
      count > max.count ? { route, count } : max
      , { route: '', count: 0 });

    const [from = '', to = ''] = topRoute.route.split(' → ');

    const lowestBalance = Object.entries(balances).reduce((min, [acc, amount]) =>
      amount < min.amount ? { account: acc, amount } : min
      , { account: '', amount: Infinity });

    setAccountsData({
      balances,
      recentTransfers: transfers,
      activityStats: {
        mostUsed,
        topTransferRoute: { from, to, count: topRoute.count },
        lowestBalance: lowestBalance.amount !== Infinity ? lowestBalance : { account: '', amount: 0 }
      },
      selectedAccount: null
    });
  };

  const loadBudgets = async () => {
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?sheet=Budget_Master`);
      const data = await response.json();
      const rows = data.values || [];

      const budgetMap = {};
      const currentMonth = selectedMonth;

      for (let i = 1; i < rows.length; i++) {
        const monthValue = rows[i][0];
        const level = rows[i][1];
        const name = rows[i][2];
        const amount = parseFloat(rows[i][3]) || 0;

        // Convert month to YYYY-MM format for comparison
        let month = '';
        if (monthValue) {
          if (typeof monthValue === 'string') {
            // If it's already a string like "2026-02" or "2026-02-01"
            month = monthValue.substring(0, 7);
          } else if (monthValue instanceof Date) {
            // If it's a Date object
            month = format(monthValue, 'yyyy-MM');
          } else {
            // Try to parse it
            try {
              month = format(new Date(monthValue), 'yyyy-MM');
            } catch (e) {
              console.error('Could not parse month:', monthValue);
            }
          }
        }

        if (month === currentMonth && level === 'Purpose' && name) {
          budgetMap[name] = amount;
        }
      }

      setBudgets(budgetMap);
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const saveBudget = async (purposeName, amount) => {
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_budget',
          month: selectedMonth,
          level: 'Purpose',
          name: purposeName,
          amount: parseFloat(amount) || 0
        })
      });

      const result = await response.json();

      if (result.success) {
        setBudgets({
          ...budgets,
          [purposeName]: parseFloat(amount) || 0
        });
        setEditingBudget(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('❌ Failed to save budget');
    }
  };

  const copyFromLastMonth = async () => {
    const lastMonth = format(subMonths(new Date(selectedMonth + '-01'), 1), 'yyyy-MM');

    if (!window.confirm(`Copy budgets from ${format(new Date(lastMonth + '-01'), 'MMMM yyyy')}?`)) {
      return;
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'copy_budget',
          fromMonth: lastMonth,
          toMonth: selectedMonth
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Copied ${result.count} budgets from ${format(new Date(lastMonth + '-01'), 'MMMM yyyy')}`);
        await loadBudgets();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error copying budgets:', error);
      alert('❌ Failed to copy budgets');
    }
  };

  const calculateBudgetByPurpose = () => {
    const purposes = ['Living', 'Playing', 'Saving', 'Investment'];

    return purposes.map(purpose => {
      const budget = budgets[purpose] || 0;
      let actualSpent = 0;
      const categoryBreakdown = [];

      // DIFFERENT LOGIC PER PURPOSE TYPE
      if (purpose === 'Living' || purpose === 'Playing') {
        // EXPENSE-BASED: Sum expenses from matching categories
        Object.entries(analytics.expenseByCategory).forEach(([category, amount]) => {
          const categoryPurpose = analytics.categoryPurposes[category];

          if (categoryPurpose === purpose) {
            actualSpent += amount;
            categoryBreakdown.push({
              name: category,
              amount: amount,
              percentage: 0
            });
          }
        });

        // Calculate percentages
        categoryBreakdown.forEach(cat => {
          cat.percentage = actualSpent > 0 ? (cat.amount / actualSpent * 100) : 0;
        });

      } else if (purpose === 'Saving') {
        // SAVINGS-BASED: Calculate net transfers to Saving accounts
        // We need to check Transfer transactions to/from Saving accounts
        // For now, show message that this is work in progress
        actualSpent = 0; // TODO: Calculate from transfers

        categoryBreakdown.push({
          name: 'Net Transfers to Saving Accounts',
          amount: 0,
          percentage: 100,
          note: '💡 Calculated from transfers to Blu, SeaBank, etc.'
        });

      } else if (purpose === 'Investment') {
        // INVESTMENT-BASED: Calculate Investment Buy - Investment Sell
        const investmentBuy = analytics.expenseByCategory['Investment Buy'] || 0;
        const investmentSell = analytics.expenseByCategory['Investment Sell'] || 0;

        actualSpent = investmentBuy; // Net investment (buy - sell would need transfer tracking)

        if (investmentBuy > 0) {
          categoryBreakdown.push({
            name: 'Investment Buy',
            amount: investmentBuy,
            percentage: 100
          });
        }
        if (investmentSell > 0) {
          categoryBreakdown.push({
            name: 'Investment Sell',
            amount: -investmentSell,
            percentage: 0,
            note: '(Selling reduces investment)'
          });
        }
      }

      // Calculate status and colors
      const percentage = budget > 0 ? (actualSpent / budget * 100) : 0;
      const isExpensePurpose = (purpose === 'Living' || purpose === 'Playing');
      const isSavingPurpose = (purpose === 'Saving' || purpose === 'Investment');

      // Determine if over/under budget
      let status = 'good';
      let statusText = '';

      if (budget === 0) {
        status = 'no-budget';
        statusText = 'No budget set';
      } else if (isExpensePurpose) {
        // Expense: Under budget = good, Over budget = bad
        if (percentage <= 100) {
          status = 'good';
          statusText = percentage > 80 ? 'On track ✅' : 'Great! ✅';
        } else {
          status = 'over';
          statusText = `Over ${(percentage - 100).toFixed(0)}% ⚠️`;
        }
      } else if (isSavingPurpose) {
        // Saving: Under target = bad, Meet/exceed target = good
        if (percentage < 80) {
          status = 'under';
          statusText = `Only ${percentage.toFixed(0)}% ⚠️`;
        } else if (percentage < 100) {
          status = 'warning';
          statusText = `${percentage.toFixed(0)}% (almost!) 💪`;
        } else {
          status = 'good';
          statusText = `${percentage.toFixed(0)}% - Great! ✅`;
        }
      }

      return {
        name: purpose,
        budget,
        actual: actualSpent,
        percentage,
        remaining: budget - actualSpent,
        status,
        statusText,
        isExpensePurpose,
        isSavingPurpose,
        categories: categoryBreakdown.sort((a, b) => b.amount - a.amount)
      };
    });
  };

  const exportToCSV = async () => {
    try {
      // Fetch all transactions
      const response = await fetch(APPS_SCRIPT_URL);
      const data = await response.json();
      const rows = data.values || [];

      if (rows.length < 2) {
        alert('No data to export!');
        return;
      }

      // Filter transactions based on filters
      const filteredRows = [];
      filteredRows.push(rows[0]); // Header row

      for (let i = 1; i < rows.length; i++) {
        const txnDate = rows[i][1];
        const account = rows[i][3];
        const category = rows[i][5];
        const flowType = rows[i][6];

        // Apply date filter
        if (txnDate < reportFilters.dateFrom || txnDate > reportFilters.dateTo) {
          continue;
        }

        // Apply account filter
        if (reportFilters.account !== 'All' && account !== reportFilters.account) {
          continue;
        }

        // Apply category filter
        if (reportFilters.category !== 'All' && category !== reportFilters.category) {
          continue;
        }

        // Apply flow type filter
        if (reportFilters.flowType !== 'All' && flowType !== reportFilters.flowType) {
          continue;
        }

        filteredRows.push(rows[i]);
      }

      if (filteredRows.length < 2) {
        alert('No transactions match your filters!');
        return;
      }

      // Convert to CSV
      const csvContent = filteredRows.map(row => {
        return row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma
          const cellStr = (cell || '').toString();
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',');
      }).join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${reportFilters.dateFrom}_to_${reportFilters.dateTo}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`✅ Exported ${filteredRows.length - 1} transactions!`);

    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Export failed!');
    }
  };

  const generateReport = () => {
    // Prepare report data
    const reportData = {
      month: format(new Date(selectedMonth + '-01'), 'MMMM yyyy'),
      period: `${reportFilters.dateFrom} to ${reportFilters.dateTo}`,

      // Summary
      totalIncome: analytics.monthIncome,
      totalExpense: analytics.monthExpense,
      netCashflow: analytics.netCashflow,
      savingRate: analytics.savingRate,

      // Breakdown
      expenseByCategory: analytics.expenseByCategory,

      // Budget
      budgetPerformance: calculateBudgetByPurpose(),

      // Top expenses
      topExpenses: analytics.topExpenses,

      // Health
      cashflowHealth: analytics.cashflowHealth,
      expenseStability: analytics.expenseStability,

      // Trends
      momChange: analytics.momChange
    };

    // Generate HTML report
    const reportHTML = generateReportHTML(reportData);

    // Open in new window
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
  };

  const generateReportHTML = (data) => {
    // Calculate insights
    const insights = generateInsights(data);

    // Expense chart data (for simple bar chart)
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
            <th>Purpose</th>
            <th>Budget</th>
            <th>Actual</th>
            <th>Difference</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.budgetPerformance.map(purpose => {
      const diff = purpose.actual - purpose.budget;
      const diffText = diff >= 0 ? `+Rp ${diff.toLocaleString('id-ID')}` : `Rp ${Math.abs(diff).toLocaleString('id-ID')}`;
      return `
              <tr>
                <td><strong>${purpose.name}</strong></td>
                <td>Rp ${purpose.budget.toLocaleString('id-ID')}</td>
                <td>Rp ${purpose.actual.toLocaleString('id-ID')}</td>
                <td>${diffText}</td>
                <td><span class="status-badge ${purpose.status}">${purpose.statusText}</span></td>
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

    // Cashflow insight
    if (data.netCashflow > 0) {
      insights.push(`Positive cashflow of Rp ${data.netCashflow.toLocaleString('id-ID')} - You're spending less than you earn! ✅`);
    } else {
      insights.push(`⚠️ Negative cashflow of Rp ${Math.abs(data.netCashflow).toLocaleString('id-ID')} - You're spending more than you earn. Consider reducing expenses.`);
    }

    // Saving rate insight
    if (data.savingRate >= 20) {
      insights.push(`Strong saving rate of ${data.savingRate.toFixed(1)}% - You're on track for financial goals! 💪`);
    } else if (data.savingRate >= 10) {
      insights.push(`Moderate saving rate of ${data.savingRate.toFixed(1)}% - Consider increasing savings for better financial health.`);
    } else {
      insights.push(`⚠️ Low saving rate of ${data.savingRate.toFixed(1)}% - Aim for at least 20% to build financial security.`);
    }

    // Budget performance
    const overBudget = data.budgetPerformance.filter(p => p.status === 'over' || p.status === 'under');
    if (overBudget.length > 0) {
      const names = overBudget.map(p => p.name).join(', ');
      insights.push(`⚠️ ${names} ${overBudget.length > 1 ? 'are' : 'is'} off-budget. Review and adjust spending or budget targets.`);
    } else {
      insights.push(`All budgets are on track! Great financial discipline! 🎯`);
    }

    // Top expense insight
    if (data.topExpenses.length > 0) {
      const topCategory = data.topExpenses[0].category;
      const topAmount = data.topExpenses[0].amount;
      const percentage = ((topAmount / data.totalExpense) * 100).toFixed(1);
      insights.push(`Biggest expense: ${topCategory} (Rp ${topAmount.toLocaleString('id-ID')}, ${percentage}% of total). Monitor this category closely.`);
    }

    // MoM change
    if (data.momChange > 10) {
      insights.push(`⚠️ Expenses increased ${data.momChange.toFixed(1)}% from last month. Identify the cause and control spending.`);
    } else if (data.momChange < -10) {
      insights.push(`✅ Expenses decreased ${Math.abs(data.momChange).toFixed(1)}% from last month. Great cost management!`);
    }

    // Diversification
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

    setReportFilters({
      ...reportFilters,
      dateFrom,
      dateTo
    });
  };

  const pieChartData = {
    labels: Object.keys(analytics.expenseByCategory),
    datasets: [{
      data: Object.values(analytics.expenseByCategory),
      backgroundColor: [
        '#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b',
        '#fa709a', '#fee140', '#30cfd0', '#a8edea', '#fed6e3'
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `Rp ${value.toLocaleString('id-ID')} (${percentage}%)`;
          }
        }
      }
    }
  };

  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const date = subMonths(new Date(), i);
    monthOptions.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy')
    });
  }

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
        <div className="loading">Loading analytics...</div>
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
                <h2>📊 Expense Breakdown</h2>
                <div className="breakdown-content">
                  <div className="chart-container">
                    {Object.keys(analytics.expenseByCategory).length > 0 ? (
                      <Pie data={pieChartData} options={chartOptions} />
                    ) : (
                      <div className="no-data">No expense data</div>
                    )}
                  </div>
                  <div className="category-list">
                    {Object.entries(analytics.expenseByCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, amount]) => {
                        const percentage = (amount / analytics.monthExpense * 100).toFixed(1);
                        return (
                          <div key={category} className="category-item">
                            <div className="category-info">
                              <div className="category-name">{category}</div>
                              <div className="category-amount">
                                Rp {amount.toLocaleString('id-ID')}
                              </div>
                            </div>
                            <div className="category-percent">{percentage}%</div>
                            <div className="category-bar">
                              <div
                                className="category-bar-fill"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
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
                <h2>🔥 Top 5 Expenses</h2>
                <div className="expenses-list">
                  {analytics.topExpenses.map((exp, idx) => (
                    <div key={idx} className="expense-item">
                      <div className="expense-rank">{idx + 1}</div>
                      <div className="expense-details">
                        <div className="expense-category">{exp.category}</div>
                        {exp.note && <div className="expense-note">{exp.note}</div>}
                      </div>
                      <div className="expense-amount">
                        Rp {exp.amount.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'accounts' && (
            <>
              <div className="accounts-balance-card">
                <h2>🏦 Account Balances</h2>

                {Object.entries(ACCOUNTS).map(([purpose, accounts]) => {
                  const purposeTotal = accounts.reduce((sum, acc) =>
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
                        {accounts.map(account => {
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
                <h2>📈 6-Month Trend</h2>
                <div className="line-chart-container">
                  <Line
                    data={{
                      labels: trends.months,
                      datasets: [
                        {
                          label: 'Income',
                          data: trends.incomeData,
                          borderColor: '#48bb78',
                          backgroundColor: 'rgba(72, 187, 120, 0.1)',
                          tension: 0.4,
                          fill: true
                        },
                        {
                          label: 'Expense',
                          data: trends.expenseData,
                          borderColor: '#f56565',
                          backgroundColor: 'rgba(245, 101, 101, 0.1)',
                          tension: 0.4,
                          fill: true
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                          callbacks: {
                            label: function (context) {
                              return `${context.dataset.label}: Rp ${context.parsed.y.toLocaleString('id-ID')}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function (value) {
                              return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
                            }
                          }
                        }
                      }
                    }}
                  />
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
              <div className="budget-header-card">
                <h2>💰 Budget - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</h2>
                <div className="budget-summary">
                  {(() => {
                    const totalBudget = Object.values(budgets).reduce((sum, val) => sum + val, 0);
                    const totalSpent = analytics.monthExpense;
                    const remaining = totalBudget - totalSpent;

                    return (
                      <>
                        <div className="summary-row">
                          <span className="summary-label">Total Budget:</span>
                          <span className="summary-value">Rp {totalBudget.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">Total Spent:</span>
                          <span className="summary-value negative">Rp {totalSpent.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">Remaining:</span>
                          <span className={`summary-value ${remaining >= 0 ? 'positive' : 'negative'}`}>
                            {remaining >= 0 ? '+' : ''}Rp {Math.abs(remaining).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button className="copy-budget-btn" onClick={copyFromLastMonth}>
                  📋 Copy from Last Month
                </button>
              </div>

              <div className="budget-purposes-card">
                <h2>📊 Budget by Purpose</h2>
                <div className="purposes-list">
                  {calculateBudgetByPurpose().map(purpose => {
                    const isExpanded = expandedPurpose === purpose.name;
                    const hasNoBudget = purpose.budget === 0;

                    return (
                      <div key={purpose.name} className="purpose-budget-item">
                        <div
                          className="purpose-budget-header"
                          onClick={() => setExpandedPurpose(isExpanded ? null : purpose.name)}
                        >
                          <div className="purpose-budget-info">
                            <div className="purpose-budget-name">
                              {purpose.name === 'Living' && '💰'}
                              {purpose.name === 'Playing' && '🎮'}
                              {purpose.name === 'Saving' && '💎'}
                              {purpose.name === 'Investment' && '📈'}
                              {' '}{purpose.name}
                              <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
                            </div>

                            {editingBudget === purpose.name ? (
                              <div className="inline-edit" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  placeholder="Budget amount"
                                  defaultValue={purpose.budget || ''}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      saveBudget(purpose.name, e.target.value);
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  className="save-btn"
                                  onClick={() => {
                                    const input = document.querySelector('.inline-edit input');
                                    saveBudget(purpose.name, input.value);
                                  }}
                                >
                                  ✓
                                </button>
                                <button
                                  className="cancel-btn"
                                  onClick={() => setEditingBudget(null)}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="purpose-budget-amounts">
                                <div className="budget-line">
                                  <span className="amount-label">Budget:</span>
                                  <span className="amount-value">
                                    {hasNoBudget ? 'Not set' : `Rp ${purpose.budget.toLocaleString('id-ID')}`}
                                  </span>
                                  <button
                                    className="edit-icon-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingBudget(purpose.name);
                                    }}
                                  >
                                    ✏️
                                  </button>
                                </div>
                                <div className="budget-line">
                                  <span className="amount-label">Spent:</span>
                                  <span className={`amount-value ${purpose.status === 'over' || purpose.status === 'under' ? 'over' : ''}`}>
                                    Rp {purpose.actual.toLocaleString('id-ID')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {!hasNoBudget && !editingBudget && (
                            <div className="purpose-progress-bar">
                              <div
                                className={`purpose-progress-fill ${purpose.status}`}
                                style={{ width: `${Math.min(purpose.percentage, 100)}%` }}
                              ></div>
                            </div>
                          )}

                          {!hasNoBudget && !editingBudget && (
                            <div className="purpose-percentage">
                              {purpose.percentage <= 100 ? (
                                `${purpose.percentage.toFixed(0)}%`
                              ) : (
                                `100% | ${purpose.statusText}`
                              )}
                            </div>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="purpose-categories">
                            <div className="categories-header">
                              📊 Category Breakdown (Actual Spending)
                            </div>
                            {purpose.categories.length > 0 ? (
                              purpose.categories.map(cat => (
                                <div key={cat.name} className="category-breakdown-item">
                                  <div className="category-breakdown-info">
                                    <span className="category-breakdown-name">{cat.name}</span>
                                    <span className="category-breakdown-amount">
                                      Rp {cat.amount.toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                  <div className="category-breakdown-bar">
                                    <div
                                      className="category-breakdown-fill"
                                      style={{ width: `${cat.percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className="category-breakdown-percent">
                                    {cat.percentage.toFixed(1)}%
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="no-data">No spending this month</div>
                            )}
                            <div className="category-budget-hint">
                              💡 Category budgets coming soon! For now, track at purpose level.
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
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
                          account: e.target.checked ? Object.values(ACCOUNTS).flat()[0] : 'All'
                        })}
                      />
                      Filter by Account
                    </label>
                    {reportFilters.account !== 'All' && (
                      <select
                        value={reportFilters.account}
                        onChange={(e) => setReportFilters({ ...reportFilters, account: e.target.value })}
                      >
                        {Object.values(ACCOUNTS).flat().map(acc => (
                          <option key={acc} value={acc}>{acc}</option>
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
                    <span className="quick-report-desc">2026</span>
                  </button>
                  <button className="quick-report-btn" onClick={() => quickReport('all-time')}>
                    ♾️ All Time
                    <span className="quick-report-desc">Complete history</span>
                  </button>
                </div>
              </div>
            </>
          )}

        </>
      )}
    </div>
  );
}

export default AnalyticsPage;