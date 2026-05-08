const USDC_DECIMALS = 1_000_000;

export function toAtoms(dollars: number): number {
  return Math.round(dollars * USDC_DECIMALS);
}

export function toUsd(atoms: number): number {
  return atoms / USDC_DECIMALS;
}
