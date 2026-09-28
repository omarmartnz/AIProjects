export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  rateToEUR: number; // reference exchange rate to EUR for offline fallback
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'Dólar Americano ($)', rateToEUR: 0.92 },
  { code: 'EUR', symbol: '€', name: 'Euro (€)', rateToEUR: 1.0 },
  { code: 'DOP', symbol: 'RD$', name: 'Peso Dominicano (RD$)', rateToEUR: 0.0154 },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano ($)', rateToEUR: 0.00023 },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano ($)', rateToEUR: 0.052 },
  { code: 'CAD', symbol: '$', name: 'Dólar Canadiense ($)', rateToEUR: 0.68 },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino ($)', rateToEUR: 0.00095 },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno ($)', rateToEUR: 0.00098 },
  { code: 'PEN', symbol: 'S/.', name: 'Sol Peruano (S/.)', rateToEUR: 0.25 },
  { code: 'GBP', symbol: '£', name: 'Libra Esterlina (£)', rateToEUR: 1.18 },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño (R$)', rateToEUR: 0.17 },
  { code: 'CHF', symbol: 'CHF', name: 'Franco Suizo (CHF)', rateToEUR: 1.05 },
  { code: 'JPY', symbol: '¥', name: 'Yen Japonés (¥)', rateToEUR: 0.0062 },
];

export function getCurrencyByCode(code: string): CurrencyOption {
  const clean = (code || 'USD').trim().toUpperCase();
  const found = SUPPORTED_CURRENCIES.find(c => c.code.toUpperCase() === clean);
  return (
    found || {
      code: clean,
      symbol: clean,
      name: clean,
      rateToEUR: 1.0,
    }
  );
}

/**
 * Calculates estimated fallback exchange rate from source currency to target currency
 * using EUR as a pivot.
 */
export function getEstimatedExchangeRate(fromCode: string, toCode: string): number {
  const fromClean = (fromCode || 'USD').trim().toUpperCase();
  const toClean = (toCode || 'USD').trim().toUpperCase();
  if (fromClean === toClean) return 1.0;

  // Check in-memory / local storage cache first
  const cached = getCachedExchangeRate(fromClean, toClean);
  if (cached && typeof cached.rate === 'number' && cached.rate > 0) {
    return cached.rate;
  }

  const from = getCurrencyByCode(fromClean);
  const to = getCurrencyByCode(toClean);

  if (to.rateToEUR <= 0) return 1.0;
  const rate = from.rateToEUR / to.rateToEUR;
  return Number(rate.toFixed(4));
}

export interface LiveRateResult {
  rate: number;
  date?: string;
  isLive: boolean;
  fromCache?: boolean;
  source: 'frankfurter' | 'cache' | 'fallback';
}

interface CacheEntry {
  rate: number;
  date?: string;
  timestamp: number;
}

// In-memory cache for fast synchronous lookup
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getCacheKey(from: string, to: string): string {
  return `frankfurter_rate_${from.toUpperCase()}_${to.toUpperCase()}`;
}

/**
 * Synchronously retrieves any cached exchange rate from memory or localStorage.
 */
export function getCachedExchangeRate(
  fromCode: string,
  toCode: string
): { rate: number; date?: string } | null {
  const from = (fromCode || 'USD').trim().toUpperCase();
  const to = (toCode || 'USD').trim().toUpperCase();
  if (from === to) return { rate: 1.0, date: new Date().toISOString().split('T')[0] };

  const key = getCacheKey(from, to);
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    return { rate: mem.rate, date: mem.date };
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: CacheEntry = JSON.parse(stored);
        if (parsed && typeof parsed.rate === 'number') {
          memoryCache.set(key, parsed);
          return { rate: parsed.rate, date: parsed.date };
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  return null;
}

/**
 * Saves a rate entry to memory and localStorage.
 */
function setCachedExchangeRate(from: string, to: string, rate: number, date?: string) {
  const entry: CacheEntry = { rate, date, timestamp: Date.now() };
  const key = getCacheKey(from, to);
  memoryCache.set(key, entry);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Ignore localStorage errors
    }
  }
}

/**
 * Fetches live exchange rate from the open-source Frankfurter v2 API.
 * Uses intelligent caching and graceful fallback so offline usage is seamless.
 */
export async function fetchLiveExchangeRate(
  fromCode: string,
  toCode: string,
  forceRefresh: boolean = false
): Promise<LiveRateResult> {
  const from = (fromCode || 'USD').trim().toUpperCase();
  const to = (toCode || 'USD').trim().toUpperCase();

  if (from === to) {
    return {
      rate: 1.0,
      date: new Date().toISOString().split('T')[0],
      isLive: true,
      source: 'frankfurter',
    };
  }

  // Check cache first if not force refreshing
  if (!forceRefresh) {
    const cached = getCachedExchangeRate(from, to);
    if (cached) {
      return {
        rate: cached.rate,
        date: cached.date,
        isLive: true,
        fromCache: true,
        source: 'cache',
      };
    }
  }

  // Fetch from Frankfurter v2 API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const url = `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.rate === 'number' && data.rate > 0) {
        const rate = Number(data.rate.toFixed(data.rate < 0.01 ? 6 : 4));
        const date = data.date || new Date().toISOString().split('T')[0];
        setCachedExchangeRate(from, to, rate, date);
        return {
          rate,
          date,
          isLive: true,
          source: 'frankfurter',
        };
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    // Network or abort error: fall through to fallback
  }

  // Fallback: check if stale cache exists, otherwise use reference rate
  const stale = getCachedExchangeRate(from, to);
  if (stale) {
    return {
      rate: stale.rate,
      date: stale.date,
      isLive: false,
      fromCache: true,
      source: 'cache',
    };
  }

  const fallbackRate = getEstimatedExchangeRate(from, to);
  return {
    rate: fallbackRate,
    isLive: false,
    source: 'fallback',
  };
}

/**
 * Converts an amount from one currency to another using the given rate.
 */
export function convertAmount(amount: number, rate: number): number {
  return Number((amount * rate).toFixed(2));
}

/**
 * Formats a number with comma as thousands separator and dot as decimal separator.
 * e.g., 1234.56 -> "1,234.56"
 */
export function formatNumber(amount: number | undefined | null, decimals: number = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0.00';
  }
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats an amount with currency symbol, using comma for thousands and dot for decimal.
 * e.g., 12500.5 -> "$12,500.50"
 */
export function formatMoney(amount: number | undefined | null, symbol: string, decimals: number = 2): string {
  return `${symbol}${formatNumber(amount, decimals)}`;
}

export function formatCurrencyAmount(amount: number, symbol: string, code?: string, decimals: number = 2): string {
  const formatted = formatNumber(amount, decimals);
  return `${symbol}${formatted}${code ? ` ${code}` : ''}`;
}
