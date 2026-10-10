'use client'

import { Fragment, useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, PrimaryButton, Pill, Progress, EmptyState } from '@/components/ios/kit'
import { cropGlyph, IconShield, IconOrders } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function OrdersTab({ state, buyer }: { state: AppState; buyer: any }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<{ orderId: string; message: string } | null>(null)
  const contracts = state.contracts.filter((c) => c.buyerId === buyer.id)
  // A contract can roll multiple orders: grading after a funded/delivered order opens a new one.
  // Oldest first so the settled order reads as history above the active one.
  const ordersFor = (cid: string) =>
    state.orders
      .filter((o) => o.contractId === cid)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const lotsFor = (oid: string) => state.lots.filter((l) => l.orderId === oid)

  async function act(url: string, orderId: string) {
    setBusy(orderId)
    setError(null)
    try {
      const r = await call(url, 'POST', { orderId })
      if (r.error) {
        setError({ orderId, message: typeof r.error === 'string' ? r.error : JSON.stringify(r.error) })
      }
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
        const orders = ordersFor(c.id)
        const pct = Math.round((c.filledVolume / c.volume) * 100)
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
              {orders.map((order) => {
                const lots = lotsFor(order.id)
                const total = lots.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
                return (
                  <Fragment key={order.id}>
                    {lots.map((l) => (
                      <Row key={l.id}
                        title={<span>{l.enrollment?.farmer?.name}{' '}
                          {l.enrollment?.farmer?.ndfrVerified ? <Pill tone="green"><IconShield width={10} height={10} /> NDFR</Pill> : null}</span>}
                        subtitle={`${l.traceRef} · ${l.enrollment?.farmer?.geoPoint}`}
                        value={`${l.quantity} × ${formatNaira(l.unitPrice)}`} />
                    ))}
                    <div className="ios-row" style={{ gap: 10 }}>
                      <span className="ios-rowbody">
                        <span className="ios-rowtitle"><b>{formatNaira(total)}</b></span>
                        <span className="ios-rowsub" style={{ display: 'block' }}>order total · {order.status}</span>
                      </span>
                      {order.status === 'open' && (
                        <PrimaryButton loading={busy === order.id} onClick={() => act('/api/escrow', order.id)}>
                          Fund escrow
                        </PrimaryButton>
                      )}
                      {order.status === 'funded' && (
                        <PrimaryButton loading={busy === order.id} onClick={() => act('/api/payout', order.id)}>
                          Confirm delivery
                        </PrimaryButton>
                      )}
                      {order.status === 'delivered' && <Pill tone="green">Paid ✓</Pill>}
                    </div>
                    {error && error.orderId === order.id && (
                      <div className="ios-row">
                        <span style={{ color: '#c93400', fontSize: 13 }}>{error.message}</span>
                      </div>
                    )}
                  </Fragment>
                )
              })}
            </InsetGroup>
          </div>
        )
      })}
    </div>
  )
}
