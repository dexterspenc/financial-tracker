import { supabase } from '../lib/supabase';

export function useBudgets() {
  /** month should be 'yyyy-MM' — will be converted to 'yyyy-MM-01' for DB query. */
  const fetchBudgets = async (userId, month) => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories(id, name, flow_type)')
      .eq('user_id', userId)
      .eq('month', month + '-01');
    return { data: data ?? [], error };
  };

  const upsertBudget = async (payload) => {
    const { data, error } = await supabase
      .from('budgets')
      .upsert(payload, { onConflict: 'user_id,category_id,month' })
      .select('*, categories(id, name, flow_type)');
    return { data: data ?? [], error };
  };

  const deleteBudget = async (userId, categoryId, month) => {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('month', month + '-01');
    return { error };
  };

  return { fetchBudgets, upsertBudget, deleteBudget };
}
