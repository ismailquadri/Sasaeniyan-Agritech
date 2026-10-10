'use client'

import { useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, PrimaryButton, Pill, Progress, EmptyState } from '@/components/ios/kit'
import { cropGlyph, IconShield, IconOrders } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function OrdersTab({ state, buyer }: { state: AppState; buyer: any }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const contracts = state.contracts.filter((c) => c.buyerId === buyer.id)
  const orderFor = (cid: string) => state.orders.find((o) => o.contractId === cid)
  const lotsFor = (oid: string) => state.lots.filter((l) => l.orderId === oid)

  async function fundEscrow(orderId: string) {
    setBusy(orderId)
    setError(null)
    try {
      const r = await call('/api/escrow', 'POST', { orderId })
      if (r.error) setError(String(r.error))
    } finally {
      setBusy(null)
    }
  }

  async function confirmDelivery(orderId: string) {
    setBusy(orderId)
    setError(null)
    try {
      const r = await call('/api/payout', 'POST', { orderId })
      if (r.error) setError(String(r.error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Orders" trailing={<div className="ios-avatar">{buyer.contactName?.[0] ?? 'B'}</div>} />

      {contracts.length === 0 && (
        <EmptyState icon={<IconOrders width={40} height={40} />} title="No demand posted" message="Post a forward contract and watch supply fill in real time." />
      )}

      {contracts.map((c) => {
        const order = orderFor(c.id)
        const lots = order ? lotsFor(order.id) : []
        const pct = Math.round((c.filledVolume / c.volume) * 100)
        const total = lots.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
        const g = cropGlyph(c.crop)
        return (
          <div key={c.id} style={{ marginBottom: 18 }}>
            <SectionHeader>{cap(c.crop)} · grade {c.grade}</SectionHeader>
            <InsetGroup>
              <Row icon={g.icon} iconBg={g.color}
                title={`${c.filledVolume}/${c.volume} baskets`}
                subtitle={`band ${formatNaira(c.bandMin)}–${formatNaira(c.bandMax)}/basket`}
                trailing={<Pill tone={c.status === 'filled' ? 'green' : c.status === 'filling' ? 'orange' : 'gray'}>{c.status}</Pill>} />
              <div className="ios-row"><div style={{ width: '100%' }}><Progress pct={pct} /></div></div>
              {lots.map((l) => (
                <Row key={l.id}
                  title={<span>{l.enrollment?.farmer?.name}{' '}
                    {l.enrollment?.farmer?.ndfrVerified ? <Pill tone="green"><IconShield width={10} height={10} /> NDFR</Pill> : null}</span>}
                  subtitle={`${l.traceRef} · ${l.enrollment?.farmer?.geoPoint}`}
                  value={`${l.quantity} × ${formatNaira(l.unitPrice)}`} />
              ))}
              {order && (
                <div className="ios-row" style={{ gap: 10 }}>
                  <span className="ios-rowbody">
                    <span className="ios-rowtitle"><b>{formatNaira(total)}</b></span>
                    <span className="ios-rowsub">order total · {order.status}</span>
                  </span>
                  {order.status === 'open' && (
                    <PrimaryButton loading={busy === order.id} onClick={() => fundEscrow(order.id)}>
                      Fund escrow
                    </PrimaryButton>
                  )}
                  {order.status === 'funded' && (
                    <PrimaryButton loading={busy === order.id} onClick={() => confirmDelivery(order.id)}>
                      Confirm delivery
                    </PrimaryButton>
                  )}
                  {order.status === 'delivered' && <Pill tone="green">Paid ✓</Pill>}
                </div>
              )}
              {error && order && busy === null && (
                <div className="ios-row">
                  <span style={{ color: '#c93400', fontSize: 13 }}>{error}</span>
                </div>
              )}
            </InsetGroup>
          </div>
        )
      })}
    </div>
  )
}
