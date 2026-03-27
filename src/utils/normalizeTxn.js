/** Normalize a Supabase transaction row (with joined accounts/categories) to a flat shape
 *  compatible with existing UI code that previously used GSheets row arrays.
 */
export function normalizeTxn(t) {
  return {
    id:              t.id,
    date:            t.date,
    month:           t.month,
    account:         t.accounts?.name    ?? '',
    accountPurpose:  t.accounts?.purpose ?? '',
    accountId:       t.account_id,
    category:        t.categories?.name      ?? '',
    categoryFlowType: t.categories?.flow_type ?? '',
    categoryId:      t.category_id,
    flowType:        t.flow_type,
    debit:           parseFloat(t.debit)  || 0,
    credit:          parseFloat(t.credit) || 0,
    type:            t.type,
    transferPairId:  t.transfer_pair_id ?? '',
    note:            t.note ?? '',
    createdAt:       t.created_at,
  };
}
