'use client'

// Hybrid upgrade kit — hero cards, sparklines, journey tracking, photography,
// and state scaffolding (skeletons, banners, toasts). All a11y-complete.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatNaira } from '@/lib/money'
import type { Crop } from '@/domain/crops'

/* ---------------------------------------------------------------- HeroCard */

export function HeroCard({
  gradient = 'farmer',
  label,
  chips,
  balance,
  children,
}: {
  gradient?: 'farmer' | 'agent' | 'buyer'
  label: string
  chips?: ReactNode
  balance: number
  children?: ReactNode
}) {
  return (
    <div className={`ios-hero ios-hero--${gradient}`}>
      <div className="ios-hero-toprow">
        <span className="ios-hero-label">{label}</span>
        {chips ? <span className="ios-hero-chips">{chips}</span> : null}
      </div>
      <div className="ios-hero-balance tnum">{formatNaira(balance)}</div>
      {children ? <div className="ios-hero-actions">{children}</div> : null}
    </div>
  )
}

export function HeroAction({
  children,
  onClick,
  primary,
}: {
  children: ReactNode
  onClick?: () => void
  primary?: boolean
}) {
  return (
    <button type="button" className={`ios-heroaction${primary ? ' primary' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

/* -------------------------------------------------------------------- Chip */

type ChipTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold'

export function Chip({
  tone = 'neutral',
  onDark,
  icon,
  children,
}: {
  tone?: ChipTone
  onDark?: boolean
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <span className={`ios-chip ${tone}${onDark ? ' ondark' : ''}`}>
      {icon}
      {children}
    </span>
  )
}

/* --------------------------------------------------------------- Sparkline */

export function Sparkline({
  points,
  width = 34,
  height = 14,
  label,
}: {
  points: number[]
  width?: number
  height?: number
  label?: string
}) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = width / (points.length - 1)
  const d = points
    .map((p, i) => `${(i * step).toFixed(1)},${(height - 1.5 - ((p - min) / span) * (height - 3)).toFixed(1)}`)
    .join(' ')
  const rising = points[points.length - 1] >= points[0]
  return (
    <svg width={width} height={height} role="img" aria-label={label ?? `price trend, ${rising ? 'rising' : 'falling'}`}>
      <polyline points={d} fill="none" stroke={rising ? '#1f9d4d' : '#c0392b'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Delta({ points }: { points: number[] }) {
  if (points.length < 2 || points[0] === 0) return null
  const pct = ((points[points.length - 1] - points[0]) / points[0]) * 100
  const rising = pct >= 0
  return (
    <span className="ios-delta tnum" style={{ color: rising ? '#117a38' : '#c0392b' }}>
      {rising ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

/* ---------------------------------------------------------- JourneyTracker */

export function JourneyTracker({
  steps,
  current,
  rejected,
}: {
  steps: string[]
  current: number
  rejected?: boolean
}) {
  const state = rejected ? 'rejected' : steps[Math.min(current, steps.length - 1)]
  return (
    <div
      className="ios-journey"
      role="img"
      aria-label={rejected ? `rejected at ${steps[current]}` : `${state}, step ${current + 1} of ${steps.length}`}
    >
      <div className="ios-journey-track">
        {steps.map((_, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && <span className={`ios-journey-bar${i <= current ? ' done' : ''}${rejected && i === current ? ' bad' : ''}`} />}
            <span
              className={`ios-journey-dot${i < current ? ' done' : ''}${i === current ? (rejected ? ' bad' : ' now') : ''}`}
            />
          </span>
        ))}
      </div>
      <div className="ios-journey-labels">
        {steps.map((s, i) => (
          <span key={s} className={i === current ? (rejected ? 'bad' : 'now') : i < current ? 'done' : ''}>
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- Photography */

export function PhotoThumb({ crop, size = 32 }: { crop: Crop; size?: number }) {
  return (
    <img
      src={crop.photo}
      alt={crop.name}
      width={size}
      height={size}
      loading="lazy"
      style={{ background: crop.fallback, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
    />
  )
}

export function PhotoCard({
  crop,
  label,
  sub,
  badge,
  onClick,
  selected,
  height = 96,
}: {
  crop: Crop
  label?: string
  sub?: string
  badge?: ReactNode
  onClick?: () => void
  selected?: boolean
  height?: number
}) {
  const Tag: 'button' | 'div' = onClick ? 'button' : 'div'
  return (
    <Tag
      className={`ios-photocard${selected ? ' selected' : ''}`}
      style={{ height }}
      {...(onClick ? { onClick, type: 'button' as const, 'aria-pressed': selected } : {})}
    >
      <img src={crop.photo} alt={crop.name} loading="lazy" style={{ background: crop.fallback }} />
      {badge ? <span className="ios-photocard-badge">{badge}</span> : null}
      <span className="ios-photocard-overlay">
        <span className="ios-photocard-label">{label ?? crop.name}</span>
        {sub ? <span className="ios-photocard-sub">{sub}</span> : null}
      </span>
    </Tag>
  )
}

/* ------------------------------------------------------------------ States */

export function Skeleton({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  return <span className="ios-skel" style={{ width: w, height: h, borderRadius: r }} aria-hidden />
}

export function SkeletonScreen({ title = true }: { title?: boolean }) {
  return (
    <div className="ios-content" aria-busy="true" aria-label="Loading">
      {title && <div style={{ padding: '10px 0 14px' }}><Skeleton w={140} h={30} r={8} /></div>}
      <Skeleton w="100%" h={120} r={16} />
      <div style={{ height: 18 }} />
      <Skeleton w={120} h={13} r={6} />
      <div style={{ height: 8 }} />
      <div className="ios-group" style={{ padding: 0 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="ios-row">
            <Skeleton w={32} h={32} r={8} />
            <span className="ios-rowbody"><Skeleton w="62%" h={15} r={6} /></span>
            <Skeleton w={56} h={15} r={6} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Banner({
  tone,
  children,
  onRetry,
}: {
  tone: 'offline' | 'error'
  children?: ReactNode
  onRetry?: () => void
}) {
  return (
    <div className={`ios-banner ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span>{children ?? (tone === 'offline' ? "You're offline — showing last known data" : 'Could not load data')}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry}>Retry</button>
      ) : null}
    </div>
  )
}

export function Toast({ msg }: { msg: string | null }) {
  return (
    <div className="ios-toast-host" aria-live="polite">
      {msg ? <div className="ios-toast">{msg}</div> : null}
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const show = (m: string) => {
    setToast(m)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 3500)
  }
  return { toast, show }
}

/* ---------------------------------------------------------------- DayGroup */

const dayLabel = (d: Date) => {
  const today = new Date()
  const atMidnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((atMidnight(today) - atMidnight(d)) / 86_400_000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export function DayGroup({ date, children }: { date: string | Date; children: ReactNode }) {
  return (
    <div>
      <div className="ios-sectionheader">{dayLabel(new Date(date))}</div>
      {children}
    </div>
  )
}

/** Group a date-sorted list into [label, items[]] buckets for DayGroup rendering. */
export function groupByDay<T>(items: T[], dateOf: (t: T) => string | Date): [string, T[]][] {
  const out: [string, T[]][] = []
  for (const item of items) {
    const label = dayLabel(new Date(dateOf(item)))
    const last = out[out.length - 1]
    if (last && last[0] === label) last[1].push(item)
    else out.push([label, [item]])
  }
  return out
}
