import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Bot, Send, Trash2 } from 'lucide-react';
import './AIAdvisor.css';

const QUICK_PROMPTS = [
  'Analisis pengeluaran bulan ini',
  'Kapan saya bisa capai target tabungan?',
  'Kategori apa yang paling boros?',
];

function AIAdvisor({ analytics, trends, selectedMonth }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => {
    const monthLabel = format(new Date(selectedMonth + '-01'), 'MMMM yyyy');
    return JSON.stringify(
      {
        bulan: monthLabel,
        ringkasan: {
          pemasukan: analytics.monthIncome,
          pengeluaran: analytics.monthExpense,
          cashflow_bersih: analytics.netCashflow,
          tingkat_tabungan_persen: parseFloat(analytics.savingRate.toFixed(1)),
          perubahan_mom_persen: parseFloat(analytics.momChange.toFixed(1)),
        },
        pengeluaran_per_kategori: analytics.expenseByCategory,
        saldo_per_tujuan: analytics.accountBalances,
        total_kekayaan_bersih: analytics.totalNetWorth,
        skor_kesehatan: {
          cashflow_health: parseFloat(analytics.cashflowHealth.toFixed(0)),
          expense_stability: parseFloat(analytics.expenseStability.toFixed(0)),
        },
        pengeluaran_terbesar: analytics.topExpenses.slice(0, 5),
        tren_6_bulan: {
          bulan: trends.months,
          pemasukan: trends.incomeData,
          pengeluaran: trends.expenseData,
        },
      },
      null,
      2
    );
  };

  const sendMessage = async (userText) => {
    if (!userText.trim() || loading) return;

    const userMessage = { role: 'user', content: userText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const contextSummary = buildContext();

      // Inject financial context into the first user message of each conversation
      const apiMessages = updatedMessages.map((msg, idx) => {
        if (idx === 0) {
          return {
            role: 'user',
            content: `Data keuangan saya:\n\`\`\`json\n${contextSummary}\n\`\`\`\n\nPertanyaan: ${msg.content}`,
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
        {
          role: 'assistant',
          content: `❌ Gagal mendapat respons: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const monthLabel = format(new Date(selectedMonth + '-01'), 'MMMM yyyy');

  return (
    <div className="ai-advisor-card">
      <div className="ai-advisor-header">
        <div className="ai-advisor-title">
          <div className="ai-advisor-avatar"><Bot size={20} /></div>
          <div>
            <h2>AI Financial Advisor</h2>
            <p className="ai-subtitle">Powered by Claude · {monthLabel}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="clear-chat-btn" onClick={() => setMessages([])}>
            <Trash2 size={13} /> Clear
          </button>
        )}
      </div>

      <div className="chat-window">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-avatar"><Bot size={24} /></div>
            <p>Tanyakan apa saja tentang keuangan kamu!</p>
            <p className="chat-empty-sub">AI akan menganalisis data {monthLabel}.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble-row ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="chat-avatar-circle ai"><Bot size={14} /></div>
              )}
              <div className={`chat-bubble ${msg.role}`}>{msg.content}</div>
              {msg.role === 'user' && (
                <div className="chat-avatar-circle user">👤</div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="chat-bubble-row assistant">
            <div className="chat-avatar">🤖</div>
            <div className="chat-bubble assistant typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="quick-prompts">
        <p className="quick-prompts-label">Pertanyaan cepat:</p>
        <div className="quick-prompts-grid">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              className="quick-prompt-btn"
              onClick={() => sendMessage(prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya tentang keuangan kamu..."
          disabled={loading}
        />
        <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export default AIAdvisor;
