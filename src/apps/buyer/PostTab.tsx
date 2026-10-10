'use client'

import { useState } from 'react'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Stepper, PrimaryButton } from '@/components/ios/kit'
import { cropGlyph } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function PostTab({ buyer, onPosted }: { buyer: any; onPosted: () => void }) {
  const [crop, setCrop] = useState('tomato')
  const [volume, setVolume] = useState(50)
  const [bandMin, setBandMin] = useState(5000)
  const [bandMax, setBandMax] = useState(9000)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function post() {
    setBusy(true)
    setError(null)
    try {
      const r = await call('/api/contracts', 'POST', { buyerId: buyer.id, crop, grade: 'A', volume, bandMin, bandMax, windowDays: 14 })
      if (r.error) {
        setError(typeof r.error === 'string' ? r.error : 'Could not post demand. Check the details and try again.')
      } else {
        onPosted()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Post demand" />

      <SectionHeader>Crop</SectionHeader>
      <InsetGroup>
        {['tomato', 'pepper', 'onion'].map((c) => (
          <Row key={c} icon={cropGlyph(c).icon} iconBg={cropGlyph(c).color} title={cap(c)} selected={crop === c} onClick={() => setCrop(c)} />
        ))}
      </InsetGroup>

      <SectionHeader>Volume &amp; price band (₦/basket)</SectionHeader>
      <InsetGroup footer="The band is the farmer's protection: the fair price is clamped inside it whatever the market does.">
        <Row title="Volume (baskets)" trailing={<Stepper value={volume} onChange={setVolume} min={10} max={500} step={10} />} />
        <Row title="Band floor" trailing={<Stepper value={bandMin} onChange={(n) => setBandMin(Math.min(n, bandMax - 500))} min={1000} max={bandMax - 500} step={500} />} />
        <Row title="Band ceiling" trailing={<Stepper value={bandMax} onChange={(n) => setBandMax(Math.max(n, bandMin + 500))} min={bandMin + 500} max={30000} step={500} />} />
      </InsetGroup>

      {error && <div style={{ color: '#c93400', fontSize: 13, margin: '10px 16px 0' }}>{error}</div>}

      <div style={{ display: 'flex', marginTop: 24 }}>
        <PrimaryButton loading={busy} onClick={post}>Post forward contract</PrimaryButton>
      </div>
    </div>
  )
}
