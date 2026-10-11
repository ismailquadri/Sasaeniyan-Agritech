'use client'

import { useState } from 'react'
import type { AppState, AppStatus } from '@/lib/useAppState'
import { TabBar } from '@/components/ios/kit'
import { Toast, useToast, SkeletonScreen } from '@/components/ios/upgrade'
import { IconToday, IconEnrol, IconWallet, IconPerson } from '@/components/ios/icons'
import { TodayTab } from './TodayTab'
import { EnrolTab } from './EnrolTab'
import { WalletTab } from './WalletTab'
import { ProfileTab } from './ProfileTab'

const AGENT_ID = 'agent_ibrahim'

// State lifted to the page — one SSE connection per browser window.
export function AgentApp({
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
  const [tab, setTab] = useState('today')
  const { toast, show } = useToast()
  const agent = state.agents.find((a) => a.id === AGENT_ID) ?? state.agents[0]

  if (status === 'loading' || !agent) return <SkeletonScreen />

  const shared: AgentTabProps = { state, agent, online, status, onRetry, onToast: show }

  return (
    <>
      {tab === 'today' && <TodayTab {...shared} />}
      {tab === 'enrol' && <EnrolTab {...shared} />}
      {tab === 'wallet' && <WalletTab {...shared} />}
      {tab === 'profile' && <ProfileTab {...shared} />}
      <Toast msg={toast} />
      <TabBar
        items={[
          { key: 'today', label: 'Today', icon: <IconToday /> },
          { key: 'enrol', label: 'Enrol', icon: <IconEnrol /> },
          { key: 'wallet', label: 'Wallet', icon: <IconWallet /> },
          { key: 'profile', label: 'Profile', icon: <IconPerson /> },
        ]}
        active={tab}
        onChange={setTab}
      />
    </>
  )
}

export interface AgentTabProps {
  state: AppState
  agent: any
  online: boolean
  status: AppStatus
  onRetry?: () => void
  onToast: (m: string) => void
}
