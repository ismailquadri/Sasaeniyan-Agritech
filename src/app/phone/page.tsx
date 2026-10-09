'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Phone, MessageSquare, Signal, BatteryFull, Delete } from 'lucide-react'
import { useAppState } from '@/lib/useAppState'
import { Badge, Button, LiveDot, Money, SimLabel } from '@/components/ui'

async function ussd(phone: string, sessionId: string, input: string) {
  const res = await fetch('/api/ussd', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, sessionId, input }),
  })
  return res.json() as Promise<{ prompt: string; step: string }>
}

export default function PhonePage() {
  const { state, flash } = useAppState()
  const [phone, setPhone] = useState('+2348030000010') // Musa
  const [tab, setTab] = useState<'ussd' | 'sms'>('ussd')

  // USSD session
  const [session, setSession] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [step, setStep] = useState('')
  const [buffer, setBuffer] = useState('')
  const [busy, setBusy] = useState(false)

  const farmer = state.farmers.find((f) => f.phone === phone)
  const messages = useMemo(
    () => state.messages.filter((m) => m.toPhone === phone && m.channel === 'SMS'),
    [state.messages, phone],
  )

  // Market contrast for the selected farmer's crop.
  const crop = farmer?.crop ?? 'tomato'
  const index = state.marketIndex.find((m) => m.crop === crop)
  const contract = state.contracts.find((c) => c.crop === crop && c.status !== 'closed')

  async function dial() {
    const sid = 's' + Date.now()
    setSession(sid)
    setBuffer('')
    setBusy(true)
    const r = await ussd(phone, sid, '')
    setPrompt(r.prompt)
    setStep(r.step)
    setBusy(false)
  }

  async function send() {
    if (!session) return
    setBusy(true)
    const r = await ussd(phone, session, buffer)
    setPrompt(r.prompt)
    setStep(r.step)
    setBuffer('')
    setBusy(false)
  }

  function endSession() {
    setSession(null)
    setPrompt('')
    setStep('')
    setBuffer('')
  }

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
        <div className="mx-auto w-full max-w-[300px]">
          <div className="rounded-[2.2rem] border border-black/10 bg-gradient-to-b from-[#2a2a2a] to-[#111] p-3 shadow-xl">
            <div className="flex h-[520px] flex-col overflow-hidden rounded-[1.6rem] bg-[#0b1e12] text-[#d6f5d6]">
              {/* status bar */}
              <div className="flex items-center justify-between px-3 py-2 text-[11px] text-[#9fd3a0]">
                <span className="inline-flex items-center gap-1">
                  <Signal className="size-3" /> MTN NG
                </span>
                <span>Sasaeniyan</span>
                <BatteryFull className="size-3.5" />
              </div>

              {/* screen */}
              <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[13px] leading-relaxed">
                {tab === 'ussd' ? (
                  session ? (
                    <div className="whitespace-pre-wrap">
                      <div className="mb-2 text-[#6fb57a]">USSD · *347*55#</div>
                      {prompt}
                      {step !== 'done' && (
                        <div className="mt-3 border-t border-[#214a2c] pt-2">
                          <span className="text-[#6fb57a]">Reply: </span>
                          {buffer || <span className="text-[#3f7a4c]">_</span>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-[#8fd39a]">
                      <Phone className="mb-2 size-7" />
                      <div className="text-sm">Dial to sell your harvest</div>
                      <div className="mt-1 text-[11px] text-[#5f9f6b]">No data needed</div>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    {messages.length === 0 && <div className="text-[#5f9f6b]">No messages yet.</div>}
                    {messages.map((m) => (
                      <div key={m.id} className="rounded-lg bg-[#13331f] p-2 text-[12px] text-[#e3ffe6]">
                        <div className="mb-0.5 text-[10px] uppercase tracking-wide text-[#6fb57a]">Sasaeniyan · SMS</div>
                        {m.body}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* keypad / controls */}
              <div className="border-t border-[#214a2c] bg-[#0a1a10] p-2">
                {tab === 'ussd' && session && step !== 'done' ? (
                  <Keypad
                    onKey={(k) => setBuffer((b) => b + k)}
                    onDelete={() => setBuffer((b) => b.slice(0, -1))}
                    onSend={send}
                    onEnd={endSession}
                    busy={busy}
                  />
                ) : tab === 'ussd' && session && step === 'done' ? (
                  <button onClick={endSession} className="w-full rounded-lg bg-[#2e6b3e] py-2.5 text-sm font-semibold text-white">
                    End
                  </button>
                ) : tab === 'ussd' ? (
                  <button onClick={dial} disabled={busy} className="w-full rounded-lg bg-[#2e6b3e] py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    Dial *347*55#
                  </button>
                ) : (
                  <div className="py-1 text-center text-[11px] text-[#5f9f6b]">SMS inbox</div>
                )}
              </div>
            </div>
          </div>

          {/* phone switch + tabs */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setTab('ussd')}
              className={tabCx(tab === 'ussd')}
            >
              <Phone className="size-4" /> USSD
            </button>
            <button onClick={() => setTab('sms')} className={tabCx(tab === 'sms')}>
              <MessageSquare className="size-4" /> SMS
              {messages.length > 0 && <span className="ml-1 rounded-full bg-clay px-1.5 text-[10px] text-white">{messages.length}</span>}
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            {state.farmers.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setPhone(f.phone)
                  endSession()
                }}
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

function tabCx(active: boolean) {
  return `flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${
    active ? 'border-brand bg-brand text-white' : 'border-line text-muted'
  }`
}

function Keypad({
  onKey,
  onDelete,
  onSend,
  onEnd,
  busy,
}: {
  onKey: (k: string) => void
  onDelete: () => void
  onSend: () => void
  onEnd: () => void
  busy: boolean
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => onKey(k)}
            className="rounded-md bg-[#17351f] py-2 font-mono text-base text-[#e3ffe6] active:bg-[#214a2c]"
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <button onClick={onDelete} className="flex items-center justify-center rounded-md bg-[#17351f] px-3 py-2 text-[#e3ffe6]" aria-label="Delete">
          <Delete className="size-4" />
        </button>
        <button onClick={onSend} disabled={busy} className="flex-1 rounded-md bg-[#2e6b3e] py-2 text-sm font-semibold text-white disabled:opacity-60">
          Send
        </button>
        <button onClick={onEnd} className="rounded-md bg-[#7a2e1e] px-3 py-2 text-sm font-semibold text-white">
          End
        </button>
      </div>
    </div>
  )
}
