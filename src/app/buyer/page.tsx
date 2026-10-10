'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, ShieldCheck, MapPin, PlusCircle, Wallet } from 'lucide-react'
import { useAppState } from '@/lib/useAppState'
import { Badge, Button, Card, EmptyState, Field, Input, LiveDot, Money, SectionTitle, Select } from '@/components/ui'

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}

export default function BuyerPage() {
  const { state, flash } = useAppState()
  const [crop, setCrop] = useState('tomato')
  const [volume, setVolume] = useState(50)
  const [bandMin, setBandMin] = useState(5000)
  const [bandMax, setBandMax] = useState(9000)
  const [busy, setBusy] = useState<string | null>(null)

  const buyer = state.buyers[0]
  const wallet = state.wallets.find((w) => w.ownerId === buyer?.id)

  const contracts = useMemo(
    () => state.contracts.filter((c) => c.buyerId === buyer?.id),
    [state.contracts, buyer],
  )

  const orderFor = (contractId: string) => state.orders.find((o) => o.contractId === contractId)
  const lotsFor = (orderId: string) => state.lots.filter((l) => l.orderId === orderId)

  async function createContract(e: React.FormEvent) {
    e.preventDefault()
    setBusy('contract')
    await post('/api/contracts', { crop, grade: 'A', volume, bandMin, bandMax, windowDays: 14 })
    setBusy(null)
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <TopBar
        title={buyer?.orgName ?? 'Buyer'}
        subtitle={buyer?.contactName}
        flash={flash}
        wallet={wallet?.balance ?? 0}
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Post demand */}
        <Card className="h-fit p-5">
          <SectionTitle hint="Forward contract">Post demand</SectionTitle>
          <form onSubmit={createContract} className="space-y-3">
            <Field label="Crop">
              <Select value={crop} onChange={(e) => setCrop(e.target.value)}>
                <option value="tomato">Tomato</option>
                <option value="pepper">Pepper</option>
                <option value="onion">Onion</option>
              </Select>
            </Field>
            <Field label="Volume (baskets)">
              <Input type="number" min={1} value={volume} onChange={(e) => setVolume(+e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Band min ₦/basket">
                <Input type="number" min={1} value={bandMin} onChange={(e) => setBandMin(+e.target.value)} />
              </Field>
              <Field label="Band max ₦/basket">
                <Input type="number" min={1} value={bandMax} onChange={(e) => setBandMax(+e.target.value)} />
              </Field>
            </div>
            <Button type="submit" loading={busy === 'contract'} className="w-full">
              <PlusCircle className="size-4" /> Post forward demand
            </Button>
          </form>
        </Card>

        {/* Supply pipeline */}
        <div>
          <SectionTitle hint={`${contracts.length} contract(s)`}>Supply pipeline</SectionTitle>
          <div className="space-y-4">
            {contracts.length === 0 && <EmptyState>No contracts yet. Post demand to start the loop.</EmptyState>}
            {contracts.map((c) => {
              const order = orderFor(c.id)
              const lots = order ? lotsFor(order.id) : []
              const pct = Math.min(100, Math.round((c.filledVolume / c.volume) * 100))
              return (
                <Card key={c.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold capitalize">{c.crop}</h3>
                      <p className="text-sm text-muted">
                        Grade {c.grade} · <Money kobo={c.bandMin} />–<Money kobo={c.bandMax} />/basket
                      </p>
                    </div>
                    <Badge tone={c.status === 'filled' ? 'ok' : c.status === 'filling' ? 'gold' : 'neutral'}>
                      {c.status}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
                      <span>
                        {c.filledVolume}/{c.volume} baskets
                      </span>
                      <span className="tnum">{pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
                      <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {lots.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted">Traceable lots</div>
                      {lots.map((l) => (
                        <div key={l.id} className="flex items-center justify-between rounded-xl border border-line bg-cream/60 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{l.enrollment?.farmer?.name}</span>
                            {l.enrollment?.farmer?.ndfrVerified && (
                              <Badge tone="ok">
                                <ShieldCheck className="size-3" /> NDFR
                              </Badge>
                            )}
                            <span className="inline-flex items-center gap-0.5 text-xs text-muted">
                              <MapPin className="size-3" />
                              {l.enrollment?.farmer?.geoPoint}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="tnum font-semibold">{l.quantity} baskets · {l.grade}</div>
                            <div className="text-xs text-muted">{l.traceRef}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {order && (
                    <OrderControls
                      order={order}
                      total={lots.reduce((s, l) => s + l.unitPrice * l.quantity, 0)}
                      busy={busy}
                      onFund={async () => {
                        setBusy(order.id + 'f')
                        await post('/api/escrow', { orderId: order.id })
                        setBusy(null)
                      }}
                      onDeliver={async () => {
                        setBusy(order.id + 'd')
                        await post('/api/payout', { orderId: order.id })
                        setBusy(null)
                      }}
                    />
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderControls({
  order,
  total,
  busy,
  onFund,
  onDeliver,
}: {
  order: any
  total: number
  busy: string | null
  onFund: () => void
  onDeliver: () => void
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
      <div className="text-sm">
        <span className="text-muted">Order total </span>
        <Money kobo={total} className="font-bold" />
        <Badge className="ml-2" tone={order.status === 'delivered' ? 'ok' : order.status === 'funded' ? 'info' : 'neutral'}>
          {order.status}
        </Badge>
      </div>
      {order.status === 'open' && (
        <Button variant="gold" loading={busy === order.id + 'f'} onClick={onFund}>
          Fund escrow
        </Button>
      )}
      {order.status === 'funded' && (
        <Button loading={busy === order.id + 'd'} onClick={onDeliver}>
          Confirm delivery
        </Button>
      )}
      {order.status === 'delivered' && <Badge tone="ok">Paid out ✓</Badge>}
    </div>
  )
}

function TopBar({ title, subtitle, flash, wallet }: { title: string; subtitle?: string; flash: string | null; wallet: number }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="rounded-lg p-2 text-muted hover:bg-black/[0.04]" aria-label="Home">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-[#b4811f] text-white">
          <Building2 className="size-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold leading-tight">{title}</h1>
          <p className="text-sm text-muted">{subtitle} · Buyer</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-1.5 text-sm font-semibold sm:inline-flex">
          <Wallet className="size-4 text-muted" />
          <Money kobo={wallet} />
        </span>
        <LiveDot flash={flash} />
      </div>
    </header>
  )
}
