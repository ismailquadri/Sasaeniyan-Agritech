'use client'

import { useState } from 'react'
import { latestIndex, type AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { fairPrice, type Grade } from '@/domain/pricing/pricing'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Sheet, Segmented, PrimaryButton, Pill, EmptyState } from '@/components/ios/kit'
import { cropGlyph, IconTray } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function TodayTab({ state, agent }: { state: AppState; agent: any }) {
  const mine = state.lots.filter((l) => l.agentId === agent.id)
  const picked = mine.filter((l) => l.status === 'picked')
  const done = mine.filter((l) => l.status !== 'picked')
  const [gradingLot, setGradingLot] = useState<any | null>(null)
  const [grade, setGrade] = useState<Grade>('A')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contract = gradingLot?.enrollment?.contract
  const index = contract ? latestIndex(state.marketIndex, contract.crop) : null
  const preview =
    contract && index
      ? fairPrice({ indexPrice: index.indexPrice, grade, bandMin: contract.bandMin, bandMax: contract.bandMax })
      : null

  async function confirmGrade() {
    setBusy(true)
    try {
      const r = await call(`/api/lots/${gradingLot.id}`, 'PATCH', { grade })
      if (r.error) {
        setError(String(r.error))
      } else {
        setGradingLot(null)
        setGrade('A')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Today" />

      <SectionHeader>Pickups to grade</SectionHeader>
      {picked.length === 0 ? (
        <EmptyState icon={<IconTray width={40} height={40} />} title="Queue is clear" message="When a farmer accepts an offer, the pickup lands here." />
      ) : (
        <InsetGroup>
          {picked.map((l) => {
            const g = cropGlyph(l.enrollment?.contract?.crop ?? '')
            return (
              <Row
                key={l.id}
                icon={g.icon}
                iconBg={g.color}
                title={`${l.enrollment?.farmer?.name} · ${cap(l.enrollment?.contract?.crop ?? '')}`}
                subtitle={`${l.quantity} baskets · offered ${formatNaira(l.unitPrice)}/basket`}
                chevron
                onClick={() => { setError(null); setGrade('A'); setGradingLot(l) }}
              />
            )
          })}
        </InsetGroup>
      )}

      <SectionHeader>Aggregated</SectionHeader>
      {done.length === 0 ? (
        <InsetGroup><Row title="Nothing aggregated yet" subtitle="Graded lots roll into buyer orders" /></InsetGroup>
      ) : (
        <InsetGroup>
          {done.map((l) => (
            <Row
              key={l.id}
              title={`${l.enrollment?.farmer?.name} · ${l.quantity} baskets`}
              subtitle={l.traceRef}
              trailing={<Pill tone={l.status === 'delivered' ? 'green' : 'orange'}>{l.status}</Pill>}
              value={`${l.grade}`}
            />
          ))}
        </InsetGroup>
      )}

      <Sheet open={!!gradingLot} onClose={() => setGradingLot(null)}>
        {gradingLot && (
          <div>
            <h2 className="ios-title2" style={{ margin: '4px 0 2px' }}>Grade this lot</h2>
            <div className="ios-caption1" style={{ marginBottom: 14 }}>
              {gradingLot.enrollment?.farmer?.name} · {gradingLot.quantity} baskets · {gradingLot.traceRef}
            </div>
            <Segmented
              options={[{ key: 'A', label: 'Grade A' }, { key: 'B', label: 'Grade B' }, { key: 'C', label: 'Grade C' }]}
              value={grade}
              onChange={(k) => setGrade(k as Grade)}
            />
            <div style={{ marginTop: 14 }}>
              <InsetGroup footer="Price recomputes from the market index at the graded quality, clamped to the contract band.">
                <Row title="Unit price at this grade" value={preview ? formatNaira(preview) : '—'} />
                <Row title={<b>Lot value</b>} value={preview ? <b>{formatNaira(preview * gradingLot.quantity)}</b> : '—'} />
              </InsetGroup>
            </div>
            {error && <div style={{ color: '#c93400', fontSize: 13, marginTop: 10 }}>{error}</div>}
            <div style={{ display: 'flex', marginTop: 16 }}>
              <PrimaryButton loading={busy} onClick={confirmGrade}>Confirm grade {grade}</PrimaryButton>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
