// Live FX rates (mid-market) for valas accounts. Source: frankfurter.dev (ECB data, no API key).
// Rates are "IDR per 1 unit of CUR", e.g. { USD: 17695, SGD: 13820, IDR: 1 }.

const API_BASE = 'https://api.frankfurter.dev/v1/latest';
const CACHE_KEY = 'valas_rates_v1';
const TTL_MS = 60 * 60 * 1000; // 1 hour

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
};

/**
 * Fetch IDR conversion rates for the given currency codes (non-IDR).
 * Uses USD as pivot so all currencies resolve in a single request.
 * @param {string[]} currencies e.g. ['USD', 'SGD']
 * @returns {Promise<{ rates: Record<string, number>, fetchedAt: number, date: string|null }>}
 */
export async function fetchRates(currencies) {
  const wanted = [...new Set(currencies.filter((c) => c && c !== 'IDR'))];
  if (wanted.length === 0) return { rates: { IDR: 1 }, fetchedAt: Date.now(), date: null };

  const cached = readCache();
  if (
    cached &&
    Date.now() - cached.fetchedAt < TTL_MS &&
    wanted.every((c) => c in cached.rates)
  ) {
    return cached;
  }

  // base=USD; ask for IDR plus every wanted currency (USD itself is the base).
  const symbols = [...new Set(['IDR', ...wanted.filter((c) => c !== 'USD')])].join(',');

  try {
    const res = await fetch(`${API_BASE}?base=USD&symbols=${symbols}`);
    if (!res.ok) throw new Error(`rate fetch ${res.status}`);
    const data = await res.json();
    const usdToIdr = data?.rates?.IDR;
    if (!usdToIdr) throw new Error('no IDR rate in response');

    const rates = { IDR: 1, USD: usdToIdr };
    wanted.forEach((c) => {
      if (c === 'USD') return;
      const usdToC = data.rates[c];
      if (usdToC) rates[c] = usdToIdr / usdToC; // (IDR/USD) ÷ (C/USD) = IDR/C
    });

    const payload = { rates, fetchedAt: Date.now(), date: data.date ?? null };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota / private-mode write failures
    }
    return payload;
  } catch {
    // On failure, fall back to stale cache if we have it; otherwise empty.
    if (cached) return cached;
    return { rates: { IDR: 1 }, fetchedAt: Date.now(), date: null };
  }
}

/** Convert a native amount in `currency` to IDR using a rate map. */
export function toIDR(amount, currency, rates) {
  const cur = currency || 'IDR';
  if (cur === 'IDR') return amount;
  const rate = rates?.[cur];
  return rate ? amount * rate : 0;
}
