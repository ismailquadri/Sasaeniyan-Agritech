'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAppState } from '@/lib/useAppState'
import { LiveDot, SimLabel } from '@/components/ui'
import { IPhoneFrame } from '@/components/iphone/IPhoneFrame'
import { FarmerApp } from '@/apps/farmer/FarmerApp'
import { FeaturePhone } from '@/components/featurephone/FeaturePhone'

export default function PhonePage() {
  const { state, flash } = useAppState()
  const [device, setDevice] = useState<'iphone' | 'nokia'>('iphone')
  const [farmerId, setFarmerId] = useState('farmer_musa')
  const farmer = state.farmers.find((f) => f.id === farmerId) ?? state.farmers[0]
  const messages = state.messages.filter((m) => m.toPhone === farmer?.phone && m.channel === 'SMS')

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-6">
      <header className="mb-4 flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg p-2 text-muted hover:bg-black/[0.04]" aria-label="Home">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">Farmer</h1>
            <p className="text-sm text-muted">{farmer?.name} · {device === 'iphone' ? 'Sasaeniyan app' : 'any feature phone'}</p>
          </div>
        </div>
        <LiveDot flash={flash} />
      </header>

      <div className="mb-4 flex w-full max-w-sm flex-col gap-2">
        <div className="flex rounded-xl border border-line bg-surface p-1">
          {(['iphone', 'nokia'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              aria-pressed={device === d}
              className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold ${device === d ? 'bg-brand text-white' : 'text-muted'}`}
            >
              {d === 'iphone' ? 'iPhone app' : 'Nokia · USSD'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {state.farmers.map((f) => (
            <button
              key={f.id}
              onClick={() => setFarmerId(f.id)}
              aria-pressed={farmerId === f.id}
              className={`flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold ${farmerId === f.id ? 'border-brand bg-brand-light text-brand-dark' : 'border-line text-muted'}`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {device === 'iphone' ? (
        <IPhoneFrame caption={`${farmer?.name ?? ''} · Farmer app`}>
          <FarmerApp key={farmer?.id ?? 'farmer_musa'} farmerId={farmer?.id ?? 'farmer_musa'} state={state} />
        </IPhoneFrame>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <FeaturePhone phone={farmer?.phone ?? ''} messages={messages} />
          <div className="max-w-xs">
            <SimLabel>Simulated USSD/SMS — production via Africa&apos;s Talking on any feature phone.</SimLabel>
          </div>
        </div>
      )}
    </div>
  )
}
