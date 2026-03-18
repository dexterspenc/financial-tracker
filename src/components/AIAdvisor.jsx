import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Bot, Send, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import './AIAdvisor.css';

const QUICK_PROMPTS = [
  'Analisis pengeluaran bulan ini',
  'Kapan saya bisa capai target tabungan?',
  'Kategori apa yang paling boros?',
];

function AIAdvisor({ analytics, trends, selectedMonth }) {
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('ai_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem('ai_chat_messages', JSON.stringify(messages));
    window.dispatchEvent(new Event('storage'));
  }, [messages]);

  useEffect(() => {
    const handleStorage = () => {
      const saved = sessionStorage.getItem('ai_chat_messages');
      if (saved) setMessages(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
      const context = buildContext();

      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { messages: updatedMessages, context },
      });

      if (error) throw error;

      const aiText = data?.content?.[0]?.text || '(Tidak ada respons)';
      setMessages((prev) => [...prev, { role: 'assistant', content: aiText }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Gagal mendapat respons: ${err.message}` },
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
          <button className="clear-chat-btn" onClick={() => { setMessages([]); sessionStorage.removeItem('ai_chat_messages'); }}>
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
              <div className={`chat-bubble ${msg.role}`}>
                {msg.role === 'assistant'
                  ? <ReactMarkdown
                      components={{
                        li: ({children}) => <li style={{marginBottom: '2px'}}>{children}</li>,
                        p: ({children}) => <p style={{margin: '0 0 4px 0'}}>{children}</p>,
                        ul: ({children}) => <ul style={{margin: '4px 0', paddingLeft: '18px'}}>{children}</ul>,
                        ol: ({children}) => <ol style={{margin: '4px 0', paddingLeft: '18px'}}>{children}</ol>,
                      }}
                    >{msg.content}</ReactMarkdown>
                  : msg.content}
              </div>
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
