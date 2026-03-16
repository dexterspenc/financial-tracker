import { supabase } from '../lib/supabase';

export function useAccounts() {
  const fetchAccounts = async (userId) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order');
    return { data: data ?? [], error };
  };

  const fetchAccountBalances = async (userId) => {
    const { data, error } = await supabase
      .from('account_balances')
      .select('*, accounts(id, name, purpose)')
      .eq('user_id', userId);
    return { data: data ?? [], error };
  };

  return { fetchAccounts, fetchAccountBalances };
}
