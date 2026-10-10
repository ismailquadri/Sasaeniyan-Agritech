'use client'

import { formatNaira } from '@/lib/money'
import type { ReactNode } from 'react'

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

/** Money display with tabular figures. */
export function Money({ kobo, className }: { kobo: number; className?: string }) {
  return <span className={cx('tnum', className)}>{formatNaira(kobo)}</span>
}

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}) {
  return (
    <Tag
      className={cx(
        'rounded-2xl border border-line bg-surface shadow-sm shadow-black/[0.03]',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">{children}</h2>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  )
}

type BtnVariant = 'primary' | 'gold' | 'ghost' | 'danger'
const btn: Record<BtnVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  gold: 'bg-gold text-ink hover:brightness-95',
  ghost: 'bg-transparent text-ink border border-line hover:bg-black/[0.03]',
  danger: 'bg-danger text-white hover:brightness-95',
}

export function Button({
  children,
  variant = 'primary',
  className,
  loading,
  ...props
}: {
  children: ReactNode
  variant?: BtnVariant
  loading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-cream active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        btn[variant],
        className,
      )}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  )
}

type Tone = 'brand' | 'gold' | 'clay' | 'ok' | 'warn' | 'danger' | 'neutral' | 'info'
const tones: Record<Tone, string> = {
  brand: 'bg-brand-light text-brand-dark',
  gold: 'bg-gold-light text-warn',
  clay: 'bg-clay-light text-clay',
  ok: 'bg-brand-light text-ok',
  warn: 'bg-gold-light text-warn',
  danger: 'bg-red-50 text-danger',
  info: 'bg-blue-50 text-info',
  neutral: 'bg-black/[0.05] text-muted',
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={cx('mt-1 font-display text-2xl font-bold tnum', tone === 'ok' && 'text-ok')}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted">{sub}</div> : null}
    </Card>
  )
}

/** Plain-language fair-price breakdown (the anti-asymmetry feature). */
export function PriceBreakdown({
  indexPrice,
  factor,
  grade,
  band,
  price,
}: {
  indexPrice: number
  factor: number
  grade: string
  band: [number, number]
  price: number
}) {
  return (
    <div className="rounded-xl bg-brand-light/60 p-3 text-sm">
      <div className="flex justify-between">
        <span className="text-muted">Market index</span>
        <Money kobo={indexPrice} />
      </div>
      <div className="flex justify-between">
        <span className="text-muted">Grade {grade} factor</span>
        <span className="tnum">×{factor}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted">Fair band</span>
        <span className="tnum">
          {formatNaira(band[0])}–{formatNaira(band[1])}
        </span>
      </div>
      <div className="mt-1 flex justify-between border-t border-brand/20 pt-1 font-bold">
        <span>Fair price / basket</span>
        <Money kobo={price} className="text-brand-dark" />
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

const inputBase =
  'w-full min-h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputBase, props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputBase, 'cursor-pointer', props.className)} />
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-cream/60 p-6 text-center text-sm text-muted">
      {children}
    </div>
  )
}

/** Live-connection indicator; pulses on each incoming event. */
export function LiveDot({ flash }: { flash?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ok">
      <span className={cx('size-2 rounded-full bg-ok', flash && 'animate-ping')} />
      <span className="size-2 -ml-3.5 rounded-full bg-ok" />
      Live
    </span>
  )
}

export function SimLabel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gold/40 bg-gold-light px-3 py-1.5 text-xs font-semibold text-warn">
      {children}
    </div>
  )
}
