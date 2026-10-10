'use client'

import { useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { PLATFORM_FEE_RATE, AGENT_COMMISSION_RATE } from '@/domain/config'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Sheet, EmptyState } from '@/components/ios/kit'
import { IconWallet } from '@/components/ios/icons'

const LEDGER_LABEL: Record<string, string> = {
  advance: 'Input advance',
  payout: 'Harvest payout',
  commission: 'Commission',
  fee: 'Platform fee',
  escrow_fund: 'Escrow',
  escrow_release: 'Escrow release',
}

export function WalletTab({ state, farmer }: { state: AppState; farmer: any }) {
  const wallet = state.wallets.find((w) => w.ownerId === farmer.id)
  const ledger: any[] = wallet?.ledger ?? []
  const [receipt, setReceipt] = useState<{ lot: any; entry: any } | null>(null)

  // Delivered lots for this farmer → receipt detail source.
  const deliveredLots = state.lots.filter(
    (l) => l.enrollment?.farmer?.id === farmer.id && l.status === 'delivered',
  )
  const lotForLedger = (entry: any) => deliveredLots.find((l) => l.id === entry.ref)

  return (
    <div className="ios-content">
      <NavLargeTitle title="Wallet" />
      <div className="ios-balancecard">
        <div className="ios-caption1">Available balance</div>
        <div className="ios-balance">{formatNaira(wallet?.balance ?? 0)}</div>
      </div>

      <SectionHeader>Activity</SectionHeader>
      {ledger.length === 0 ? (
        <EmptyState icon={<IconWallet width={40} height={40} />} title="No activity yet" message="Advances and payouts appear here." />
      ) : (
        <InsetGroup footer="Tap a payout for the itemised receipt.">
          {ledger.map((e) => {
            const lot = e.type === 'payout' ? lotForLedger(e) : null
            return (
              <Row
                key={e.id}
                title={LEDGER_LABEL[e.type] ?? e.type}
                subtitle={new Date(e.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                value={
                  <span style={{ color: e.amount >= 0 ? 'var(--ios-tint)' : '#c93400' }}>
                    {e.amount >= 0 ? '+' : ''}{formatNaira(e.amount)}
                  </span>
                }
                chevron={!!lot}
                onClick={lot ? () => setReceipt({ lot, entry: e }) : undefined}
              />
            )
          })}
        </InsetGroup>
      )}

      <Sheet open={!!receipt} onClose={() => setReceipt(null)}>
        {receipt && <Receipt lot={receipt.lot} entry={receipt.entry} />}
      </Sheet>
    </div>
  )
}

function Receipt({ lot, entry }: { lot: any; entry: any }) {
  // Derived from the tapped ledger entry: paid = entry.amount, so the advance
  // netted is exact by construction (handles no-advance and multi-lot cases).
  const saleValue = lot.unitPrice * lot.quantity
  const platformFee = Math.round(saleValue * PLATFORM_FEE_RATE)
  const agentCommission = Math.round(saleValue * AGENT_COMMISSION_RATE)
  const advanceNetted = saleValue - platformFee - agentCommission - entry.amount
  return (
    <div>
      <h2 className="ios-title2" style={{ margin: '4px 0 2px' }}>Payment receipt</h2>
      <div className="ios-caption1" style={{ marginBottom: 14 }}>
        {lot.quantity} baskets · {lot.enrollment?.contract?.crop} · grade {lot.grade} · {lot.traceRef}
      </div>
      <InsetGroup>
        <Row title="Sale value" value={formatNaira(saleValue)} />
        <Row title="Advance repaid" value={`−${formatNaira(advanceNetted)}`} />
        <Row title="Platform fee (3%)" value={`−${formatNaira(platformFee)}`} />
        <Row title="Agent commission (2%)" value={`−${formatNaira(agentCommission)}`} />
        <Row title={<b>Paid to you</b>} value={<b style={{ color: 'var(--ios-tint)' }}>{formatNaira(entry.amount)}</b>} />
      </InsetGroup>
    </div>
  )
}
