// Escrow state machine: none → funded → released. Pure, guarded reducer.

export type EscrowState = 'none' | 'funded' | 'released'
export type EscrowAction = 'fund' | 'release'

const transitions: Record<EscrowState, Partial<Record<EscrowAction, EscrowState>>> = {
  none: { fund: 'funded' },
  funded: { release: 'released' },
  released: {},
}

export function escrowReduce(state: EscrowState, action: EscrowAction): EscrowState {
  const next = transitions[state]?.[action]
  if (!next) throw new Error(`Illegal escrow transition: ${action} from ${state}`)
  return next
}
