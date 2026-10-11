'use client'

import { useState } from 'react'
import { formatNaira } from '@/lib/money'
import { indexHistory, latestIndex } from '@/lib/useAppState'
import { fairPrice, type Grade } from '@/domain/pricing/pricing'
import { creditLevel } from '@/domain/credit'
import { CROPS, cropById } from '@/domain/crops'
import { SectionHeader, InsetGroup, Row, Sheet } from '@/components/ios/kit'
import { HeroCard, HeroAction, Chip, Sparkline, Delta, JourneyTracker, PhotoThumb, Banner } from '@/components/ios/upgrade'
import { IconShield } from '@/components/ios/icons'
import type { FarmerTabProps } from './FarmerApp'

const JOURNEY_STEPS = ['Accepted', 'Pickup', 'Graded', 'Paid']

function greetingHa() {
  const h = new Date().getHours()
  if (h < 12) return 'Barka da safiya ☀️'
  if (h < 17) return 'Barka da rana 🌤'
  return 'Barka da yamma 🌙'
}

export function HomeTab({
  state, farmer, online, status, onRetry, onSell, onWallet,
}: FarmerTabProps & { onSell: () => void; onWallet: () => void }) {
  const [allPrices, setAllPrices] = useState(false)
  const wallet = state.wallets.find((w) => w.ownerId === farmer.id)
  const level = creditLevel(farmer.creditScore ?? 0)

  const hasUnread = state.messages.some(
    // eslint-disable-next-line react-hooks/purity -- display-only freshness dot; clock read is intentional
    (m) => m.toPhone === farmer.phone && Date.now() - new Date(m.createdAt).getTime() < 86_400_000,
  )

  // Active sale = this farmer's most recent lot still in motion.
  const active = state.lots.find(
    (l) => l.enrollment?.farmer?.id === farmer.id && (l.status === 'picked' || l.status === 'aggregated'),
  )
  const journeyCurrent = active?.status === 'picked' ? 1 : 2

  const openContractFor = (crop: string) =>
    state.contracts.find((c) => c.crop === crop && c.status !== 'closed' && c.status !== 'filled')

  const priceRow = (cropId: string) => {
    const crop = cropById(cropId)
    const history = indexHistory(state.marketIndex, cropId)
    const c = openContractFor(cropId)
    const idx = latestIndex(state.marketIndex, cropId)
    const fp = c && idx
      ? fairPrice({ indexPrice: idx.indexPrice, grade: c.grade as Grade, bandMin: c.bandMin, bandMax: c.bandMax })
      : null
    return (
      <Row
        key={cropId}
        photo={{ src: crop.photo, alt: crop.name, fallback: crop.fallback }}
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{crop.name}{c ? <Chip tone="success">demand</Chip> : null}</span>}
        subtitle={crop.unitLabel}
        trailing={
          history.length > 1 ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkline points={history} label={`${crop.name} 7-day price trend`} />
              <Delta points={history} />
            </span>
          ) : undefined
        }
        value={formatNaira(fp ?? idx?.indexPrice ?? 0)}
      />
    )
  }

  return (
    <div className="ios-content">
      <div className="ios-nav">
        <div>
          <div className="ios-caption1">{greetingHa()} · Kano</div>
          <h1 className="ios-title2" style={{ marginTop: 1 }}>{farmer.name}</h1>
        </div>
        <div style={{ position: 'relative' }}>
          <div className="ios-avatar">{farmer.name[0]}</div>
          {hasUnread && (
            <span
              style={{ position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: '#FF3B30', border: '1.5px solid var(--ios-bg)' }}
              role="status"
              aria-label="new messages"
            />
          )}
        </div>
      </div>

      {!online && <Banner tone="offline" />}
      {status === 'error' && <Banner tone="error" onRetry={onRetry} />}

      <HeroCard
        gradient="farmer"
        label="Wallet balance"
        balance={wallet?.balance ?? 0}
        chips={
          <>
            {farmer.ndfrVerified && <Chip onDark icon={<IconShield width={11} height={11} />}>NDFR</Chip>}
            <Chip onDark>Credit L{level}</Chip>
          </>
        }
      >
        <HeroAction primary onClick={onSell}>Sell harvest</HeroAction>
        <HeroAction onClick={onWallet}>History</HeroAction>
      </HeroCard>

      {active && (
        <>
          <SectionHeader>Active sale</SectionHeader>
          <div className="ios-group" style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <PhotoThumb crop={cropById(active.enrollment?.contract?.crop ?? '')} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {active.quantity} × {cropById(active.enrollment?.contract?.crop ?? '').unitLabel}
                </div>
                <div className="ios-caption1">{active.traceRef}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }} className="tnum">
                {formatNaira(active.unitPrice * active.quantity)}
              </div>
            </div>
            <JourneyTracker steps={JOURNEY_STEPS} current={journeyCurrent} />
          </div>
        </>
      )}

      <SectionHeader>Market · Kano</SectionHeader>
      <InsetGroup footer="Fair price = market index × grade factor, kept inside the contract band. Trends show the last 7 days.">
        {CROPS.slice(0, 5).map((c) => priceRow(c.id))}
        <Row
          title={<span style={{ color: 'var(--ios-tint)', fontWeight: 600 }}>See all {CROPS.length} crops</span>}
          onClick={() => setAllPrices(true)}
          chevron
        />
      </InsetGroup>

      {(wallet?.ledger?.length ?? 0) > 0 && (
        <>
          <SectionHeader>Recent activity</SectionHeader>
          <InsetGroup>
            {(wallet!.ledger as any[]).slice(0, 2).map((e) => (
              <Row
                key={e.id}
                title={e.type === 'advance' ? 'Input advance' : e.type === 'payout' ? 'Harvest payout' : e.type}
                subtitle={new Date(e.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                value={
                  <span style={{ color: e.amount >= 0 ? 'var(--ios-tint)' : '#c93400' }}>
                    {e.amount >= 0 ? '+' : ''}{formatNaira(e.amount)}
                  </span>
                }
              />
            ))}
          </InsetGroup>
        </>
      )}

      <Sheet open={allPrices} onClose={() => setAllPrices(false)}>
        <h2 className="ios-title2" style={{ margin: '4px 0 12px' }}>Market · all crops</h2>
        <InsetGroup>{CROPS.map((c) => priceRow(c.id))}</InsetGroup>
      </Sheet>
    </div>
  )
}
