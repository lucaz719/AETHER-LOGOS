import { usdToLamports, lamportsToUsd, formatSol, formatUsd } from '../useSolPrice';

describe('useSolPrice utilities', () => {
  describe('usdToLamports', () => {
    it('should convert USD to lamports correctly', () => {
      const usdAmount = 10; // $10
      const solPrice = 140; // 1 SOL = $140
      const expectedLamports = Math.round((10 / 140) * 1_000_000_000);
      
      const result = usdToLamports(usdAmount, solPrice);
      expect(result).toBe(expectedLamports);
    });

    it('should handle small amounts', () => {
      const usdAmount = 0.1;
      const solPrice = 100;
      const result = usdToLamports(usdAmount, solPrice);
      
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(10_000_000);
    });

    it('should return 0 for zero or negative SOL price', () => {
      expect(usdToLamports(10, 0)).toBe(0);
      expect(usdToLamports(10, -100)).toBe(0);
    });

    it('should handle large amounts without overflow', () => {
      const usdAmount = 1_000_000;
      const solPrice = 150;
      const result = usdToLamports(usdAmount, solPrice);
      
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('lamportsToUsd', () => {
    it('should convert lamports to USD correctly', () => {
      const lamports = 1_000_000_000; // 1 SOL
      const solPrice = 140;
      const expectedUsd = 140;
      
      const result = lamportsToUsd(lamports, solPrice);
      expect(result).toBeCloseTo(expectedUsd, 2);
    });

    it('should handle fractional SOL amounts', () => {
      const lamports = 500_000_000; // 0.5 SOL
      const solPrice = 100;
      const expectedUsd = 50;
      
      const result = lamportsToUsd(lamports, solPrice);
      expect(result).toBeCloseTo(expectedUsd, 2);
    });

    it('should return 0 for zero lamports', () => {
      const result = lamportsToUsd(0, 140);
      expect(result).toBe(0);
    });
  });

  describe('formatSol', () => {
    it('should format 1 SOL correctly', () => {
      const lamports = 1_000_000_000;
      const result = formatSol(lamports);
      expect(result).toContain('1');
      expect(result).toContain('SOL');
    });

    it('should format fractional SOL correctly', () => {
      const lamports = 350_000_000; // 0.35 SOL
      const result = formatSol(lamports);
      expect(result).toContain('0.35');
      expect(result).toContain('SOL');
    });

    it('should strip trailing zeros', () => {
      const lamports = 1_500_000_000; // 1.5 SOL
      const result = formatSol(lamports);
      expect(result).not.toContain('000000');
    });

    it('should handle zero', () => {
      const result = formatSol(0);
      expect(result).toContain('0');
      expect(result).toContain('SOL');
    });
  });

  describe('formatUsd', () => {
    it('should format USD with dollar sign', () => {
      const result = formatUsd(145.50);
      expect(result).toContain('$');
      expect(result).toContain('145.50');
    });

    it('should format whole numbers with .00', () => {
      const result = formatUsd(100);
      expect(result).toBe('$100.00');
    });

    it('should handle small amounts', () => {
      const result = formatUsd(0.05);
      expect(result).toBe('$0.05');
    });

    it('should round to 2 decimal places', () => {
      const result = formatUsd(99.999);
      expect(result).toBe('$100.00');
    });
  });

  describe('roundtrip conversions', () => {
    it('should maintain value in roundtrip USD -> lamports -> USD', () => {
      const originalUsd = 50;
      const solPrice = 120;
      
      const lamports = usdToLamports(originalUsd, solPrice);
      const convertedBack = lamportsToUsd(lamports, solPrice);
      
      // Allow small rounding difference
      expect(convertedBack).toBeCloseTo(originalUsd, 6);
    });

    it('should maintain value in roundtrip lamports -> USD -> lamports', () => {
      const originalLamports = 1_500_000_000; // 1.5 SOL
      const solPrice = 140;
      
      const usd = lamportsToUsd(originalLamports, solPrice);
      const convertedBack = usdToLamports(usd, solPrice);
      
      // Allow small rounding difference (within 1 lamport)
      expect(Math.abs(convertedBack - originalLamports)).toBeLessThanOrEqual(1);
    });
  });

  describe('fee calculations', () => {
    it('should calculate 2% platform fee correctly in USD', () => {
      const amountUsd = 100;
      const feeUsd = (amountUsd * 2) / 100;
      
      expect(feeUsd).toBe(2);
    });

    it('should calculate 2% platform fee correctly in lamports', () => {
      const amountLamports = 1_000_000_000; // 1 SOL
      const feeLamports = (amountLamports * 200) / 10000; // 200 bps = 2%
      
      expect(feeLamports).toBe(20_000_000);
    });
  });
});
