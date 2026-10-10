'use client'

import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, EmptyState } from '@/components/ios/kit'
import { IconWallet } from '@/components/ios/icons'

export function WalletTab({ state, agent }: { state: AppState; agent: any }) {
  const wallet = state.wallets.find((w) => w.ownerId === agent.id)
  const ledger: any[] = wallet?.ledger ?? []

  return (
    <div className="ios-content">
      <NavLargeTitle title="Wallet" />
      <div className="ios-balancecard">
        <div className="ios-caption1">Commission balance</div>
        <div className="ios-balance">{formatNaira(wallet?.balance ?? 0)}</div>
      </div>
      <SectionHeader>Commissions</SectionHeader>
      {ledger.length === 0 ? (
        <EmptyState icon={<IconWallet width={40} height={40} />} title="No commissions yet" message="You earn 2% on every delivered lot." />
      ) : (
        <InsetGroup>
          {ledger.map((e) => (
            <Row key={e.id} title="Lot commission" subtitle={new Date(e.createdAt).toLocaleString()}
              value={<span style={{ color: 'var(--ios-tint)' }}>+{formatNaira(e.amount)}</span>} />
          ))}
        </InsetGroup>
      )}
    </div>
  )
}
