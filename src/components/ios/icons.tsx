// SF-symbol-style SVG glyphs. All stroke-based, currentColor, 24×24 viewBox.
import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' as const,
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  ...p,
})

export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
)
export const IconSell = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h13l-3-3M20 17H7l3 3" /></svg>
)
export const IconWallet = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12.5h.01" strokeWidth="3" /></svg>
)
export const IconPerson = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4.5 20c1.6-3.2 4.3-5 7.5-5s5.9 1.8 7.5 5" /></svg>
)
export const IconToday = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 9.5h16M8 3.5v3M16 3.5v3" /></svg>
)
export const IconEnrol = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="10" cy="8" r="3.5" /><path d="M3.5 19c1.4-2.8 3.7-4.3 6.5-4.3s5.1 1.5 6.5 4.3" /><path d="M18 6v6M15 9h6" /></svg>
)
export const IconOrders = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></svg>
)
export const IconPost = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
)
export const IconBuilding = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20v-3.5h4V20" /></svg>
)
export const IconChevron = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 14, height: 14, strokeWidth: 2.4, ...p })}><path d="m9 5 7 7-7 7" /></svg>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2.4, ...p })}><path d="m4.5 12.5 5 5 10-11" /></svg>
)
export const IconLeaf = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Z" /><path d="M5 19c3-5 7-9 11-11" /></svg>
)
export const IconTray = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 13.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4.5M3 13.5h5l1.5 2.5h5l1.5-2.5h5M12 4v7M9.5 8.5 12 11l2.5-2.5" /></svg>
)
export const IconShield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3 5 6v5c0 5 3.2 8.4 7 10 3.8-1.6 7-5 7-10V6z" /><path d="m9 11.5 2 2 4-4.5" /></svg>
)
export const IconSignal = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0.5" width="3" height="11.5" rx="1" /></svg>
)
export const IconWifi = () => (
  <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 4.2a10.5 10.5 0 0 1 14 0M4 7a7 7 0 0 1 9 0M6.5 9.6a3.5 3.5 0 0 1 4 0" /><circle cx="8.5" cy="11" r="0.8" fill="currentColor" stroke="none" /></svg>
)
export const IconBattery = () => (
  <svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="currentColor" opacity="0.4" /><rect x="2" y="2" width="16" height="9" rx="2" fill="currentColor" /><path d="M24.5 4.5v4a2.2 2.2 0 0 0 0-4Z" fill="currentColor" opacity="0.4" /></svg>
)

/** Crop glyph + its iOS icon-square color. */
export function cropGlyph(crop: string) {
  if (crop === 'tomato')
    return { color: '#FF3B30', icon: <svg {...base({ width: 16, height: 16 })}><circle cx="12" cy="14" r="7" /><path d="M12 7V4.5M9.5 6.5 12 7l2.5-.5" /></svg> }
  if (crop === 'pepper')
    return { color: '#FF9500', icon: <svg {...base({ width: 16, height: 16 })}><path d="M12 6c3.5 2 4.5 7.5 0 13.5C7.5 13.5 8.5 8 12 6Z" /><path d="M12 6V3.5" /></svg> }
  return { color: '#AF52DE', icon: <svg {...base({ width: 16, height: 16 })}><circle cx="12" cy="13" r="6.5" /><path d="M12 6.5c-1.5-1.5-1.5-3 0-4 1.5 1 1.5 2.5 0 4Z" /></svg> }
}
