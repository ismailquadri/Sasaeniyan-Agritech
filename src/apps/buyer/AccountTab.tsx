'use client'

import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, EmptyState } from '@/components/ios/kit'
import { IconBuilding, IconWallet, IconPerson } from '@/components/ios/icons'

export function AccountTab({ state, buyer }: { state: AppState; buyer: any }) {
  const wallet = state.wallets.find((w) => w.ownerId === buyer.id)
  return (
    <div className="ios-content">
      <NavLargeTitle title="Account" />
      <InsetGroup>
        <Row icon={<IconBuilding width={16} height={16} />} iconBg="#E2A63B" title={buyer.orgName} subtitle={buyer.contactName} />
        <Row icon={<IconWallet width={16} height={16} />} iconBg="var(--ios-tint)" title="Wallet" value={formatNaira(wallet?.balance ?? 0)} />
      </InsetGroup>
      <SectionHeader>Settings</SectionHeader>
      <EmptyState icon={<IconPerson width={40} height={40} />} title="Nothing here yet" message="Team, invoices and settings arrive in the next release." />
    </div>
  )
}
