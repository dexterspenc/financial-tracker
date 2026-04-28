import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { normalizeTxn } from '../utils/normalizeTxn';

const DataContext = createContext(null);

const SELECT_TXN = '*, accounts(id, name, purpose), categories(id, name, flow_type)';
const EMPTY_QUICK_ACTIONS = [null, null, null, null];
const MINI_ALADDIN_URL = 'https://mini-aladdin-silk.vercel.app/api/portfolio/holdings';
const MINI_ALADDIN_KEY = import.meta.env.VITE_MINI_ALADDIN_API_KEY;
const MINI_ALADDIN_OWNER_UID = '18a7fc48-a07c-49ad-9387-84cc04de5638';

const fetchPortfolioHoldings = async (userId) => {
  if (userId !== MINI_ALADDIN_OWNER_UID) return [];
  if (!MINI_ALADDIN_KEY) return [];
  try {
    const res = await fetch(MINI_ALADDIN_URL, {
      headers: { 'X-API-Key': MINI_ALADDIN_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.holdings)) return data.holdings;
    if (Array.isArray(data.data)) return data.data;
    return [];
  } catch {
    return [];
  }
};

// Fetch functions defined at module scope — no hook factory imports, no TDZ risk
const fetchAllData = async (userId) => {
  const [
    { data: txns },
    { data: accs },
    { data: cats },
    { data: bals },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select(SELECT_TXN)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('accounts')
      .select('id, name, purpose, sort_order, is_active, is_credit_account, credit_limit, statement_date, due_date')
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
      .select('*, accounts(id, name, purpose, is_credit_account, credit_limit, statement_date, due_date)')
      .eq('user_id', userId),
    supabase
      .from('user_settings')
      .select('quick_actions')
      .eq('user_id', userId)
      .single(),
  ]);

  const rawQA = settings?.quick_actions;
  const quickActions = Array.isArray(rawQA) && rawQA.length === 4
    ? rawQA
    : EMPTY_QUICK_ACTIONS;

  return {
    txns:         txns ? txns.map(normalizeTxn) : [],
    accs:         accs ?? [],
    cats:         cats ?? [],
    bals:         bals ?? [],
    quickActions,
  };
};

export function DataProvider({ children }) {
  const { user } = useAuth();

  const [allTransactions, setAllTransactions]   = useState([]);
  const [accounts, setAccounts]                 = useState([]);
  const [categories, setCategories]             = useState([]);
  const [accountBalances, setAccountBalances]   = useState([]);
  const [quickActions, setQuickActions]         = useState(EMPTY_QUICK_ACTIONS);
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [fetchTrigger, setFetchTrigger]         = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setAllTransactions([]);
      setAccounts([]);
      setCategories([]);
      setAccountBalances([]);
      setQuickActions(EMPTY_QUICK_ACTIONS);
      setPortfolioHoldings([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { txns, accs, cats, bals, quickActions: qa } = await fetchAllData(user.id);
        if (!cancelled) {
          setAllTransactions(txns);
          setAccounts(accs);
          setCategories(cats);
          setAccountBalances(bals);
          setQuickActions(qa);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Portfolio fetch runs in background — does not block app render
      fetchPortfolioHoldings(user.id).then(holdings => {
        if (!cancelled) setPortfolioHoldings(holdings);
      });
    };

    run();
    return () => { cancelled = true; };
  }, [user?.id, fetchTrigger]);

  const refetch = () => setFetchTrigger(t => t + 1);

  return (
    <DataContext.Provider value={{
      allTransactions, accounts, categories, accountBalances, quickActions,
      portfolioHoldings,
      loading, refetch,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
