'use client'

import { useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { TabBar, NavLargeTitle, EmptyState } from '@/components/ios/kit'
import { IconHome, IconSell, IconWallet, IconPerson } from '@/components/ios/icons'
import { HomeTab } from './HomeTab'
import { SellTab } from './SellTab'
import { WalletTab } from './WalletTab'

// State is lifted to the page (one useAppState per browser window) so each
// window holds a single SSE connection — Chrome caps HTTP/1.1 at 6/origin.
export function FarmerApp({ farmerId, state }: { farmerId: string; state: AppState }) {
  const [tab, setTab] = useState('home')
  const farmer = state.farmers.find((f) => f.id === farmerId)
  if (!farmer) return <div className="ios-content" />

  return (
    <>
      {tab === 'home' && <HomeTab state={state} farmer={farmer} onSell={() => setTab('sell')} />}
      {tab === 'sell' && <SellTab state={state} farmer={farmer} onDone={() => setTab('wallet')} />}
      {tab === 'wallet' && <WalletTab state={state} farmer={farmer} />}
      {tab === 'profile' && (
        <div className="ios-content">
          <NavLargeTitle title="Profile" />
          <EmptyState
            icon={<IconPerson width={40} height={40} />}
            title="Nothing here yet"
            message="Farm details, language and credit score arrive in the next release."
          />
        </div>
      )}
      <TabBar
        items={[
          { key: 'home', label: 'Home', icon: <IconHome /> },
          { key: 'sell', label: 'Sell', icon: <IconSell /> },
          { key: 'wallet', label: 'Wallet', icon: <IconWallet /> },
          { key: 'profile', label: 'Profile', icon: <IconPerson /> },
        ]}
        active={tab}
        onChange={setTab}
      />
    </>
  )
}
