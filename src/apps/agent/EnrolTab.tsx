'use client'

import { useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { maxAdvance } from '@/domain/finance/finance'
import { ADVANCE_RATE } from '@/domain/config'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Stepper, Toggle, PrimaryButton, SecondaryButton, Sheet } from '@/components/ios/kit'
import { cropGlyph, IconCheck, IconEnrol } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function EnrolTab({ state, agent }: { state: AppState; agent: any }) {
  const open = state.contracts.filter((c) => c.status !== 'closed')
  const [contractId, setContractId] = useState<string | null>(null)
  const [farmerId, setFarmerId] = useState<string | null>(null)
  const [volume, setVolume] = useState(20)
  const [withAdvance, setWithAdvance] = useState(true)
  const [busy, setBusy] = useState(false)
  const [doneMsg, setDoneMsg] = useState<string | null>(null)
  const [newFarmerOpen, setNewFarmerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contract = open.find((c) => c.id === contractId)
  const advance = contract ? maxAdvance({ plannedVolume: volume, bandMin: contract.bandMin, rate: ADVANCE_RATE }) : 0

  async function enrol() {
    setBusy(true)
    try {
      const r = await call('/api/enrollments', 'POST', { contractId, farmerId, agentId: agent.id, plannedVolume: volume, withAdvance })
      if (r.error) {
        setError(String(r.error))
      } else {
        setDoneMsg(withAdvance ? `${formatNaira(r.advance.amount)} advance disbursed` : 'Enrolled — no advance')
        setContractId(null); setFarmerId(null)
      }
    } finally {
      setBusy(false)
    }
  }

  if (doneMsg) {
    return (
      <div className="ios-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="ios-empty">
          <span className="ios-iconsq" style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto', background: 'var(--ios-tint)' }}>
            <IconCheck width={30} height={30} />
          </span>
          <h3>Farmer enrolled</h3>
          <p>{doneMsg}. The farmer got an SMS and can now sell into this contract.</p>
        </div>
        <div style={{ display: 'flex' }}>
          <PrimaryButton onClick={() => setDoneMsg(null)}>Enrol another</PrimaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Enrol" />

      <SectionHeader>Contract</SectionHeader>
      <InsetGroup>
        {open.length === 0 && <Row title="No open contracts" subtitle="Buyer must post demand first" />}
        {open.map((c) => {
          const g = cropGlyph(c.crop)
          return (
            <Row key={c.id} icon={g.icon} iconBg={g.color}
              title={`${cap(c.crop)} · ${c.volume} baskets`}
              subtitle={`band ${formatNaira(c.bandMin)}–${formatNaira(c.bandMax)} · filled ${c.filledVolume}/${c.volume}`}
              selected={contractId === c.id} onClick={() => setContractId(c.id)} />
          )
        })}
      </InsetGroup>

      <SectionHeader>Farmer</SectionHeader>
      <InsetGroup>
        {state.farmers.map((f) => (
          <Row key={f.id} title={f.name} subtitle={`${f.crop} · ${f.phone}`} selected={farmerId === f.id} onClick={() => setFarmerId(f.id)} />
        ))}
        <Row icon={<IconEnrol width={16} height={16} />} title="New farmer…" onClick={() => setNewFarmerOpen(true)} chevron />
      </InsetGroup>

      <SectionHeader>Terms</SectionHeader>
      <InsetGroup footer={contract ? `Advance cap = ${Math.round(ADVANCE_RATE * 100)}% × planned volume × band floor.` : 'Pick a contract to compute the advance.'}>
        <Row title="Planned volume" trailing={<Stepper value={volume} onChange={setVolume} min={1} max={200} />} />
        <Row title="Input advance" subtitle={contract ? `up to ${formatNaira(advance)}` : undefined} trailing={<Toggle on={withAdvance} onChange={setWithAdvance} label="Input advance" />} />
      </InsetGroup>

      {error && <div style={{ color: '#c93400', fontSize: 13, marginTop: 10 }}>{error}</div>}
      <div style={{ display: 'flex', marginTop: 24 }}>
        <PrimaryButton disabled={!contractId || !farmerId} loading={busy} onClick={enrol}>
          {withAdvance && contract ? `Enrol + disburse ${formatNaira(advance)}` : 'Enrol farmer'}
        </PrimaryButton>
      </div>

      <NewFarmerSheet open={newFarmerOpen} onClose={() => setNewFarmerOpen(false)} />
    </div>
  )
}

function NewFarmerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [crop, setCrop] = useState('tomato')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    try {
      const r = await call('/api/farmers', 'POST', { name, phone, crop })
      if (r.error) {
        setError(String(r.error))
      } else {
        setName(''); setPhone(''); setError(null); onClose()
      }
    } finally {
      setBusy(false)
    }
  }

  const input = {
    width: '100%', border: 0, background: 'transparent', font: 'inherit',
    fontSize: 17, outline: 'none', padding: '12px 0',
  } as const

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="ios-title2" style={{ margin: '4px 0 12px' }}>New farmer</h2>
      <InsetGroup>
        <div className="ios-row"><input style={input} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="ios-row"><input style={input} placeholder="Phone (+234…)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      </InsetGroup>
      <div style={{ marginTop: 12 }}>
        <InsetGroup>
          {['tomato', 'pepper', 'onion'].map((c) => (
            <Row key={c} icon={cropGlyph(c).icon} iconBg={cropGlyph(c).color} title={cap(c)} selected={crop === c} onClick={() => setCrop(c)} />
          ))}
        </InsetGroup>
      </div>
      {error && <div style={{ color: '#c93400', fontSize: 13, marginTop: 10 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton disabled={!name || !phone} loading={busy} onClick={save}>Register</PrimaryButton>
      </div>
    </Sheet>
  )
}
