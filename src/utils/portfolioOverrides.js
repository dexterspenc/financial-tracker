const ASSET_CLASS_MAP = {
  MUTUAL_FUND: 'Reksadana',
  CRYPTO:      'Kripto',
  EQUITY:      'Saham',
};

/**
 * Converts raw Mini-Aladdin holdings array into a name→value override map.
 * CASH and unmapped asset classes are skipped.
 * @param {Array} holdings
 * @returns {{ [accountName: string]: number }}
 */
export function holdingsToOverrides(holdings) {
  const overrides = {};
  holdings.forEach(h => {
    const name = ASSET_CLASS_MAP[h.asset_class];
    if (name) overrides[name] = (overrides[name] || 0) + Math.round(Number(h.current_value) || 0);
  });
  return overrides;
}
