'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Tractor, UserPlus, HandCoins, PackageCheck, WifiOff } from 'lucide-react'
import { useAppState } from '@/lib/useAppState'
import { Badge, Button, Card, EmptyState, Field, Input, LiveDot, Money, SectionTitle, Select } from '@/components/ui'

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}

export default function AgentPage() {
  const { state, flash } = useAppState()
  const [busy, setBusy] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  // Register service worker for installable/offline PWA.
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    const on = () => setOffline(!navigator.onLine)
    on()
    window.addEventListener('online', on)
    window.addEventListener('offline', on)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', on)
    }
  }, [])

  const openContracts = state.contracts.filter((c) => c.status !== 'closed')
  const pickedLots = state.lots.filter((l) => l.status === 'picked')
  const aggregated = state.lots.filter((l) => l.status !== 'picked')

  // Enrollment form
  const [contractId, setContractId] = useState('')
  const [farmerId, setFarmerId] = useState('')
  const [plannedVolume, setPlannedVolume] = useState(20)
  const [withAdvance, setWithAdvance] = useState(true)
  useEffect(() => {
    if (!contractId && openContracts[0]) setContractId(openContracts[0].id)
    if (!farmerId && state.farmers[0]) setFarmerId(state.farmers[0].id)
  }, [openContracts, state.farmers, contractId, farmerId])

  // Register farmer form
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [crop, setCrop] = useState('tomato')

  const enrolledFarmerIds = useMemo(
    () => new Set(state.contracts.flatMap((c) => c.enrollments?.map((e: any) => e.farmerId) ?? [])),
    [state.contracts],
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg p-2 text-muted hover:bg-black/[0.04]" aria-label="Home">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-clay to-[#8f3f1e] text-white">
            <Tractor className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">Ibrahim</h1>
            <p className="text-sm text-muted">Field agent · PWA</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {offline && (
            <Badge tone="warn">
              <WifiOff className="size-3" /> Offline
            </Badge>
          )}
          <LiveDot flash={flash} />
        </div>
      </header>

      {/* Enroll with advance */}
      <Card className="mb-4 p-5">
        <SectionTitle hint="Offtake-backed">Enrol farmer + advance</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contract">
            <Select value={contractId} onChange={(e) => setContractId(e.target.value)}>
              {openContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.crop} · {c.volume} baskets
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Farmer">
            <Select value={farmerId} onChange={(e) => setFarmerId(e.target.value)}>
              {state.farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {enrolledFarmerIds.has(f.id) ? ' (enrolled)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Planned volume (baskets)">
            <Input type="number" min={1} value={plannedVolume} onChange={(e) => setPlannedVolume(+e.target.value)} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-line px-3 py-2.5 text-sm font-semibold">
            <input type="checkbox" checked={withAdvance} onChange={(e) => setWithAdvance(e.target.checked)} className="size-4 accent-brand" />
            Disburse input advance (40%)
          </label>
        </div>
        <Button
          className="mt-3 w-full"
          loading={busy === 'enroll'}
          disabled={!contractId || !farmerId}
          onClick={async () => {
            setBusy('enroll')
            await call('/api/enrollments', 'POST', { contractId, farmerId, plannedVolume, withAdvance })
            setBusy(null)
          }}
        >
          <HandCoins className="size-4" /> Enrol &amp; disburse
        </Button>
      </Card>

      {/* Pickup + grade */}
      <Card className="mb-4 p-5">
        <SectionTitle hint={`${pickedLots.length} awaiting`}>Pickup &amp; grading</SectionTitle>
        {pickedLots.length === 0 ? (
          <EmptyState>No lots awaiting grading. Farmers accept harvests via USSD.</EmptyState>
        ) : (
          <div className="space-y-2">
            {pickedLots.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-cream/60 px-3 py-2.5">
                <div>
                  <div className="font-semibold">
                    {l.enrollment?.farmer?.name} · <span className="capitalize">{l.enrollment?.contract?.crop}</span>
                  </div>
                  <div className="text-xs text-muted tnum">
                    {l.quantity} baskets · offered <Money kobo={l.unitPrice} />/basket
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['A', 'B', 'C'] as const).map((g) => (
                    <Button
                      key={g}
                      variant={g === 'A' ? 'primary' : 'ghost'}
                      className="px-3"
                      loading={busy === l.id + g}
                      onClick={async () => {
                        setBusy(l.id + g)
                        await call(`/api/lots/${l.id}`, 'PATCH', { grade: g })
                        setBusy(null)
                      }}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Aggregation + register farmer */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <SectionTitle hint={`${aggregated.length} graded`}>Aggregated</SectionTitle>
          {aggregated.length === 0 ? (
            <EmptyState>Graded lots roll up into buyer orders here.</EmptyState>
          ) : (
            <div className="space-y-2">
              {aggregated.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg px-1 text-sm">
                  <span>
                    {l.enrollment?.farmer?.name} · {l.quantity} baskets
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={l.status === 'delivered' ? 'ok' : 'gold'}>{l.status}</Badge>
                    <Badge tone="brand">{l.grade}</Badge>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle>Register farmer</SectionTitle>
          <div className="space-y-3">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sani" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" inputMode="tel" />
              </Field>
              <Field label="Crop">
                <Select value={crop} onChange={(e) => setCrop(e.target.value)}>
                  <option value="tomato">Tomato</option>
                  <option value="pepper">Pepper</option>
                  <option value="onion">Onion</option>
                </Select>
              </Field>
            </div>
            <Button
              variant="ghost"
              className="w-full"
              loading={busy === 'farmer'}
              disabled={!name || !phone}
              onClick={async () => {
                setBusy('farmer')
                const r = await call('/api/farmers', 'POST', { name, phone, crop })
                if (!r.error) {
                  setName('')
                  setPhone('')
                }
                setBusy(null)
              }}
            >
              <UserPlus className="size-4" /> Register
            </Button>
          </div>
        </Card>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <PackageCheck className="size-3.5" /> Installable PWA · caches the app shell for offline field use
      </p>
    </div>
  )
}
