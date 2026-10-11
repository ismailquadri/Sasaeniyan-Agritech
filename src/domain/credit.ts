// Credit flywheel: score → level → offtake-advance rate.
import { ADVANCE_RATE_BY_LEVEL } from './config'

export const LEVEL_THRESHOLDS = { 2: 10, 3: 30 } as const

export function creditLevel(score: number): 1 | 2 | 3 {
  if (score >= LEVEL_THRESHOLDS[3]) return 3
  if (score >= LEVEL_THRESHOLDS[2]) return 2
  return 1
}

export function advanceRateFor(score: number): number {
  return ADVANCE_RATE_BY_LEVEL[creditLevel(score)]
}
