// Demo-wide economic parameters.
export const ADVANCE_RATE = 0.4 // 40% of planned value, offtake-backed (L1 default)
export const ADVANCE_RATE_BY_LEVEL: Record<1 | 2 | 3, number> = { 1: 0.4, 2: 0.5, 3: 0.6 }
export const PLATFORM_FEE_RATE = 0.03
export const AGENT_COMMISSION_RATE = 0.02
export const FINANCE_SPREAD_RATE = 0.015 // modelled finance revenue on advances

export const PLATFORM_WALLET_ID = 'wallet_platform'
