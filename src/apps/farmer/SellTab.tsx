'use client'

import { useState } from 'react'
import { indexHistory, latestIndex } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { priceBreakdown, type Grade } from '@/domain/pricing/pricing'
import { CROPS, cropById } from '@/domain/crops'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, PrimaryButton, SecondaryButton, Stepper, Sheet } from '@/components/ios/kit'
import { PhotoCard, Chip, Sparkline, Delta } from '@/components/ios/upgrade'
import { IconCheck } from '@/components/ios/icons'
import type { FarmerTabProps } from './FarmerApp'

export function SellTab({ state, farmer, onToast, onDone }: FarmerTabProps & { onDone: () => void }) {
  const [crop, setCrop] = useState<string | null>(null)
  const [baskets, setBaskets] = useState(10)
  const [offerOpen, setOfferOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sold, setSold] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only contracts this farmer is enrolled on are sellable.
  const contract = crop
    ? state.contracts.find(
        (c) => c.crop === crop && c.status !== 'closed' && c.enrollments?.some((e: any) => e.farmerId === farmer.id),
      )
    : null
  const demandFor = (cropId: string) => state.contracts.find((c) => c.crop === cropId && c.status !== 'closed')
  const idx = crop ? latestIndex(state.marketIndex, crop) : null
  const history = crop ? indexHistory(state.marketIndex, crop) : []
  const bd = contract && idx
    ? priceBreakdown({ indexPrice: idx.indexPrice, grade: contract.grade as Grade, bandMin: contract.bandMin, bandMax: contract.bandMax })
    : null

  async function accept() {
    if (!crop) return
    setBusy(true)
    try {
      const r = await call('/api/harvest', 'POST', { farmerId: farmer.id, crop, baskets })
      if (r.error) {
        setError(typeof r.error === 'string' ? r.error : JSON.stringify(r.error))
        return
      }
      setOfferOpen(false)
      setSold(true)
      onToast('Harvest accepted — agent notified')
    } finally {
      setBusy(false)
    }
  }

  if (sold) {
    const c = cropById(crop ?? '')
    return (
      <div className="ios-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="ios-empty">
          <span className="ios-iconsq" style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto', background: 'var(--ios-tint)' }}>
            <IconCheck width={30} height={30} />
          </span>
          <h3>Harvest accepted</h3>
          <p>{baskets} × {c.unitLabel} of {c.name.toLowerCase()}. Your agent will come to collect. You&apos;ll get an SMS at every step.</p>
        </div>
        <div style={{ display: 'flex' }}>
          <PrimaryButton onClick={() => { setSold(false); setCrop(null); onDone() }}>View wallet</PrimaryButton>
        </div>
      </div>
    )
  }

  const selected = crop ? cropById(crop) : null

  return (
    <div className="ios-content">
      <NavLargeTitle title="Sell harvest" />

      <SectionHeader>1 · Choose crop</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {CROPS.map((c) => {
          const demand = demandFor(c.id)
          const enrolled = demand?.enrollments?.some((e: any) => e.farmerId === farmer.id)
          return (
            <PhotoCard
              key={c.id}
              crop={c}
              sub={demand ? (enrolled ? `${c.unitLabel} · demand open` : 'not enrolled — see your agent') : c.unitLabel}
              badge={demand ? <Chip tone="gold">demand</Chip> : undefined}
              onClick={() => { setCrop(c.id); setError(null) }}
              selected={crop === c.id}
              height={92}
            />
          )
        })}
      </div>

      <SectionHeader>2 · How many {selected ? selected.unit + 's' : 'units'}?</SectionHeader>
      <InsetGroup>
        <Row title={selected ? selected.unitLabel : 'Quantity'} trailing={<Stepper value={baskets} onChange={setBaskets} min={1} max={200} />} />
      </InsetGroup>

      <div style={{ marginTop: 20, display: 'flex' }}>
        <PrimaryButton disabled={!crop || !bd} onClick={() => { setError(null); setOfferOpen(true) }}>
          {crop && !bd ? 'No open contract for this crop' : 'See your fair price'}
        </PrimaryButton>
      </div>

      <Sheet open={offerOpen && !!bd} onClose={() => setOfferOpen(false)}>
        {bd && idx && selected && (
          <div>
            <h2 className="ios-title2" style={{ margin: '4px 0 2px' }}>Your fair price</h2>
            <div className="ios-caption1" style={{ marginBottom: 10 }}>
              {baskets} × {selected.unitLabel} · {selected.name} · grade {bd.grade}
            </div>
            {history.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 12, padding: '8px 12px', marginBottom: 10 }}>
                <Sparkline points={history} width={120} height={28} label={`${selected.name} 7-day price trend`} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>7-day market trend</div>
                  <Delta points={history} />
                </div>
              </div>
            )}
            <InsetGroup footer="The farm-gate price is what the middleman offers in a glut. Your contract band protects you from it.">
              <Row title="Market index (farm-gate)" value={formatNaira(bd.index)} />
              <Row title={`Grade ${bd.grade} factor`} value={`×${bd.factor}`} />
              <Row title="Contract band" value={`${formatNaira(bd.band[0])}–${formatNaira(bd.band[1])}`} />
              <Row
                title={<b>Per {selected.unit}</b>}
                struckValue={formatNaira(idx.indexPrice)}
                value={<b style={{ color: 'var(--ios-tint)' }}>{formatNaira(bd.price)}</b>}
              />
              <Row title={<b>Total ({baskets})</b>} value={<b>{formatNaira(bd.price * baskets)}</b>} />
            </InsetGroup>
            {error && <div style={{ color: '#c93400', fontSize: 13, marginTop: 10 }} role="alert">{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <SecondaryButton onClick={() => setOfferOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton loading={busy} onClick={accept}>Accept offer</PrimaryButton>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
