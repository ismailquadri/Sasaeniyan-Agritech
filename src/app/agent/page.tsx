'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAppState } from '@/lib/useAppState'
import { LiveDot } from '@/components/ui'
import { IPhoneFrame } from '@/components/iphone/IPhoneFrame'
import { AgentApp } from '@/apps/agent/AgentApp'

export default function AgentPage() {
  const { state, flash, status, online, refetch } = useAppState()

  // Installable/offline PWA: keep the service worker registered.
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-6">
      <header className="mb-4 flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg p-2 text-muted hover:bg-black/[0.04]" aria-label="Home">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">Agent</h1>
            <p className="text-sm text-muted">Ibrahim · field app</p>
          </div>
        </div>
        <LiveDot flash={flash} />
      </header>
      <IPhoneFrame caption="Ibrahim · Agent app">
        <AgentApp state={state} status={status} online={online} onRetry={refetch} />
      </IPhoneFrame>
    </div>
  )
}
