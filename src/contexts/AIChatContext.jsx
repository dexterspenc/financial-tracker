import { createContext, useContext, useState, useEffect } from 'react';

const AIChatContext = createContext();

export function AIChatProvider({ children }) {
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('ai_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    sessionStorage.setItem('ai_chat_messages', JSON.stringify(messages));
  }, [messages]);

  const clearMessages = () => {
    setMessages([]);
    sessionStorage.removeItem('ai_chat_messages');
  };

  return (
    <AIChatContext.Provider value={{ messages, setMessages, clearMessages }}>
      {children}
    </AIChatContext.Provider>
  );
}

export const useAIChat = () => useContext(AIChatContext);
