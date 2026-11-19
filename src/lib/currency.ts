export const MAX_PRICE_IDR = 1_000_000_000;

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatIDR(amount: number): string {
  return idrFormatter.format(Number.isFinite(amount) ? Math.round(amount) : 0);
}

export function formatRupiahDigits(digits: string): string {
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
