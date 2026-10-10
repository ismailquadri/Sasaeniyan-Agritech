'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAppState } from '@/lib/useAppState'
import { Badge, Button, LiveDot, Money, SimLabel } from '@/components/ui'
import { FeaturePhone } from '@/components/featurephone/FeaturePhone'

export default function PhonePage() {
  const { state, flash } = useAppState()
  const [phone, setPhone] = useState('+2348030000010') // Musa

  const farmer = state.farmers.find((f) => f.phone === phone)
  const messages = useMemo(
    () => state.messages.filter((m) => m.toPhone === phone && m.channel === 'SMS'),
    [state.messages, phone],
  )

  // Market contrast for the selected farmer's crop.
  const crop = farmer?.crop ?? 'tomato'
  const index = state.marketIndex.find((m) => m.crop === crop)
  const contract = state.contracts.find((c) => c.crop === crop && c.status !== 'closed')

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg p-2 text-muted hover:bg-black/[0.04]" aria-label="Home">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">Farmer phone</h1>
            <p className="text-sm text-muted">{farmer?.name} · feature phone</p>
          </div>
        </div>
        <LiveDot flash={flash} />
      </header>

      <div className="grid items-start gap-8 sm:grid-cols-[300px_1fr]">
        {/* Feature-phone chassis */}
        <div>
          <FeaturePhone phone={phone} messages={messages} />

          <div className="mx-auto mt-2 flex w-full max-w-[300px] gap-2">
            {state.farmers.map((f) => (
              <button
                key={f.id}
                onClick={() => setPhone(f.phone)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                  phone === f.phone ? 'border-brand bg-brand-light text-brand-dark' : 'border-line text-muted'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* context panel */}
        <div className="space-y-4">
          <SimLabel>
            Simulated USSD/SMS — production runs over Africa&apos;s Talking on any feature phone, no app or data required.
          </SimLabel>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
              Today&apos;s market · <span className="capitalize text-ink">{crop}</span>
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-clay-light p-3">
                <div className="text-xs font-semibold text-clay">Middleman (glut)</div>
                <div className="mt-1 font-display text-xl font-bold text-clay tnum">
                  {index ? <Money kobo={index.indexPrice} /> : '—'}
                </div>
                <div className="text-[11px] text-clay/80">per basket</div>
              </div>
              <div className="rounded-xl bg-brand-light p-3">
                <div className="text-xs font-semibold text-brand-dark">Sasaeniyan fair band</div>
                <div className="mt-1 font-display text-xl font-bold text-brand-dark tnum">
                  {contract ? <Money kobo={contract.bandMin} /> : '—'}
                </div>
                <div className="text-[11px] text-brand-dark/80">
                  {contract ? <>floor of <Money kobo={contract.bandMin} />–<Money kobo={contract.bandMax} /></> : 'no open contract'}
                </div>
              </div>
            </div>
            {index && contract && (
              <p className="mt-3 text-sm text-muted">
                That&apos;s{' '}
                <span className="font-bold text-brand-dark">
                  {Math.round(((contract.bandMin - index.indexPrice) / index.indexPrice) * 100)}% more
                </span>{' '}
                than the glut price the middleman offers at the farm gate.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
            <h3 className="mb-1 font-semibold text-ink">How to run the demo</h3>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Buyer posts demand; agent enrols {farmer?.name} with an advance.</li>
              <li>Here: <b>Dial *347*55#</b> → 1 (sell) → pick crop → baskets → hear the fair price → 1 (accept).</li>
              <li>Agent grades the lot; buyer funds escrow &amp; confirms delivery.</li>
              <li>Switch to the <b>SMS</b> tab to see the itemised payment receipt arrive live.</li>
            </ol>
            {farmer && (
              <div className="mt-3">
                <Badge tone={farmer.ndfrVerified ? 'ok' : 'neutral'}>
                  {farmer.ndfrVerified ? 'NDFR verified' : 'NDFR unverified'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
