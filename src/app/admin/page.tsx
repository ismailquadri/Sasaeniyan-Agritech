'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LineChart, RotateCcw, TrendingUp, ShieldAlert, Coins, PieChart } from 'lucide-react'
import { useAppState } from '@/lib/useAppState'
import { Badge, Button, Card, EmptyState, LiveDot, Money, SectionTitle, Stat } from '@/components/ui'
import { incomeUplift, revenueSplit } from '@/domain/metrics/metrics'
import { PLATFORM_FEE_RATE, AGENT_COMMISSION_RATE, FINANCE_SPREAD_RATE } from '@/domain/config'

const LOSS_RATE = 0.3 // modeled post-harvest loss avoided via guaranteed offtake

export default function AdminPage() {
  const { state, flash } = useAppState()
  const [busy, setBusy] = useState(false)

  const committedLots = state.lots.filter((l) => l.status !== 'picked')
  const indexFor = (crop: string) => state.marketIndex.find((m) => m.crop === crop)?.indexPrice ?? 0

  let gmv = 0
  let ourValue = 0
  let mmValue = 0
  for (const l of committedLots) {
    const sale = l.unitPrice * l.quantity
    gmv += sale
    ourValue += sale
    mmValue += indexFor(l.enrollment?.contract?.crop ?? '') * l.quantity
  }

  const uplift = incomeUplift({ ourPrice: ourValue, middlemanPrice: mmValue })
  const lossAvoided = Math.round(gmv * LOSS_RATE)
  const totalAdvances = sumAdvances(state)
  const rev = revenueSplit({ saleValue: gmv, feeRate: PLATFORM_FEE_RATE, financeSpread: Math.round(totalAdvances * FINANCE_SPREAD_RATE) })
  const agentCommission = Math.round(gmv * AGENT_COMMISSION_RATE)

  async function reset() {
    setBusy(true)
    await fetch('/api/admin/reset', { method: 'POST' })
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg p-2 text-muted hover:bg-black/[0.04]" aria-label="Home">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#334155] to-[#1e293b] text-white">
            <LineChart className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">Impact &amp; presenter tools</h1>
            <p className="text-sm text-muted">Live metrics · demo controls</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveDot flash={flash} />
          <Button variant="danger" loading={busy} onClick={reset}>
            <RotateCcw className="size-4" /> Reset demo
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Income uplift"
          value={<span className="flex items-center gap-1 text-ok"><TrendingUp className="size-5" />{mmValue ? `+${Math.round(uplift * 100)}%` : '—'}</span>}
          sub="vs. middleman glut price"
          tone="ok"
        />
        <Stat label="GMV" value={<Money kobo={gmv} />} sub={`${committedLots.length} graded lot(s)`} />
        <Stat label="Loss avoided" value={<Money kobo={lossAvoided} />} sub={`${Math.round(LOSS_RATE * 100)}% spoilage averted (modeled)`} />
        <Stat label="Platform revenue" value={<Money kobo={rev.total} />} sub="take + finance spread" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Revenue split */}
        <Card className="p-5">
          <SectionTitle hint="Per current GMV">Revenue split</SectionTitle>
          <RevenueRow icon={<Coins className="size-4" />} label={`Platform take (${pct(PLATFORM_FEE_RATE)})`} value={rev.platformFee} />
          <RevenueRow icon={<PieChart className="size-4" />} label={`Finance spread (${pct(FINANCE_SPREAD_RATE)} of advances)`} value={rev.financeSpread} />
          <RevenueRow icon={<TrendingUp className="size-4" />} label={`Agent commission (${pct(AGENT_COMMISSION_RATE)})`} value={agentCommission} muted />
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 font-bold">
            <span>Platform revenue</span>
            <Money kobo={rev.total} />
          </div>
          <p className="mt-3 text-xs text-muted">
            Advances outstanding/recouped: <Money kobo={totalAdvances} />. Fees shown exclude agent commission (paid to the field agent).
          </p>
        </Card>

        {/* Event log */}
        <Card className="p-5">
          <SectionTitle hint="Audit trail">Event log</SectionTitle>
          {state.events.length === 0 ? (
            <EmptyState>No events yet. Run the hero flow to populate.</EmptyState>
          ) : (
            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {state.events.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-cream/70 px-3 py-1.5 text-sm">
                  <Badge tone={eventTone(e.type)}>{e.type}</Badge>
                  <span className="text-xs text-muted tnum">{new Date(e.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-xl border border-gold/40 bg-gold-light p-4 text-sm text-warn">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <span>
          Loss-avoided and finance-spread figures are <b>modeled</b> for the pitch. USSD, payment settlement and NDFR
          verification are simulated and labeled across the surfaces; production uses Africa&apos;s Talking + a licensed PSP.
        </span>
      </div>
    </div>
  )
}

function RevenueRow({ icon, label, value, muted }: { icon: React.ReactNode; label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${muted ? 'text-muted' : ''}`}>
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <Money kobo={value} className="font-semibold" />
    </div>
  )
}

function sumAdvances(state: ReturnType<typeof useAppState>['state']) {
  let total = 0
  for (const c of state.contracts) {
    for (const e of c.enrollments ?? []) {
      if (e.advance) total += e.advance.amount
    }
  }
  return total
}

const pct = (r: number) => `${(r * 100).toFixed(r < 0.02 ? 1 : 0)}%`

function eventTone(type: string): 'ok' | 'gold' | 'info' | 'brand' | 'clay' | 'neutral' {
  if (type === 'PAID' || type === 'HARVEST_ACCEPTED') return 'ok'
  if (type === 'ESCROW_FUNDED') return 'info'
  if (type === 'ADVANCE_ISSUED' || type === 'CONTRACT_CREATED') return 'gold'
  if (type === 'LOT_GRADED' || type === 'ORDER_UPDATED') return 'brand'
  if (type === 'DEMO_RESET') return 'clay'
  return 'neutral'
}
