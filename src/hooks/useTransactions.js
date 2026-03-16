import { supabase } from '../lib/supabase';

const SELECT_WITH_JOINS = '*, accounts(id, name, purpose), categories(id, name, flow_type)';

/** Normalize a Supabase transaction row (with joined accounts/categories) to a flat shape
 *  compatible with existing UI code that previously used GSheets row arrays.
 */
export function normalizeTxn(t) {
  return {
    id: t.id,
    date: t.date,
    month: t.month,
    account: t.accounts?.name ?? '',
    accountPurpose: t.accounts?.purpose ?? '',
    accountId: t.account_id,
    category: t.categories?.name ?? '',
    categoryFlowType: t.categories?.flow_type ?? '',
    categoryId: t.category_id,
    flowType: t.flow_type,
    debit: parseFloat(t.debit) || 0,
    credit: parseFloat(t.credit) || 0,
    type: t.type,
    transferPairId: t.transfer_pair_id ?? '',
    note: t.note ?? '',
    createdAt: t.created_at,
  };
}

export function useTransactions() {
  const fetchTransactions = async (userId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select(SELECT_WITH_JOINS)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    return { data: data ? data.map(normalizeTxn) : [], error };
  };

  const addTransaction = async (payload) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select(SELECT_WITH_JOINS);
    return { data: data ? data.map(normalizeTxn) : [], error };
  };

  /** Atomic batch insert — used for transfers (two rows in one request). */
  const addTransactionPair = async (rows) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert(rows)
      .select(SELECT_WITH_JOINS);
    return { data: data ? data.map(normalizeTxn) : [], error };
  };

  const updateTransaction = async (id, payload) => {
    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .select(SELECT_WITH_JOINS)
      .single();
    return { data: data ? normalizeTxn(data) : null, error };
  };

  const deleteTransaction = async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    return { error };
  };

  return { fetchTransactions, addTransaction, addTransactionPair, updateTransaction, deleteTransaction };
}
