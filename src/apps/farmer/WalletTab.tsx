'use client'

import { useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { netPayout } from '@/domain/finance/finance'
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
  const [receiptLot, setReceiptLot] = useState<any | null>(null)

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
                subtitle={new Date(e.createdAt).toLocaleString()}
                value={
                  <span style={{ color: e.amount >= 0 ? 'var(--ios-tint)' : '#c93400' }}>
                    {e.amount >= 0 ? '+' : ''}{formatNaira(e.amount)}
                  </span>
                }
                chevron={!!lot}
                onClick={lot ? () => setReceiptLot(lot) : undefined}
              />
            )
          })}
        </InsetGroup>
      )}

      <Sheet open={!!receiptLot} onClose={() => setReceiptLot(null)}>
        {receiptLot && <Receipt lot={receiptLot} />}
      </Sheet>
    </div>
  )
}

function Receipt({ lot }: { lot: any }) {
  const saleValue = lot.unitPrice * lot.quantity
  const advance = lot.enrollment?.advance?.amount ?? 0
  const np = netPayout({ saleValue, advance, feeRate: PLATFORM_FEE_RATE, commissionRate: AGENT_COMMISSION_RATE })
  return (
    <div>
      <h2 className="ios-title2" style={{ margin: '4px 0 2px' }}>Payment receipt</h2>
      <div className="ios-caption1" style={{ marginBottom: 14 }}>
        {lot.quantity} baskets · {lot.enrollment?.contract?.crop} · grade {lot.grade} · {lot.traceRef}
      </div>
      <InsetGroup>
        <Row title="Sale value" value={formatNaira(saleValue)} />
        <Row title="Advance repaid" value={`−${formatNaira(np.advanceNetted)}`} />
        <Row title="Platform fee (3%)" value={`−${formatNaira(np.platformFee)}`} />
        <Row title="Agent commission (2%)" value={`−${formatNaira(np.agentCommission)}`} />
        <Row title={<b>Paid to you</b>} value={<b style={{ color: 'var(--ios-tint)' }}>{formatNaira(np.farmerPayout)}</b>} />
      </InsetGroup>
    </div>
  )
}
