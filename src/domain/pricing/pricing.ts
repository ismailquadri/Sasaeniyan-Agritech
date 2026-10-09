// Fair-price engine: unitPrice = clamp(marketIndex × gradeFactor, bandMin, bandMax).
// All money in integer kobo.

export type Grade = 'A' | 'B' | 'C'

export const gradeFactor = (g: Grade) => ({ A: 1, B: 0.85, C: 0.7 }[g])

export interface PriceInput {
  indexPrice: number
  grade: Grade
  bandMin: number
  bandMax: number
}

export function fairPrice(i: PriceInput): number {
  const raw = Math.round(i.indexPrice * gradeFactor(i.grade))
  return Math.min(Math.max(raw, i.bandMin), i.bandMax)
}

export function priceBreakdown(i: PriceInput) {
  return {
    index: i.indexPrice,
    grade: i.grade,
    factor: gradeFactor(i.grade),
    band: [i.bandMin, i.bandMax] as [number, number],
    price: fairPrice(i),
  }
}
