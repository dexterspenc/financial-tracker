import { useState, useRef, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
import { APPS_SCRIPT_URL } from '../config';
import './AIAdvisorWidget.css';

const QUICK_PROMPTS = [
  'Analisis pengeluaran bulan ini',
  'Kapan saya bisa capai target tabungan?',
  'Kategori apa yang paling boros?',
];

function buildAnalyticsContext(rows) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  let monthIncome = 0;
  let monthExpense = 0;
  const expenseByCategory = {};
  const topExpenses = [];
  const accountBalances = { Living: 0, Playing: 0, Saving: 0, Investment: 0 };

  const months = [];
  const monthlyData = {};
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const key = format(d, 'yyyy-MM');
    months.push(key);
    monthlyData[key] = { label: format(d, 'MMM yyyy'), income: 0, expense: 0 };
  }

  for (let i = 1; i < rows.length; i++) {
    const txnMonth = rows[i][2]?.toString().substring(0, 7);
    const flowType = rows[i][6];
    const debit = parseFloat(rows[i][7]) || 0;
    const credit = parseFloat(rows[i][8]) || 0;
    const category = rows[i][5];
    const accountPurpose = rows[i][4];

    if (txnMonth === currentMonth) {
      if (flowType === 'Income') monthIncome += debit;
      if (flowType === 'Expense') {
        monthExpense += credit;
        expenseByCategory[category] = (expenseByCategory[category] || 0) + credit;
        topExpenses.push({ category, amount: credit, note: rows[i][11] });
      }
    }

    if (accountPurpose && accountBalances[accountPurpose] !== undefined) {
      accountBalances[accountPurpose] += debit - credit;
    }

    if (monthlyData[txnMonth]) {
      if (flowType === 'Income') monthlyData[txnMonth].income += debit;
      if (flowType === 'Expense') monthlyData[txnMonth].expense += credit;
    }
  }

  const netCashflow = monthIncome - monthExpense;
  const savingRate = monthIncome > 0 ? (netCashflow / monthIncome) * 100 : 0;
  const totalNetWorth = Object.values(accountBalances).reduce((s, v) => s + v, 0);
  topExpenses.sort((a, b) => b.amount - a.amount);

  return JSON.stringify(
    {
      bulan: format(new Date(), 'MMMM yyyy'),
      ringkasan: {
        pemasukan: monthIncome,
        pengeluaran: monthExpense,
        cashflow_bersih: netCashflow,
        tingkat_tabungan_persen: parseFloat(savingRate.toFixed(1)),
      },
      pengeluaran_per_kategori: expenseByCategory,
      saldo_per_tujuan: accountBalances,
      total_kekayaan_bersih: totalNetWorth,
      pengeluaran_terbesar: topExpenses.slice(0, 5),
      tren_6_bulan: months.map((m) => ({
        bulan: monthlyData[m].label,
        pemasukan: monthlyData[m].income,
        pengeluaran: monthlyData[m].expense,
      })),
    },
    null,
    2
  );
}

function AIAdvisorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [analyticsContext, setAnalyticsContext] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && !analyticsContext) {
      fetchData();
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const response = await fetch(APPS_SCRIPT_URL);
      const data = await response.json();
      const rows = data.values || [];
      if (rows.length > 1) {
        setAnalyticsContext(buildAnalyticsContext(rows));
      }
    } catch (err) {
      console.error('AIAdvisorWidget: failed to fetch data', err);
    } finally {
      setDataLoading(false);
    }
  };

  const sendMessage = async (userText) => {
    if (!userText.trim() || loading) return;

    const userMessage = { role: 'user', content: userText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const context = analyticsContext || '(Data belum tersedia)';

      const apiMessages = updatedMessages.map((msg, idx) => {
        if (idx === 0) {
          return {
            role: 'user',
            content: `Data keuangan saya:\n\`\`\`json\n${context}\n\`\`\`\n\nPertanyaan: ${msg.content}`,
          };
        }
        return { role: msg.role, content: msg.content };
      });

      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system:
            'Kamu adalah financial advisor pribadi yang membantu menganalisis data keuangan pengguna. Data transaksi diberikan dalam format JSON. Jawab dalam Bahasa Indonesia, singkat dan actionable.',
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const aiText = data.content?.[0]?.text || '(Tidak ada respons)';
      setMessages((prev) => [...prev, { role: 'assistant', content: aiText }]);
    } catch (error) {
      console.error('AI Advisor error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Gagal mendapat respons: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Overlay to close panel on mobile tap-outside */}
      {isOpen && (
        <div className="widget-overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* Chat panel */}
      <div className={`widget-panel ${isOpen ? 'open' : ''}`}>
        <div className="widget-header">
          <div className="widget-header-info">
            <span className="widget-header-icon">🤖</span>
            <div>
              <div className="widget-header-title">AI Financial Advisor</div>
              <div className="widget-header-sub">
                {dataLoading ? 'Memuat data...' : 'Powered by Claude'}
              </div>
            </div>
          </div>
          <div className="widget-header-actions">
            {messages.length > 0 && (
              <button
                className="widget-clear-btn"
                onClick={() => setMessages([])}
                title="Clear chat"
              >
                🗑️
              </button>
            )}
            <button
              className="widget-close-btn"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="widget-messages">
          {messages.length === 0 ? (
            <div className="widget-empty">
              <div className="widget-empty-icon">💬</div>
              <p>Tanyakan apa saja tentang keuangan kamu!</p>
              {dataLoading && (
                <p className="widget-empty-sub">Sedang memuat data transaksi...</p>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`widget-bubble-row ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <span className="widget-avatar">🤖</span>
                )}
                <div className={`widget-bubble ${msg.role}`}>{msg.content}</div>
                {msg.role === 'user' && (
                  <span className="widget-avatar">👤</span>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="widget-bubble-row assistant">
              <span className="widget-avatar">🤖</span>
              <div className="widget-bubble assistant typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="widget-quick-prompts">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              className="widget-quick-btn"
              onClick={() => sendMessage(prompt)}
              disabled={loading || dataLoading}
            >
              {prompt}
            </button>
          ))}
        </div>

        <form className="widget-input-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="widget-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya tentang keuangan kamu..."
            disabled={loading || dataLoading}
          />
          <button
            type="submit"
            className="widget-send-btn"
            disabled={loading || dataLoading || !input.trim()}
          >
            ➤
          </button>
        </form>
      </div>

      {/* FAB toggle button */}
      <button
        className={`widget-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        title="AI Financial Advisor"
      >
        {isOpen ? '✕' : '🤖'}
      </button>
    </>
  );
}

export default AIAdvisorWidget;
