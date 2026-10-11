'use client'

import { useEffect, useState } from 'react'
import { formatNaira } from '@/lib/money'
import { maxAdvance } from '@/domain/finance/finance'
import { advanceRateFor, creditLevel } from '@/domain/credit'
import { CROPS, cropById } from '@/domain/crops'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Stepper, Toggle, PrimaryButton, SecondaryButton, Sheet } from '@/components/ios/kit'
import { Chip, Banner } from '@/components/ios/upgrade'
import { IconCheck, IconEnrol } from '@/components/ios/icons'
import type { AgentTabProps } from './AgentApp'

export function EnrolTab({ state, agent, online, status, onRetry, onToast }: AgentTabProps) {
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
  const farmer = state.farmers.find((f) => f.id === farmerId)
  const rate = advanceRateFor(farmer?.creditScore ?? 0)
  const advance = contract ? maxAdvance({ plannedVolume: volume, bandMin: contract.bandMin, rate }) : 0
  // Farmers already enrolled on the selected contract can't be enrolled twice.
  const enrolledIds = new Set<string>((contract?.enrollments ?? []).map((e: any) => e.farmerId))
  const remaining = contract ? Math.max(1, contract.volume - contract.filledVolume) : 200

  // Completed cycles per farmer — history chips.
  const cyclesFor = (fid: string) =>
    state.lots.filter((l) => l.enrollment?.farmer?.id === fid && l.status === 'delivered').length

  // When the contract changes, drop a selected farmer that's already enrolled
  // on it, and clamp the planned volume to what's left to fill.
  useEffect(() => {
    setFarmerId((f) => (f && enrolledIds.has(f) ? null : f))
    setVolume((v) => Math.min(v, remaining))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId])

  async function enrol() {
    setBusy(true)
    try {
      const r = await call('/api/enrollments', 'POST', { contractId, farmerId, agentId: agent.id, plannedVolume: volume, withAdvance })
      if (r.error) {
        setError(typeof r.error === 'string' ? r.error : JSON.stringify(r.error))
      } else {
        setDoneMsg(withAdvance ? `${formatNaira(r.advance.amount)} advance disbursed` : 'Enrolled — no advance')
        onToast('Farmer enrolled')
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
      {!online && <Banner tone="offline" />}
      {status === 'error' && <Banner tone="error" onRetry={onRetry} />}

      <SectionHeader>Contract</SectionHeader>
      <InsetGroup>
        {open.length === 0 && <Row title="No open contracts" subtitle="Buyer must post demand first" />}
        {open.map((c) => {
          const crop = cropById(c.crop)
          return (
            <Row
              key={c.id}
              photo={{ src: crop.photo, alt: crop.name, fallback: crop.fallback }}
              title={`${crop.name} · ${c.volume} ${crop.unit}s`}
              subtitle={`${c.buyer?.orgName ?? 'Buyer'} · band ${formatNaira(c.bandMin)}–${formatNaira(c.bandMax)} · filled ${c.filledVolume}/${c.volume}`}
              selected={contractId === c.id}
              onClick={() => setContractId(c.id)}
            />
          )
        })}
      </InsetGroup>

      <SectionHeader>Farmer</SectionHeader>
      <InsetGroup>
        {state.farmers.map((f) => {
          const already = enrolledIds.has(f.id)
          const cycles = cyclesFor(f.id)
          return (
            <Row
              key={f.id}
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {f.name}
                  <Chip tone="neutral">L{creditLevel(f.creditScore ?? 0)}</Chip>
                  {cycles > 0 && <Chip tone="success">{cycles} cycle{cycles > 1 ? 's' : ''}</Chip>}
                </span>
              }
              subtitle={already ? 'already enrolled on this contract' : `${cropById(f.crop).name} · ${Math.round(advanceRateFor(f.creditScore ?? 0) * 100)}% advance rate`}
              selected={farmerId === f.id}
              onClick={already ? undefined : () => setFarmerId(f.id)}
            />
          )
        })}
        <Row icon={<IconEnrol width={16} height={16} />} title="New farmer…" onClick={() => setNewFarmerOpen(true)} chevron />
      </InsetGroup>

      <SectionHeader>Terms</SectionHeader>
      <InsetGroup
        footer={
          contract
            ? `Advance cap = ${Math.round(rate * 100)}% × planned volume × band floor${farmer ? ` (level ${creditLevel(farmer.creditScore ?? 0)} rate for ${farmer.name.split(' ')[0]})` : ''}.`
            : 'Pick a contract to compute the advance.'
        }
      >
        <Row title="Planned volume" trailing={<Stepper value={volume} onChange={setVolume} min={1} max={remaining} />} />
        <Row title="Input advance" subtitle={contract ? `up to ${formatNaira(advance)}` : undefined} trailing={<Toggle on={withAdvance} onChange={setWithAdvance} label="Input advance" />} />
      </InsetGroup>

      {error && <div style={{ color: '#c93400', fontSize: 13, marginTop: 10 }} role="alert">{error}</div>}
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

  // Fresh form every time the sheet opens.
  useEffect(() => {
    if (open) {
      setName(''); setPhone(''); setCrop('tomato'); setError(null)
    }
  }, [open])

  async function save() {
    setBusy(true)
    try {
      const r = await call('/api/farmers', 'POST', { name, phone, crop })
      if (r.error) {
        setError(typeof r.error === 'string' ? r.error : JSON.stringify(r.error))
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
        <div className="ios-row"><input style={input} aria-label="Full name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="ios-row"><input style={input} aria-label="Phone" placeholder="Phone (+234…)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      </InsetGroup>
      <div style={{ marginTop: 12 }}>
        <InsetGroup footer="Main crop — more can be added after registration.">
          {CROPS.map((c) => (
            <Row
              key={c.id}
              photo={{ src: c.photo, alt: c.name, fallback: c.fallback }}
              title={c.name}
              subtitle={c.unitLabel}
              selected={crop === c.id}
              onClick={() => setCrop(c.id)}
            />
          ))}
        </InsetGroup>
      </div>
      {error && <div style={{ color: '#c93400', fontSize: 13, marginTop: 10 }} role="alert">{error}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton disabled={!name || !phone} loading={busy} onClick={save}>Register</PrimaryButton>
      </div>
    </Sheet>
  )
}
