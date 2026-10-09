// Embedded finance: offtake-backed advance cap + repayment netting at payout.
// All money in integer kobo.

export interface AdvanceInput {
  plannedVolume: number // baskets
  bandMin: number // kobo per basket
  rate: number // e.g. 0.4 for 40%
}

/** Max advance = rate × (plannedVolume × bandMin), backed by the contract. */
export const maxAdvance = (i: AdvanceInput): number =>
  Math.round(i.rate * i.plannedVolume * i.bandMin)

export interface PayoutInput {
  saleValue: number
  advance: number
  feeRate: number
  commissionRate: number
}

export interface PayoutBreakdown {
  platformFee: number
  agentCommission: number
  advanceNetted: number
  farmerPayout: number
}

/** farmerPayout = saleValue − fee − commission − advance. */
export function netPayout(i: PayoutInput): PayoutBreakdown {
  const platformFee = Math.round(i.saleValue * i.feeRate)
  const agentCommission = Math.round(i.saleValue * i.commissionRate)
  const advanceNetted = i.advance
  const farmerPayout = i.saleValue - platformFee - agentCommission - advanceNetted
  return { platformFee, agentCommission, advanceNetted, farmerPayout }
}
