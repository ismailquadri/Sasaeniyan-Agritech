'use client'

import { useState } from 'react'
import { creditLevel, LEVEL_THRESHOLDS } from '@/domain/credit'
import { cropById } from '@/domain/crops'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Segmented } from '@/components/ios/kit'
import { Chip, PhotoThumb } from '@/components/ios/upgrade'
import { IconShield, IconPerson, IconLeaf, IconWallet } from '@/components/ios/icons'
import type { FarmerTabProps } from './FarmerApp'

// Display-only language toggle: demonstrates Hausa-first UI copy.
const COPY = {
  en: { farm: 'Farm', location: 'Location', crops: 'Main crop', member: 'Member since', language: 'Language', credit: 'Credit history', ndfr: 'NDFR identity' },
  ha: { farm: 'Gona', location: 'Wuri', crops: 'Amfanin gona', member: 'Memba tun', language: 'Harshe', credit: 'Tarihin bashi', ndfr: 'Shaidar NDFR' },
}

export function ProfileTab({ farmer }: FarmerTabProps) {
  const [lang, setLang] = useState<'en' | 'ha'>('en')
  const c = COPY[lang]
  const level = creditLevel(farmer.creditScore ?? 0)
  const crop = cropById(farmer.crop ?? '')

  // Credit milestones derived from score (display-only narrative).
  const milestones = [
    { label: 'Joined Sasaeniyan — Level 1 (40% advance cap)', reached: true },
    { label: `Level 2 at ${LEVEL_THRESHOLDS[2]} points (50% advance cap)`, reached: level >= 2 },
    { label: `Level 3 at ${LEVEL_THRESHOLDS[3]} points (60% advance cap)`, reached: level >= 3 },
  ]

  return (
    <div className="ios-content">
      <NavLargeTitle title="Profile" trailing={<div className="ios-avatar">{farmer.name[0]}</div>} />

      <SectionHeader>{c.farm}</SectionHeader>
      <InsetGroup>
        <Row icon={<IconPerson width={16} height={16} />} title={farmer.name} subtitle={farmer.phone} />
        <Row icon={<IconLeaf width={16} height={16} />} iconBg="#4d7c0f" title={c.crops} value={crop.name} trailing={<PhotoThumb crop={crop} size={28} />} />
        <Row icon={<IconWallet width={16} height={16} />} iconBg="#b45309" title={c.location} value={`Kano · ${farmer.geoPoint}`} />
        <Row title={c.member} value="March 2026" />
      </InsetGroup>

      <SectionHeader>{c.ndfr}</SectionHeader>
      <InsetGroup footer="National Digital Farmer Registry — identity verification is simulated in this demo.">
        <Row
          icon={<IconShield width={16} height={16} />}
          iconBg={farmer.ndfrVerified ? 'var(--ios-tint)' : '#8e8e93'}
          title="Verification"
          trailing={farmer.ndfrVerified ? <Chip tone="success">verified</Chip> : <Chip tone="warning">pending</Chip>}
        />
      </InsetGroup>

      <SectionHeader>{c.language}</SectionHeader>
      <div style={{ padding: '0 2px' }}>
        <Segmented
          options={[{ key: 'en', label: 'English' }, { key: 'ha', label: 'Hausa' }]}
          value={lang}
          onChange={(k) => setLang(k as 'en' | 'ha')}
        />
      </div>

      <SectionHeader>{c.credit}</SectionHeader>
      <InsetGroup footer={`Score ${farmer.creditScore} · every completed, repaid cycle adds points.`}>
        {milestones.map((m) => (
          <Row
            key={m.label}
            title={<span style={{ color: m.reached ? undefined : 'var(--ios-label2)' }}>{m.label}</span>}
            trailing={m.reached ? <Chip tone="success">reached</Chip> : <Chip tone="neutral">ahead</Chip>}
          />
        ))}
      </InsetGroup>
    </div>
  )
}
