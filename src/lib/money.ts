// Money helpers — all amounts are integers in NAIRA (no floating point).

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNairaPlain(amount: number): string {
  return `₦${new Intl.NumberFormat('en-NG').format(amount)}`
}
