import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { supabase } from '../lib/supabase';
import './AIAdvisorWidget.css';

const QUICK_PROMPTS = [
  'Analisis pengeluaran bulan ini',
  'Kapan saya bisa capai target tabungan?',
  'Kategori apa yang paling boros?',
];

function buildTransactionContext(transactions) {
  return JSON.stringify(
    transactions.map(t => ({
      id: t.id,
      date: t.date,
      month: t.month,
      account: t.account,
      account_purpose: t.accountPurpose,
      category: t.category,
      flow_type: t.flowType,
      debit: t.debit,
      credit: t.credit,
      type: t.type,
      note: t.note,
    })),
    null,
    2
  );
}

function AIAdvisorWidget() {
  const { user } = useAuth();
  const { fetchTransactions } = useTransactions();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('ai_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [analyticsContext, setAnalyticsContext] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && !analyticsContext && user) {
      fetchData();
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    sessionStorage.setItem('ai_chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchData = async () => {
    setDataLoading(true);
    const { data, error } = await fetchTransactions(user.id);
    if (!error && data.length > 0) {
      setAnalyticsContext(buildTransactionContext(data));
    }
    setDataLoading(false);
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

      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { messages: updatedMessages, context },
      });

      if (error) throw error;

      const aiText = data?.content?.[0]?.text || '(Tidak ada respons)';
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch (err) {
      setMessages(prev => [
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

  return (
    <>
      {isOpen && (
        <div className="widget-overlay" onClick={() => setIsOpen(false)} />
      )}

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
              <button className="widget-clear-btn" onClick={() => { setMessages([]); sessionStorage.removeItem('ai_chat_messages'); }} title="Clear chat">
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
                <div className={`widget-bubble ${msg.role}`}>
                  {msg.role === 'assistant'
                    ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                    : msg.content}
                </div>
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

      <button
        className={`widget-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(v => !v)}
        title="AI Financial Advisor"
      >
        {isOpen ? <X size={16} /> : (
          <>
            <Sparkles size={16} />
            <span>AI Assistant</span>
          </>
        )}
      </button>
    </>
  );
}

export default AIAdvisorWidget;
