'use client'

import { useState } from 'react'
import { latestIndex, type AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { priceBreakdown, type Grade } from '@/domain/pricing/pricing'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, PrimaryButton, SecondaryButton, Stepper, Sheet, EmptyState } from '@/components/ios/kit'
import { cropGlyph, IconCheck, IconLeaf } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function SellTab({ state, farmer, onDone }: { state: AppState; farmer: any; onDone: () => void }) {
  const [crop, setCrop] = useState<string | null>(null)
  const [baskets, setBaskets] = useState(10)
  const [offerOpen, setOfferOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sold, setSold] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only contracts this farmer is enrolled in are sellable.
  const contract = crop
    ? state.contracts.find(
        (c) => c.crop === crop && c.status !== 'closed' && c.enrollments?.some((e: any) => e.farmerId === farmer.id),
      )
    : null
  const index = crop ? latestIndex(state.marketIndex, crop) : null
  const bd =
    contract && index
      ? priceBreakdown({ indexPrice: index.indexPrice, grade: contract.grade as Grade, bandMin: contract.bandMin, bandMax: contract.bandMax })
      : null

  async function accept() {
    if (!crop) return
    setBusy(true)
    try {
      const r = await call('/api/harvest', 'POST', { farmerId: farmer.id, crop, baskets })
      if (r.error) {
        setError(String(r.error))
      } else {
        setOfferOpen(false)
        setSold(true)
      }
    } finally {
      setBusy(false)
    }
  }

  if (sold) {
    return (
      <div className="ios-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="ios-empty">
          <span className="ios-iconsq" style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto', background: 'var(--ios-tint)' }}>
            <IconCheck width={30} height={30} />
          </span>
          <h3>Harvest accepted</h3>
          <p>{baskets} baskets of {crop}. Your agent will come to collect. You&apos;ll get an SMS at every step.</p>
        </div>
        <div style={{ display: 'flex' }}>
          <PrimaryButton onClick={() => { setSold(false); setCrop(null); onDone() }}>View wallet</PrimaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Sell harvest" />

      <SectionHeader>1 · Choose crop</SectionHeader>
      <InsetGroup>
        {state.marketIndex.map((m) => {
          const g = cropGlyph(m.crop)
          const open = state.contracts.filter((c) => c.crop === m.crop && c.status !== 'closed')
          const enrolled = open.some((c) => c.enrollments?.some((e: any) => e.farmerId === farmer.id))
          return (
            <Row
              key={m.id}
              icon={g.icon}
              iconBg={g.color}
              title={cap(m.crop)}
              subtitle={enrolled ? 'buyer demand open' : open.length > 0 ? 'not enrolled — see your agent' : 'no open demand'}
              selected={crop === m.crop}
              onClick={() => setCrop(m.crop)}
            />
          )
        })}
      </InsetGroup>

      <SectionHeader>2 · How many baskets?</SectionHeader>
      <InsetGroup>
        <Row title="Baskets" trailing={<Stepper value={baskets} onChange={setBaskets} min={1} max={200} />} />
      </InsetGroup>

      <div style={{ marginTop: 24, display: 'flex' }}>
        <PrimaryButton disabled={!crop || !bd} onClick={() => { setError(null); setOfferOpen(true) }}>
          {crop && !bd ? 'No open contract for this crop' : 'See your fair price'}
        </PrimaryButton>
      </div>
      {!crop && (
        <EmptyState icon={<IconLeaf width={36} height={36} />} title="Pick a crop to start" message="We only buy against real buyer demand — that's what guarantees your price." />
      )}

      <Sheet open={offerOpen && !!bd} onClose={() => setOfferOpen(false)}>
        {bd && index && (
          <div>
            <h2 className="ios-title2" style={{ margin: '4px 0 2px' }}>Your fair price</h2>
            <div className="ios-caption1" style={{ marginBottom: 14 }}>{baskets} baskets · {cap(crop!)} · grade {bd.grade}</div>
            <InsetGroup footer="The farm-gate price is what the middleman offers in a glut. Your contract band protects you from it.">
              <Row title="Market index (farm-gate)" value={formatNaira(bd.index)} />
              <Row title={`Grade ${bd.grade} factor`} value={`×${bd.factor}`} />
              <Row title="Contract band" value={`${formatNaira(bd.band[0])}–${formatNaira(bd.band[1])}`} />
              <Row title={<b>Per basket</b>} struckValue={formatNaira(index.indexPrice)} value={<b style={{ color: 'var(--ios-tint)' }}>{formatNaira(bd.price)}</b>} />
              <Row title={<b>Total ({baskets} baskets)</b>} value={<b>{formatNaira(bd.price * baskets)}</b>} />
            </InsetGroup>
            {error && <div style={{ color: '#c93400', fontSize: 13, marginTop: 10 }}>{error}</div>}
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
