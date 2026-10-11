'use client'

import { useState } from 'react'
import type { AppState, AppStatus } from '@/lib/useAppState'
import { TabBar } from '@/components/ios/kit'
import { Toast, useToast, SkeletonScreen } from '@/components/ios/upgrade'
import { IconOrders, IconPost, IconBuilding } from '@/components/ios/icons'
import { OrdersTab } from './OrdersTab'
import { PostTab } from './PostTab'
import { AccountTab } from './AccountTab'

// State lifted to the page — one SSE connection per browser window.
export function BuyerApp({
  state,
  status = 'ready',
  online = true,
  onRetry,
}: {
  state: AppState
  status?: AppStatus
  online?: boolean
  onRetry?: () => void
}) {
  const [tab, setTab] = useState('orders')
  const { toast, show } = useToast()
  const buyer = state.buyers.find((b) => b.id === 'buyer_okafor') ?? state.buyers[0]

  if (status === 'loading' || !buyer) return <SkeletonScreen />

  const shared: BuyerTabProps = { state, buyer, online, status, onRetry, onToast: show }

  return (
    <>
      {tab === 'orders' && <OrdersTab {...shared} />}
      {tab === 'post' && <PostTab {...shared} onPosted={() => setTab('orders')} />}
      {tab === 'account' && <AccountTab {...shared} />}
      <Toast msg={toast} />
      <TabBar
        items={[
          { key: 'orders', label: 'Orders', icon: <IconOrders /> },
          { key: 'post', label: 'Post', icon: <IconPost /> },
          { key: 'account', label: 'Account', icon: <IconBuilding /> },
        ]}
        active={tab}
        onChange={setTab}
      />
    </>
  )
}

export interface BuyerTabProps {
  state: AppState
  buyer: any
  online: boolean
  status: AppStatus
  onRetry?: () => void
  onToast: (m: string) => void
}
