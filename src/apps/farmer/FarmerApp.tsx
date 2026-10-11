'use client'

import { useState } from 'react'
import type { AppState, AppStatus } from '@/lib/useAppState'
import { TabBar } from '@/components/ios/kit'
import { Toast, useToast, SkeletonScreen } from '@/components/ios/upgrade'
import { IconHome, IconSell, IconWallet, IconPerson } from '@/components/ios/icons'
import { HomeTab } from './HomeTab'
import { SellTab } from './SellTab'
import { WalletTab } from './WalletTab'
import { ProfileTab } from './ProfileTab'

// State is lifted to the page (one useAppState per browser window) so each
// window holds a single SSE connection — Chrome caps HTTP/1.1 at 6/origin.
export function FarmerApp({
  farmerId,
  state,
  status = 'ready',
  online = true,
  onRetry,
}: {
  farmerId: string
  state: AppState
  status?: AppStatus
  online?: boolean
  onRetry?: () => void
}) {
  const [tab, setTab] = useState('home')
  const { toast, show } = useToast()
  const farmer = state.farmers.find((f) => f.id === farmerId)

  if (status === 'loading') return <SkeletonScreen />
  if (!farmer) return <SkeletonScreen />

  const shared = { state, farmer, online, status, onRetry, onToast: show }

  return (
    <>
      {tab === 'home' && <HomeTab {...shared} onSell={() => setTab('sell')} onWallet={() => setTab('wallet')} />}
      {tab === 'sell' && <SellTab {...shared} onDone={() => setTab('wallet')} />}
      {tab === 'wallet' && <WalletTab {...shared} />}
      {tab === 'profile' && <ProfileTab {...shared} />}
      <Toast msg={toast} />
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

export interface FarmerTabProps {
  state: AppState
  farmer: any
  online: boolean
  status: AppStatus
  onRetry?: () => void
  onToast: (m: string) => void
}
