// Impact + business metrics. Money in integer kobo; ratios as plain numbers.

export interface UpliftInput {
  ourPrice: number
  middlemanPrice: number
}

/** Relative income gain vs. the middleman/glut price. Guards divide-by-zero. */
export function incomeUplift(i: UpliftInput): number {
  if (i.middlemanPrice <= 0) return 0
  return (i.ourPrice - i.middlemanPrice) / i.middlemanPrice
}

export interface RevenueInput {
  saleValue: number
  feeRate: number
  financeSpread: number // kobo
}

export interface RevenueSplit {
  platformFee: number
  financeSpread: number
  total: number
}

export function revenueSplit(i: RevenueInput): RevenueSplit {
  const platformFee = Math.round(i.saleValue * i.feeRate)
  return { platformFee, financeSpread: i.financeSpread, total: platformFee + i.financeSpread }
}
