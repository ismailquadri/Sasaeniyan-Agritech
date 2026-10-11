'use client'

import { formatNaira } from '@/lib/money'
import { SectionHeader, InsetGroup, Row, EmptyState, NavLargeTitle } from '@/components/ios/kit'
import { HeroCard, Chip, DayGroup, groupByDay, Banner } from '@/components/ios/upgrade'
import { IconWallet } from '@/components/ios/icons'
import type { AgentTabProps } from './AgentApp'

const LEDGER_LABEL: Record<string, string> = {
  commission: 'Lot commission',
  withdrawal: 'Cash withdrawal',
}

export function WalletTab({ state, agent, online, status, onRetry }: AgentTabProps) {
  const wallet = state.wallets.find((w) => w.ownerId === agent.id)
  const ledger: any[] = wallet?.ledger ?? []

  // eslint-disable-next-line react-hooks/purity -- display-only rolling-week summary; clock read is intentional
  const weekAgo = Date.now() - 7 * 86_400_000
  const thisWeek = ledger.filter((e) => e.type === 'commission' && new Date(e.createdAt).getTime() > weekAgo).reduce((s, e) => s + e.amount, 0)
  const allTime = ledger.filter((e) => e.type === 'commission').reduce((s, e) => s + e.amount, 0)

  return (
    <div className="ios-content">
      <NavLargeTitle title="Wallet" />
      {!online && <Banner tone="offline" />}
      {status === 'error' && <Banner tone="error" onRetry={onRetry} />}

      <HeroCard
        gradient="agent"
        label="Commission balance"
        balance={wallet?.balance ?? 0}
        chips={
          <>
            <Chip onDark>wk {formatNaira(thisWeek)}</Chip>
            <Chip onDark>all {formatNaira(allTime)}</Chip>
          </>
        }
      />

      <SectionHeader>Commissions</SectionHeader>
      {ledger.length === 0 ? (
        <EmptyState icon={<IconWallet width={40} height={40} />} title="No commissions yet" message="You earn 2% on every delivered lot." />
      ) : (
        groupByDay(ledger, (e: any) => e.createdAt).map(([label, entries]) => (
          <DayGroup key={label} date={entries[0].createdAt}>
            <InsetGroup>
              {entries.map((e: any) => (
                <Row
                  key={e.id}
                  title={LEDGER_LABEL[e.type] ?? e.type}
                  subtitle={new Date(e.createdAt).toLocaleString('en-NG', { timeStyle: 'short' })}
                  value={
                    <span style={{ color: e.amount >= 0 ? 'var(--ios-tint)' : '#c93400' }}>
                      {e.amount >= 0 ? '+' : ''}{formatNaira(e.amount)}
                    </span>
                  }
                />
              ))}
            </InsetGroup>
          </DayGroup>
        ))
      )}
    </div>
  )
}
