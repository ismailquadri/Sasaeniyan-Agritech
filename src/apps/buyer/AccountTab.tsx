'use client'

import { formatNaira } from '@/lib/money'
import { cropById } from '@/domain/crops'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, EmptyState } from '@/components/ios/kit'
import { HeroCard, Chip, Banner } from '@/components/ios/upgrade'
import { IconBuilding, IconPerson } from '@/components/ios/icons'
import type { BuyerTabProps } from './BuyerApp'

export function AccountTab({ state, buyer, online, status, onRetry }: BuyerTabProps) {
  const wallet = state.wallets.find((w) => w.ownerId === buyer.id)
  const myContracts = state.contracts.filter((c) => c.buyerId === buyer.id)
  const myOrderIds = new Set(state.orders.filter((o) => myContracts.some((c) => c.id === o.contractId)).map((o) => o.id))
  const deliveredLots = state.lots.filter((l) => l.orderId && myOrderIds.has(l.orderId) && l.status === 'delivered')

  const totalVolume = deliveredLots.reduce((s, l) => s + l.quantity, 0)
  const totalSpend = deliveredLots.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const activeContracts = myContracts.filter((c) => c.status === 'open' || c.status === 'filling').length
  const units = [...new Set(deliveredLots.map((l) => cropById(l.enrollment?.contract?.crop ?? '').unit))].join('s/') || 'unit'

  return (
    <div className="ios-content">
      <NavLargeTitle title="Account" trailing={<div className="ios-avatar">{buyer.contactName?.[0] ?? 'B'}</div>} />
      {!online && <Banner tone="offline" />}
      {status === 'error' && <Banner tone="error" onRetry={onRetry} />}

      <HeroCard
        gradient="buyer"
        label="Procurement wallet"
        balance={wallet?.balance ?? 0}
        chips={<Chip onDark>{activeContracts} active</Chip>}
      />

      <SectionHeader>Organisation</SectionHeader>
      <InsetGroup>
        <Row icon={<IconBuilding width={16} height={16} />} iconBg="#b8811f" title={buyer.orgName} subtitle="Registered buyer" />
        <Row icon={<IconPerson width={16} height={16} />} title={buyer.contactName} subtitle="Procurement lead" />
      </InsetGroup>

      <SectionHeader>Sourcing stats</SectionHeader>
      <InsetGroup footer="All produce traceable to NDFR-registered farmers via lot trace refs.">
        <Row title="Volume delivered" value={`${totalVolume} ${units}s`} />
        <Row title="Total spend" value={formatNaira(totalSpend)} />
        <Row title="Active contracts" value={String(activeContracts)} />
      </InsetGroup>

      <SectionHeader>Settings</SectionHeader>
      <EmptyState icon={<IconPerson width={40} height={40} />} title="Nothing here yet" message="Team, invoices and settings arrive in the next release." />
    </div>
  )
}
