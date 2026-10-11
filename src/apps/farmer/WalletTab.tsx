'use client'

import { useState } from 'react'
import { formatNaira } from '@/lib/money'
import { PLATFORM_FEE_RATE, AGENT_COMMISSION_RATE, ADVANCE_RATE_BY_LEVEL } from '@/domain/config'
import { creditLevel, LEVEL_THRESHOLDS } from '@/domain/credit'
import { cropById } from '@/domain/crops'
import { t } from '@/domain/i18n/strings'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Sheet, EmptyState, Progress } from '@/components/ios/kit'
import { HeroCard, Chip, DayGroup, groupByDay, Banner } from '@/components/ios/upgrade'
import { IconWallet, IconShield } from '@/components/ios/icons'
import type { FarmerTabProps } from './FarmerApp'

const LEDGER_LABEL: Record<string, string> = {
  advance: 'Input advance',
  payout: 'Harvest payout',
  commission: 'Commission',
  fee: 'Platform fee',
  withdrawal: 'Cash withdrawal',
  escrow_fund: 'Escrow',
  escrow_release: 'Escrow release',
}

export function WalletTab({ state, farmer, online, status, onRetry, onToast }: FarmerTabProps) {
  const wallet = state.wallets.find((w) => w.ownerId === farmer.id)
  const ledger: any[] = wallet?.ledger ?? []
  const [receipt, setReceipt] = useState<{ lot: any; entry: any } | null>(null)
  const [reviewBusy, setReviewBusy] = useState(false)

  const level = creditLevel(farmer.creditScore ?? 0)
  const nextThreshold = level === 1 ? LEVEL_THRESHOLDS[2] : level === 2 ? LEVEL_THRESHOLDS[3] : null
  const progressPct = nextThreshold
    ? Math.min(100, Math.round(((farmer.creditScore ?? 0) / nextThreshold) * 100))
    : 100

  const myLots = state.lots.filter((l) => l.enrollment?.farmer?.id === farmer.id)
  const lotForLedger = (entry: any) => myLots.find((l) => l.id === entry.ref)
  const rejected = myLots.filter((l) => l.status === 'rejected')
  const agentPhone = state.agents[0]?.phone

  async function requestReview() {
    setReviewBusy(true)
    try {
      const r = await call('/api/messages', 'POST', {
        toPhone: agentPhone,
        body: t('reviewRequested', 'en', { name: farmer.name }),
        lang: 'en',
      })
      if (!r.error) onToast('Review requested — agent notified')
    } finally {
      setReviewBusy(false)
    }
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Wallet" />
      {!online && <Banner tone="offline" />}
      {status === 'error' && <Banner tone="error" onRetry={onRetry} />}

      <HeroCard
        gradient="farmer"
        label="Available balance"
        balance={wallet?.balance ?? 0}
        chips={
          <>
            {farmer.ndfrVerified && <Chip onDark icon={<IconShield width={11} height={11} />}>NDFR</Chip>}
            <Chip onDark>Credit L{level}</Chip>
          </>
        }
      />

      <SectionHeader>Credit journey</SectionHeader>
      <InsetGroup
        footer={
          nextThreshold
            ? `Advance cap now ${Math.round(ADVANCE_RATE_BY_LEVEL[level] * 100)}% of planned value — reaches ${Math.round(ADVANCE_RATE_BY_LEVEL[(level + 1) as 2 | 3] * 100)}% at level ${level + 1}. Every repaid cycle builds your score.`
            : `Top level reached — advances at ${Math.round(ADVANCE_RATE_BY_LEVEL[3] * 100)}% of planned value.`
        }
      >
        <Row
          title={`Level ${level}`}
          subtitle={nextThreshold ? `${farmer.creditScore}/${nextThreshold} to level ${level + 1}` : 'highest level'}
          trailing={<div style={{ width: 90 }}><Progress pct={progressPct} /></div>}
        />
      </InsetGroup>

      {rejected.length > 0 && (
        <>
          <SectionHeader>Needs attention</SectionHeader>
          <InsetGroup footer="A rejected lot is not the end — ask your agent for a re-inspection.">
            {rejected.map((l) => (
              <div key={l.id} className="ios-row" style={{ alignItems: 'flex-start' }}>
                <span className="ios-rowbody">
                  <span className="ios-rowtitle" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {l.quantity} × {cropById(l.enrollment?.contract?.crop ?? '').name}
                    <Chip tone="danger">rejected</Chip>
                  </span>
                  <span className="ios-rowsub" style={{ display: 'block' }}>{l.traceRef}</span>
                </span>
                <button
                  type="button"
                  className="ios-btn-secondary"
                  style={{ flex: 'none', minHeight: 34, height: 34, fontSize: 13, padding: '0 12px' }}
                  disabled={reviewBusy || !agentPhone}
                  onClick={requestReview}
                >
                  Request review
                </button>
              </div>
            ))}
          </InsetGroup>
        </>
      )}

      <SectionHeader>Activity</SectionHeader>
      {ledger.length === 0 ? (
        <EmptyState icon={<IconWallet width={40} height={40} />} title="No activity yet" message="Advances and payouts appear here." />
      ) : (
        groupByDay(ledger, (e: any) => e.createdAt).map(([label, entries]) => (
          <DayGroup key={label} date={entries[0].createdAt}>
            <InsetGroup>
              {entries.map((e: any) => {
                const lot = e.type === 'payout' ? lotForLedger(e) : null
                const crop = lot ? cropById(lot.enrollment?.contract?.crop ?? '') : null
                return (
                  <Row
                    key={e.id}
                    photo={crop ? { src: crop.photo, alt: crop.name, fallback: crop.fallback } : undefined}
                    title={LEDGER_LABEL[e.type] ?? e.type}
                    subtitle={new Date(e.createdAt).toLocaleString('en-NG', { timeStyle: 'short' })}
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
          </DayGroup>
        ))
      )}

      <Sheet open={!!receipt} onClose={() => setReceipt(null)}>
        {receipt && <Receipt lot={receipt.lot} entry={receipt.entry} />}
      </Sheet>
    </div>
  )
}

function Receipt({ lot, entry }: { lot: any; entry: any }) {
  // Derived from the money that actually moved (the tapped ledger entry) —
  // exact for no-advance, netted-advance, and multi-lot cases alike.
  const saleValue = lot.unitPrice * lot.quantity
  const platformFee = Math.round(saleValue * PLATFORM_FEE_RATE)
  const agentCommission = Math.round(saleValue * AGENT_COMMISSION_RATE)
  const advanceNetted = saleValue - platformFee - agentCommission - entry.amount
  const crop = cropById(lot.enrollment?.contract?.crop ?? '')
  return (
    <div>
      <h2 className="ios-title2" style={{ margin: '4px 0 2px' }}>Payment receipt</h2>
      <div className="ios-caption1" style={{ marginBottom: 14 }}>
        {lot.quantity} × {crop.unitLabel} · {crop.name} · grade {lot.grade} · {lot.traceRef}
      </div>
      <InsetGroup>
        <Row title="Sale value" value={formatNaira(saleValue)} />
        <Row title="Advance repaid" value={`−${formatNaira(advanceNetted)}`} />
        <Row title={`Platform fee (${Math.round(PLATFORM_FEE_RATE * 100)}%)`} value={`−${formatNaira(platformFee)}`} />
        <Row title={`Agent commission (${Math.round(AGENT_COMMISSION_RATE * 100)}%)`} value={`−${formatNaira(agentCommission)}`} />
        <Row title={<b>Paid to you</b>} value={<b style={{ color: 'var(--ios-tint)' }}>{formatNaira(entry.amount)}</b>} />
      </InsetGroup>
    </div>
  )
}
