export function getTaxRate() {
  const rate = Number(process.env.TAX_RATE ?? 5);
  return Number.isFinite(rate) && rate >= 0 ? rate : 5;
}
