import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { normalizeTxn } from '../hooks/useTransactions';

const DataContext = createContext(null);

const SELECT_TXN = '*, accounts(id, name, purpose), categories(id, name, flow_type)';

// Fetch functions defined at module scope — no hook factory imports, no TDZ risk
const fetchAllData = async (userId) => {
  const [
    { data: txns },
    { data: accs },
    { data: cats },
    { data: bals },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select(SELECT_TXN)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('account_balances')
      .select('*, accounts(id, name, purpose)')
      .eq('user_id', userId),
  ]);
  return {
    txns: txns ? txns.map(normalizeTxn) : [],
    accs: accs ?? [],
    cats: cats ?? [],
    bals: bals ?? [],
  };
};

export function DataProvider({ children }) {
  const { user } = useAuth();

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
        const { txns, accs, cats, bals } = await fetchAllData(user.id);
        if (!cancelled) {
          setAllTransactions(txns);
          setAccounts(accs);
          setCategories(cats);
          setAccountBalances(bals);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [user?.id, fetchTrigger]);

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
