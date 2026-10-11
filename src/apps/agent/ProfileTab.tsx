'use client'

import { NavLargeTitle, SectionHeader, InsetGroup, Row } from '@/components/ios/kit'
import { Chip } from '@/components/ios/upgrade'
import { IconPerson, IconShield, IconTray } from '@/components/ios/icons'
import type { AgentTabProps } from './AgentApp'

export function ProfileTab({ state, agent }: AgentTabProps) {
  // Distinct farmers this agent has ever enrolled (from contracts' enrollments).
  const served = new Set(
    state.contracts.flatMap((c: any) => (c.enrollments ?? []).filter((e: any) => e.agentId === agent.id).map((e: any) => e.farmerId)),
  ).size
  const delivered = state.lots.filter((l) => l.agentId === agent.id && l.status === 'delivered').length

  return (
    <div className="ios-content">
      <NavLargeTitle title="Profile" trailing={<div className="ios-avatar">{agent.name[0]}</div>} />

      <SectionHeader>Agent</SectionHeader>
      <InsetGroup>
        <Row icon={<IconPerson width={16} height={16} />} title={agent.name} subtitle={agent.phone} />
        <Row
          icon={<IconShield width={16} height={16} />}
          iconBg="#b45309"
          title="Reputation"
          value={'★'.repeat(Math.min(5, agent.reputation ?? 0)) || '—'}
        />
        <Row icon={<IconTray width={16} height={16} />} iconBg="#4d7c0f" title="Coverage" value="Kano North LGA cluster" />
        <Row title="Member since" value="February 2026" />
      </InsetGroup>

      <SectionHeader>Field record</SectionHeader>
      <InsetGroup footer="Reputation grows with completed, dispute-free cycles.">
        <Row title="Farmers served" trailing={<Chip tone="success">{served}</Chip>} />
        <Row title="Lots delivered" trailing={<Chip tone="success">{delivered}</Chip>} />
        <Row title="Commission rate" value="2% of lot value" />
      </InsetGroup>
    </div>
  )
}
