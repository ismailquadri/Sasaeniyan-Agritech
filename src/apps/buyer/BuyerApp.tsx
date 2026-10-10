'use client'

import { useState } from 'react'
import { useAppState } from '@/lib/useAppState'
import { TabBar } from '@/components/ios/kit'
import { IconOrders, IconPost, IconBuilding } from '@/components/ios/icons'
import { OrdersTab } from './OrdersTab'
import { PostTab } from './PostTab'
import { AccountTab } from './AccountTab'

export function BuyerApp() {
  const { state } = useAppState()
  const [tab, setTab] = useState('orders')
  const buyer = state.buyers[0]
  if (!buyer) return <div className="ios-content" />

  return (
    <>
      {tab === 'orders' && <OrdersTab state={state} buyer={buyer} />}
      {tab === 'post' && <PostTab buyer={buyer} onPosted={() => setTab('orders')} />}
      {tab === 'account' && <AccountTab state={state} buyer={buyer} />}
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
