'use client'

import { useEffect, useState } from 'react'
import { Phone, MessageSquare, Signal, BatteryFull, Delete } from 'lucide-react'

async function ussd(phone: string, sessionId: string, input: string) {
  const res = await fetch('/api/ussd', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, sessionId, input }),
  })
  return res.json() as Promise<{ prompt: string; step: string }>
}

export function FeaturePhone({ phone, messages }: { phone: string; messages: any[] }) {
  const [tab, setTab] = useState<'ussd' | 'sms'>('ussd')

  // USSD session
  const [session, setSession] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [step, setStep] = useState('')
  const [buffer, setBuffer] = useState('')
  const [busy, setBusy] = useState(false)

  function endSession() {
    setSession(null)
    setPrompt('')
    setStep('')
    setBuffer('')
  }

  // Reset USSD session whenever the active farmer's phone changes.
  useEffect(() => {
    endSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone])

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

  return (
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
