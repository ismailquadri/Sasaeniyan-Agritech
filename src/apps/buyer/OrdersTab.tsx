'use client'

import { Fragment, useState } from 'react'
import { formatNaira } from '@/lib/money'
import { cropById } from '@/domain/crops'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, PrimaryButton, Progress, EmptyState } from '@/components/ios/kit'
import { Chip, PhotoCard, Banner } from '@/components/ios/upgrade'
import { IconShield, IconOrders } from '@/components/ios/icons'
import type { BuyerTabProps } from './BuyerApp'

export function OrdersTab({ state, buyer, online, status, onRetry, onToast }: BuyerTabProps) {
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

  async function act(url: string, orderId: string, successMsg: string) {
    setBusy(orderId)
    setError(null)
    try {
      const r = await call(url, 'POST', { orderId })
      if (r.error) {
        setError({ orderId, message: typeof r.error === 'string' ? r.error : JSON.stringify(r.error) })
      } else {
        onToast(successMsg)
      }
    } finally {
      setBusy(null)
    }
  }

  // Active contracts first; fully-delivered ones read as history below.
  const isSettled = (c: any) => {
    const orders = ordersFor(c.id)
    return orders.length > 0 && orders.every((o) => o.status === 'delivered') && c.status === 'filled'
  }
  const active = contracts.filter((c) => !isSettled(c))
  const history = contracts.filter(isSettled)

  const contractBlock = (c: any) => {
    const crop = cropById(c.crop)
    const orders = ordersFor(c.id)
    const pct = Math.round((c.filledVolume / c.volume) * 100)
    return (
      <div key={c.id} style={{ marginBottom: 16 }}>
        <PhotoCard
          crop={crop}
          label={`${crop.name} · grade ${c.grade}`}
          sub={`band ${formatNaira(c.bandMin)}–${formatNaira(c.bandMax)} per ${crop.unit}`}
          badge={<Chip tone={c.status === 'filled' ? 'success' : c.status === 'filling' ? 'warning' : 'neutral'}>{c.status}</Chip>}
          height={72}
        />
        <div style={{ height: 8 }} />
        <InsetGroup>
          <div className="ios-row">
            <span className="ios-rowbody">
              <span className="ios-rowtitle tnum" style={{ fontWeight: 600 }}>{c.filledVolume}/{c.volume} {crop.unit}s filled</span>
            </span>
            <div style={{ width: 110 }}><Progress pct={pct} /></div>
          </div>
          {orders.map((order) => {
            const lots = lotsFor(order.id)
            const total = lots.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
            return (
              <Fragment key={order.id}>
                {lots.map((l) => {
                  const variance = l.grade !== c.grade
                  return (
                    <Row
                      key={l.id}
                      photo={{ src: crop.photo, alt: crop.name, fallback: crop.fallback }}
                      title={
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {l.enrollment?.farmer?.name}
                          {l.enrollment?.farmer?.ndfrVerified ? <Chip tone="success" icon={<IconShield width={10} height={10} />}>NDFR</Chip> : null}
                          {variance && <Chip tone="warning">graded {l.grade} vs {c.grade}</Chip>}
                        </span>
                      }
                      subtitle={`${l.traceRef} · ${l.enrollment?.farmer?.geoPoint}`}
                      value={`${l.quantity} × ${formatNaira(l.unitPrice)}`}
                    />
                  )
                })}
                <div className="ios-row" style={{ gap: 10 }}>
                  <span className="ios-rowbody">
                    <span className="ios-rowtitle tnum"><b>{formatNaira(total)}</b></span>
                    <span className="ios-rowsub" style={{ display: 'block' }}>order total · {order.status}</span>
                  </span>
                  {order.status === 'open' && (
                    <PrimaryButton loading={busy === order.id} onClick={() => act('/api/escrow', order.id, 'Escrow funded — agent notified')}>
                      Fund escrow
                    </PrimaryButton>
                  )}
                  {order.status === 'funded' && (
                    <PrimaryButton loading={busy === order.id} onClick={() => act('/api/payout', order.id, 'Delivery confirmed — farmers paid')}>
                      Confirm delivery
                    </PrimaryButton>
                  )}
                  {order.status === 'delivered' && <Chip tone="success">Paid ✓</Chip>}
                </div>
                {error && error.orderId === order.id && (
                  <div className="ios-row">
                    <span style={{ color: '#c93400', fontSize: 13 }} role="alert">{error.message}</span>
                  </div>
                )}
              </Fragment>
            )
          })}
        </InsetGroup>
      </div>
    )
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Orders" trailing={<div className="ios-avatar">{buyer.contactName?.[0] ?? 'B'}</div>} />
      {!online && <Banner tone="offline" />}
      {status === 'error' && <Banner tone="error" onRetry={onRetry} />}

      {contracts.length === 0 && (
        <EmptyState icon={<IconOrders width={40} height={40} />} title="No demand posted" message="Post a forward contract and watch supply fill in real time." />
      )}

      {active.map(contractBlock)}

      {history.length > 0 && (
        <>
          <SectionHeader>History</SectionHeader>
          {history.map(contractBlock)}
        </>
      )}
    </div>
  )
}
