'use client'

import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { fairPrice, type Grade } from '@/domain/pricing/pricing'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, PrimaryButton, SecondaryButton, Pill } from '@/components/ios/kit'
import { cropGlyph, IconShield } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function HomeTab({ state, farmer, onSell }: { state: AppState; farmer: any; onSell: () => void }) {
  const wallet = state.wallets.find((w) => w.ownerId === farmer.id)
  const openContract = (crop: string) => state.contracts.find((c) => c.crop === crop && c.status !== 'closed')

  return (
    <div className="ios-content">
      <NavLargeTitle title="Home" trailing={<div className="ios-avatar">{farmer.name[0]}</div>} />

      <div className="ios-balancecard">
        <div className="ios-caption1">Wallet balance</div>
        <div className="ios-balance">{formatNaira(wallet?.balance ?? 0)}</div>
        {farmer.ndfrVerified ? (
          <Pill tone="green"><IconShield width={12} height={12} /> NDFR verified</Pill>
        ) : (
          <Pill tone="gray">NDFR pending</Pill>
        )}
        <div className="ios-balance-actions">
          <PrimaryButton onClick={onSell}>Sell harvest</PrimaryButton>
          <SecondaryButton onClick={onSell}>Prices</SecondaryButton>
        </div>
      </div>

      <SectionHeader>Today&apos;s prices</SectionHeader>
      <InsetGroup footer="Fair price = market index × grade factor, kept inside your contract band. The struck price is the farm-gate glut offer.">
        {state.marketIndex.map((m) => {
          const c = openContract(m.crop)
          const fp = c
            ? fairPrice({ indexPrice: m.indexPrice, grade: c.grade as Grade, bandMin: c.bandMin, bandMax: c.bandMax })
            : null
          const g = cropGlyph(m.crop)
          return (
            <Row
              key={m.id}
              icon={g.icon}
              iconBg={g.color}
              title={cap(m.crop)}
              subtitle={c ? 'open contract' : 'no open contract'}
              struckValue={fp && fp !== m.indexPrice ? formatNaira(m.indexPrice) : undefined}
              value={formatNaira(fp ?? m.indexPrice)}
              chevron
              onClick={onSell}
            />
          )
        })}
      </InsetGroup>
    </div>
  )
}
