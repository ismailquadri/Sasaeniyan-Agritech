'use client'

import { useState } from 'react'
import { useAppState } from '@/lib/useAppState'
import { TabBar, NavLargeTitle, EmptyState } from '@/components/ios/kit'
import { IconToday, IconEnrol, IconWallet, IconPerson } from '@/components/ios/icons'
import { TodayTab } from './TodayTab'
import { EnrolTab } from './EnrolTab'
import { WalletTab } from './WalletTab'

const AGENT_ID = 'agent_ibrahim'

export function AgentApp() {
  const { state } = useAppState()
  const [tab, setTab] = useState('today')
  const agent = state.agents.find((a) => a.id === AGENT_ID) ?? state.agents[0]
  if (!agent) return <div className="ios-content" />

  return (
    <>
      {tab === 'today' && <TodayTab state={state} />}
      {tab === 'enrol' && <EnrolTab state={state} agent={agent} />}
      {tab === 'wallet' && <WalletTab state={state} agent={agent} />}
      {tab === 'profile' && (
        <div className="ios-content">
          <NavLargeTitle title="Profile" />
          <EmptyState icon={<IconPerson width={40} height={40} />} title="Nothing here yet" message="Reputation and coverage area arrive in the next release." />
        </div>
      )}
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
