'use client'

import { useState } from 'react'
import { CROPS, cropById } from '@/domain/crops'
import { latestIndex } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { naira } from '@/lib/money'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Stepper, PrimaryButton, Segmented } from '@/components/ios/kit'
import { PhotoCard, Banner } from '@/components/ios/upgrade'
import type { BuyerTabProps } from './BuyerApp'

export function PostTab({ state, buyer, online, status, onRetry, onToast, onPosted }: BuyerTabProps & { onPosted: () => void }) {
  const [crop, setCrop] = useState('tomato')
  const [grade, setGrade] = useState<'A' | 'B' | 'C'>('A')
  const [volume, setVolume] = useState(50)
  const [bandMin, setBandMin] = useState(5000)
  const [bandMax, setBandMax] = useState(9000)
  const [windowDays, setWindowDays] = useState(14)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = cropById(crop)
  const idx = latestIndex(state.marketIndex, crop)

  async function post() {
    setBusy(true)
    setError(null)
    try {
      const r = await call('/api/contracts', 'POST', { buyerId: buyer.id, crop, grade, volume, bandMin, bandMax, windowDays })
      if (r.error) {
        setError(typeof r.error === 'string' ? r.error : 'Could not post demand. Check the details and try again.')
      } else {
        onToast('Forward contract posted')
        onPosted()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Post demand" />
      {!online && <Banner tone="offline" />}
      {status === 'error' && <Banner tone="error" onRetry={onRetry} />}

      <SectionHeader>Crop</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {CROPS.map((c) => (
          <PhotoCard
            key={c.id}
            crop={c}
            sub={c.unitLabel}
            onClick={() => setCrop(c.id)}
            selected={crop === c.id}
            height={78}
          />
        ))}
      </div>
      {idx && (
        <div className="ios-footnote" style={{ marginTop: 8 }}>
          Current {selected.name.toLowerCase()} market index: {formatNaira(idx.indexPrice)} per {selected.unit}.
        </div>
      )}

      <SectionHeader>Grade</SectionHeader>
      <Segmented
        options={[{ key: 'A', label: 'Grade A' }, { key: 'B', label: 'Grade B' }, { key: 'C', label: 'Grade C' }]}
        value={grade}
        onChange={(k) => setGrade(k as 'A' | 'B' | 'C')}
      />

      <SectionHeader>Volume · band (₦/{selected.unit}) · window</SectionHeader>
      <InsetGroup footer="The band is the farmer's protection: the fair price is clamped inside it whatever the market does.">
        <Row title={`Volume (${selected.unit}s)`} trailing={<Stepper value={volume} onChange={setVolume} min={10} max={500} step={10} />} />
        <Row title="Band floor" trailing={<Stepper value={bandMin} onChange={(n) => setBandMin(Math.min(n, bandMax - 500))} min={1000} max={bandMax - 500} step={500} />} />
        <Row title="Band ceiling" trailing={<Stepper value={bandMax} onChange={(n) => setBandMax(Math.max(n, bandMin + 500))} min={bandMin + 500} max={200000} step={500} />} />
        <Row title="Delivery window" value={`${windowDays} days`} trailing={<Stepper value={windowDays} onChange={setWindowDays} min={7} max={30} step={1} />} />
      </InsetGroup>

      {error && <div style={{ color: '#c93400', fontSize: 13, margin: '10px 16px 0' }} role="alert">{error}</div>}

      <div style={{ display: 'flex', marginTop: 20 }}>
        <PrimaryButton loading={busy} onClick={post}>
          Post · {volume} {selected.unit}s · {formatNaira(naira(bandMin))}–{formatNaira(naira(bandMax))}
        </PrimaryButton>
      </div>
    </div>
  )
}
