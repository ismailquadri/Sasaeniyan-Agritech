'use client'

import { useState } from 'react'
import { latestIndex, type AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { fairPrice, type Grade } from '@/domain/pricing/pricing'
import { creditLevel } from '@/domain/credit'
import { cropById } from '@/domain/crops'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Sheet, Segmented, PrimaryButton, SecondaryButton, EmptyState } from '@/components/ios/kit'
import { Chip, JourneyTracker, Banner } from '@/components/ios/upgrade'
import { IconTray } from '@/components/ios/icons'
import type { AgentTabProps } from './AgentApp'

const QUICK_REASONS = ['moisture above 14% at pickup', 'poor grading quality', 'short quantity at pickup']

export function TodayTab({ state, agent, online, status, onRetry, onToast }: AgentTabProps) {
  const mine = state.lots.filter((l) => l.agentId === agent.id)
  const picked = mine.filter((l) => l.status === 'picked')
  const rejectedLots = mine.filter((l) => l.status === 'rejected')
  const done = mine.filter((l) => l.status === 'aggregated' || l.status === 'delivered')
  const [gradingLot, setGradingLot] = useState<any | null>(null)
  const [grade, setGrade] = useState<Grade>('A')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [reason, setReason] = useState('')

  const contract = gradingLot?.enrollment?.contract
  const index = contract ? latestIndex(state.marketIndex, contract.crop) : null
  const preview =
    contract && index
      ? fairPrice({ indexPrice: index.indexPrice, grade, bandMin: contract.bandMin, bandMax: contract.bandMax })
      : null

  // Rejection reasons live on the LOT_REJECTED events (demo-level audit trail).
  const reasonFor = (lotId: string) =>
    state.events.find((e) => e.type === 'LOT_REJECTED' && e.payload?.lotId === lotId)?.payload?.reason

  function closeSheet() {
    setGradingLot(null)
    setRejectMode(false)
    setReason('')
    setError(null)
  }

  async function confirmGrade() {
    setBusy(true)
    try {
      const r = await call(`/api/lots/${gradingLot.id}`, 'PATCH', { grade })
      if (r.error) {
        setError(typeof r.error === 'string' ? r.error : JSON.stringify(r.error))
      } else {
        onToast(`Graded ${grade} — order updated`)
        closeSheet()
        setGrade('A')
      }
    } finally {
      setBusy(false)
    }
  }

  async function confirmReject() {
    setBusy(true)
    try {
      const r = await call(`/api/lots/${gradingLot.id}`, 'PATCH', { action: 'reject', reason })
      if (r.error) {
        setError(typeof r.error === 'string' ? r.error : JSON.stringify(r.error))
      } else {
        onToast('Lot rejected — farmer notified')
        closeSheet()
      }
    } finally {
      setBusy(false)
    }
  }

  const lotCrop = (l: any) => cropById(l.enrollment?.contract?.crop ?? '')
  const journeyFor = (l: any) => {
    const order = l.orderId ? state.orders.find((o) => o.id === l.orderId) : null
    return l.status === 'delivered' ? 2 : order?.status === 'funded' ? 1 : 0
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Today" trailing={<div className="ios-avatar">{agent.name[0]}</div>} />
      {!online && <Banner tone="offline" />}
      {status === 'error' && <Banner tone="error" onRetry={onRetry} />}

      <SectionHeader>Pickups to grade</SectionHeader>
      {picked.length === 0 ? (
        <EmptyState icon={<IconTray width={40} height={40} />} title="Queue is clear" message="When a farmer accepts an offer, the pickup lands here." />
      ) : (
        <InsetGroup>
          {picked.map((l) => {
            const crop = lotCrop(l)
            const farmer = l.enrollment?.farmer
            return (
              <Row
                key={l.id}
                photo={{ src: crop.photo, alt: crop.name, fallback: crop.fallback }}
                title={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {farmer?.name} · {crop.name}
                    <Chip tone="neutral">L{creditLevel(farmer?.creditScore ?? 0)}</Chip>
                  </span>
                }
                subtitle={`${l.quantity} × ${crop.unitLabel} · offered ${formatNaira(l.unitPrice)}/${crop.unit}`}
                chevron
                onClick={() => { setError(null); setGrade('A'); setRejectMode(false); setReason(''); setGradingLot(l) }}
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
          {done.map((l) => {
            const crop = lotCrop(l)
            return (
              <div key={l.id} className="ios-row" style={{ alignItems: 'center' }}>
                <img className="ios-rowphoto" src={crop.photo} alt={crop.name} width={32} height={32} style={{ background: crop.fallback }} />
                <span className="ios-rowbody">
                  <span className="ios-rowtitle">{l.enrollment?.farmer?.name} · {l.quantity} × {crop.unit}</span>
                  <span className="ios-rowsub" style={{ display: 'block' }}>{l.traceRef} · grade {l.grade}</span>
                </span>
                <div style={{ width: 110 }}>
                  <JourneyTracker steps={['Graded', 'Funded', 'Paid']} current={journeyFor(l)} />
                </div>
              </div>
            )
          })}
        </InsetGroup>
      )}

      {rejectedLots.length > 0 && (
        <>
          <SectionHeader>Rejected</SectionHeader>
          <InsetGroup footer="Rejected lots don't count toward the contract. The farmer was notified by SMS with the reason.">
            {rejectedLots.map((l) => {
              const crop = lotCrop(l)
              return (
                <Row
                  key={l.id}
                  photo={{ src: crop.photo, alt: crop.name, fallback: crop.fallback }}
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {l.enrollment?.farmer?.name} · {l.quantity} × {crop.unit}
                      <Chip tone="danger">rejected</Chip>
                    </span>
                  }
                  subtitle={reasonFor(l.id) ?? l.traceRef}
                />
              )
            })}
          </InsetGroup>
        </>
      )}

      <Sheet open={!!gradingLot} onClose={closeSheet}>
        {gradingLot && (
          <div>
            <h2 className="ios-title2" style={{ margin: '4px 0 2px' }}>{rejectMode ? 'Reject this lot' : 'Grade this lot'}</h2>
            <div className="ios-caption1" style={{ marginBottom: 14 }}>
              {gradingLot.enrollment?.farmer?.name} · {gradingLot.quantity} × {lotCrop(gradingLot).unitLabel} · {gradingLot.traceRef}
            </div>

            {!rejectMode ? (
              <>
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
                {error && <div style={{ color: '#c93400', fontSize: 13, marginTop: 10 }} role="alert">{error}</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    className="ios-btn-secondary"
                    style={{ color: '#c0392b' }}
                    onClick={() => { setRejectMode(true); setError(null) }}
                  >
                    Reject…
                  </button>
                  <PrimaryButton loading={busy} onClick={confirmGrade}>Confirm grade {grade}</PrimaryButton>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {QUICK_REASONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setReason(q)}
                      className="ios-chip danger"
                      style={{ border: reason === q ? '1.5px solid #c0392b' : '1.5px solid transparent', cursor: 'pointer', fontSize: 12, padding: '6px 10px' }}
                      aria-pressed={reason === q}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <InsetGroup footer="The farmer gets an SMS with this reason and can request a review.">
                  <div className="ios-row">
                    <input
                      style={{ width: '100%', border: 0, background: 'transparent', font: 'inherit', fontSize: 16, outline: 'none', padding: '10px 0' }}
                      aria-label="Rejection reason"
                      placeholder="Reason (required)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </InsetGroup>
                {error && <div style={{ color: '#c93400', fontSize: 13, marginTop: 10 }} role="alert">{error}</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <SecondaryButton onClick={() => setRejectMode(false)}>Back</SecondaryButton>
                  <button
                    type="button"
                    className="ios-btn-primary"
                    style={{ background: '#c0392b' }}
                    disabled={reason.trim().length < 4 || busy}
                    onClick={confirmReject}
                  >
                    {busy ? '…' : 'Reject lot'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}
