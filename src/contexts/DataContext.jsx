import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const { fetchTransactions } = useTransactions();
  const { fetchAccounts, fetchAccountBalances } = useAccounts();
  const { fetchCategories } = useCategories();

  const [allTransactions, setAllTransactions] = useState([]);
  const [accounts, setAccounts]               = useState([]);
  const [categories, setCategories]           = useState([]);
  const [accountBalances, setAccountBalances] = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [fetchTrigger, setFetchTrigger]       = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setAllTransactions([]);
      setAccounts([]);
      setCategories([]);
      setAccountBalances([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const [
          { data: txns },
          { data: accs },
          { data: cats },
          { data: bals },
        ] = await Promise.all([
          fetchTransactions(user.id),
          fetchAccounts(user.id),
          fetchCategories(user.id),
          fetchAccountBalances(user.id),
        ]);
        if (!cancelled) {
          setAllTransactions(txns ?? []);
          setAccounts(accs ?? []);
          setCategories(cats ?? []);
          setAccountBalances(bals ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [user?.id, fetchTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = () => setFetchTrigger(t => t + 1);

  return (
    <DataContext.Provider value={{ allTransactions, accounts, categories, accountBalances, loading, refetch }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
