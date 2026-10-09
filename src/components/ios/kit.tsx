'use client'

import type { ReactNode } from 'react'
import { IconChevron, IconCheck } from './icons'

export function NavLargeTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div className="ios-nav">
      <h1 className="ios-largetitle">{title}</h1>
      {trailing}
    </div>
  )
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return <div className="ios-sectionheader">{children}</div>
}

export function InsetGroup({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div>
      <div className="ios-group">{children}</div>
      {footer ? <div className="ios-footnote">{footer}</div> : null}
    </div>
  )
}

export function Row({
  icon,
  iconBg,
  title,
  subtitle,
  value,
  struckValue,
  chevron,
  selected,
  onClick,
  trailing,
}: {
  icon?: ReactNode
  iconBg?: string
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  struckValue?: ReactNode
  chevron?: boolean
  selected?: boolean
  onClick?: () => void
  trailing?: ReactNode
}) {
  if (process.env.NODE_ENV !== 'production' && onClick && trailing)
    console.warn('Row: avoid onClick together with interactive trailing content (nested buttons)')
  const Tag: 'button' | 'div' = onClick ? 'button' : 'div'
  return (
    <Tag className="ios-row" {...(onClick ? { onClick, type: 'button' as const } : {})}>
      {icon ? <span className="ios-iconsq" style={{ background: iconBg ?? 'var(--ios-tint)' }}>{icon}</span> : null}
      <span className="ios-rowbody">
        <span className="ios-rowtitle">{title}</span>
        {subtitle ? <span className="ios-rowsub" style={{ display: 'block' }}>{subtitle}</span> : null}
      </span>
      {struckValue ? <span className="ios-rowvalue struck">{struckValue}</span> : null}
      {value ? <span className="ios-rowvalue strong">{value}</span> : null}
      {trailing}
      {selected ? <IconCheck width={18} height={18} style={{ color: 'var(--ios-tint)' }} /> : null}
      {chevron ? <IconChevron className="ios-chevron" /> : null}
    </Tag>
  )
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button className="ios-btn-primary" onClick={onClick} disabled={disabled || loading} type="button">
      {loading ? '…' : children}
    </button>
  )
}

export function SecondaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className="ios-btn-secondary" onClick={onClick} disabled={disabled} type="button">
      {children}
    </button>
  )
}

export interface TabItem {
  key: string
  label: string
  icon: ReactNode
}

export function TabBar({ items, active, onChange }: { items: TabItem[]; active: string; onChange: (k: string) => void }) {
  return (
    <nav className="ios-tabbar" aria-label="Tab bar">
      {items.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`ios-tab${t.key === active ? ' active' : ''}`}
          onClick={() => onChange(t.key)}
          aria-current={t.key === active ? 'page' : undefined}
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <>
      <div className="ios-scrim" onClick={onClose} />
      <div className="ios-sheet" role="dialog" aria-modal="true">
        <div className="ios-grabber" />
        {children}
      </div>
    </>
  )
}

export function Segmented({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div className="ios-seg" role="radiogroup">
      {options.map((o) => (
        <button key={o.key} type="button" className={o.key === value ? 'active' : ''} aria-pressed={o.key === value} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, min = 1, max = 999, step = 1 }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="ios-stepper">
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <span className="val">{value.toLocaleString('en-NG')}</span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      className={`ios-toggle${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      aria-label={label ?? 'Toggle'}
    />
  )
}

export function Pill({ tone = 'gray', children }: { tone?: 'green' | 'orange' | 'blue' | 'gray'; children: ReactNode }) {
  return <span className={`ios-pill ${tone}`}>{children}</span>
}

export function Progress({ pct }: { pct: number }) {
  return (
    <div className="ios-progress">
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export function EmptyState({ icon, title, message }: { icon?: ReactNode; title: string; message: string }) {
  return (
    <div className="ios-empty">
      {icon}
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}
