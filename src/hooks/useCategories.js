import { supabase } from '../lib/supabase';

export function useCategories() {
  const fetchCategories = async (userId) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order');
    return { data: data ?? [], error };
  };

  return { fetchCategories };
}
