import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Trash2 } from 'lucide-react';
import { APPS_SCRIPT_URL } from '../config';
import './AIAdvisorWidget.css';

const QUICK_PROMPTS = [
  'Analisis pengeluaran bulan ini',
  'Kapan saya bisa capai target tabungan?',
  'Kategori apa yang paling boros?',
];

function buildTransactionContext(rows) {
  // rows[0] is the header row — skip it
  const transactions = rows.slice(1).map((row) => ({
    id: row[0],
    date: row[1],
    month: row[2],
    account: row[3],
    account_purpose: row[4],
    category: row[5],
    flow_type: row[6],
    debit: parseFloat(row[7]) || 0,
    credit: parseFloat(row[8]) || 0,
    type: row[9],
    note: row[11] || '',
  }));

  return JSON.stringify(transactions, null, 2);
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
        setAnalyticsContext(buildTransactionContext(rows));
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
            content: `Berikut adalah semua transaksi keuangan saya (format JSON, kolom: id, date, month, account, account_purpose, category, flow_type, debit, credit, type, note):\n\`\`\`json\n${context}\n\`\`\`\n\nPertanyaan: ${msg.content}`,
          };
        }
        return { role: msg.role, content: msg.content };
      });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
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
            <div className="widget-ai-avatar"><Bot size={18} /></div>
            <div>
              <div className="widget-header-title">AI Financial Advisor</div>
              <div className="widget-header-sub">
                <span className={`widget-status-dot ${dataLoading ? 'loading' : ''}`} />
                {dataLoading ? 'Loading data…' : 'Powered by Claude'}
              </div>
            </div>
          </div>
          <div className="widget-header-actions">
            {messages.length > 0 && (
              <button className="widget-clear-btn" onClick={() => setMessages([])} title="Clear chat">
                <Trash2 size={13} />
              </button>
            )}
            <button className="widget-close-btn" onClick={() => setIsOpen(false)} title="Close">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="widget-messages">
          {messages.length === 0 ? (
            <div className="widget-empty">
              <div className="widget-empty-avatar"><Bot size={26} /></div>
              <p>Ask anything about your finances!</p>
              {dataLoading && <p className="widget-empty-sub">Loading your transaction data…</p>}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`widget-bubble-row ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <span className="widget-avatar-circle ai-avatar"><Bot size={13} /></span>
                )}
                <div className={`widget-bubble ${msg.role}`}>{msg.content}</div>
                {msg.role === 'user' && (
                  <span className="widget-avatar-circle user-avatar">👤</span>
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
          <button type="submit" className="widget-send-btn" disabled={loading || dataLoading || !input.trim()}>
            <Send size={15} />
          </button>
        </form>
      </div>

      {/* FAB toggle button */}
      <button
        className={`widget-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        title="AI Financial Advisor"
      >
        {isOpen ? <X size={20} /> : <Bot size={22} />}
      </button>
    </>
  );
}

export default AIAdvisorWidget;
