import { useState, useEffect, useRef } from 'react';

interface SolPriceState {
  solPriceUsd: number;
  lastUpdated: Date | null;
  error: string | null;
  isLoading: boolean;
}

const CACHE_DURATION_MS = 45000; // 45 seconds cache
const FALLBACK_PRICE = 140; // Fallback price if API fails

/**
 * Hook to fetch real-time SOL/USD price from Jupiter API
 * Caches price for 45 seconds to avoid excessive API calls
 * 
 * @returns {SolPriceState} Object containing solPriceUsd, lastUpdated, error, and isLoading
 */
export function useSolPrice(): SolPriceState {
  const [state, setState] = useState<SolPriceState>({
    solPriceUsd: FALLBACK_PRICE,
    lastUpdated: null,
    error: null,
    isLoading: false,
  });

  const cacheRef = useRef<{
    price: number;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      // Check cache first
      if (cacheRef.current) {
        const elapsed = Date.now() - cacheRef.current.timestamp;
        if (elapsed < CACHE_DURATION_MS) {
          setState((prev) => ({
            ...prev,
            solPriceUsd: cacheRef.current!.price,
            error: null,
          }));
          return;
        }
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Fetch from Jupiter Price API
        const response = await fetch(
          'https://price.jup.ag/v4/price?ids=SOL&vsToken=USDC',
          {
            headers: { Accept: 'application/json' },
          }
        );

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = await response.json();
        const price = data.data?.SOL?.price;

        if (typeof price !== 'number' || price <= 0) {
          throw new Error('Invalid price data received');
        }

        // Update cache
        cacheRef.current = {
          price,
          timestamp: Date.now(),
        };

        setState({
          solPriceUsd: price,
          lastUpdated: new Date(),
          error: null,
          isLoading: false,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to fetch SOL price:', errorMessage);

        setState((prev) => ({
          ...prev,
          solPriceUsd: prev.solPriceUsd || FALLBACK_PRICE,
          error: errorMessage,
          isLoading: false,
        }));
      }
    };

    fetchPrice();

    // Set up interval to refresh price every 45 seconds
    const interval = setInterval(fetchPrice, CACHE_DURATION_MS);
    return () => clearInterval(interval);
  }, []);

  return state;
}

/**
 * Converts USD amount to SOL (in lamports)
 * @param usdAmount - Amount in USD
 * @param solPriceUsd - Current SOL/USD price
 * @returns Amount in lamports (1 SOL = 1 billion lamports)
 */
export function usdToLamports(usdAmount: number, solPriceUsd: number): number {
  if (solPriceUsd <= 0) {
    console.warn('Invalid SOL price for conversion:', solPriceUsd);
    return 0;
  }
  const solAmount = usdAmount / solPriceUsd;
  const lamports = Math.round(solAmount * 1_000_000_000);
  return lamports;
}

/**
 * Converts lamports to USD
 * @param lamports - Amount in lamports
 * @param solPriceUsd - Current SOL/USD price
 * @returns Amount in USD
 */
export function lamportsToUsd(lamports: number, solPriceUsd: number): number {
  const solAmount = lamports / 1_000_000_000;
  return solAmount * solPriceUsd;
}

/**
 * Formats SOL amount with proper decimal places
 * @param lamports - Amount in lamports
 * @returns Formatted SOL string (e.g., "0.5 SOL")
 */
export function formatSol(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  return sol.toFixed(6).replace(/\.?0+$/, '') + ' SOL';
}

/**
 * Formats USD amount with proper decimal places
 * @param usd - Amount in USD
 * @returns Formatted USD string (e.g., "$145.50")
 */
export function formatUsd(usd: number): string {
  return '$' + usd.toFixed(2);
}
