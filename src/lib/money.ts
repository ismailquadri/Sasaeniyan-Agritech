/** Convert whole naira to integer kobo (the storage unit everywhere). */
export const naira = (n: number) => Math.round(n * 100)

/** Format integer kobo as Naira for display (edge only). */
export const formatNaira = (kobo: number) =>
  '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })
