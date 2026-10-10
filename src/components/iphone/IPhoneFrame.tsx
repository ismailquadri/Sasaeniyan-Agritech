'use client'

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { IconSignal, IconWifi, IconBattery } from '@/components/ios/icons'

const CHASSIS_W = 421
const CHASSIS_H = 886

function useFrameScale(ref: RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0.8)
  useLayoutEffect(() => {
    const fit = () => {
      // Fit below whatever sits above the frame (header, switcher) so the
      // tab bar + home indicator are never clipped.
      const top = ref.current?.getBoundingClientRect().top ?? 0
      setScale(Math.min(1, (window.innerHeight - top - 24) / CHASSIS_H, (window.innerWidth * 0.92) / CHASSIS_W))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [ref])
  return scale
}

/** CSS iPhone 16 Pro. Children render as the app inside a .ios-screen. */
export function IPhoneFrame({ children, caption }: { children: ReactNode; caption?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const scale = useFrameScale(wrapRef)
  return (
    <div ref={wrapRef} className="iphone-wrap" style={{ width: CHASSIS_W * scale, height: CHASSIS_H * scale + (caption ? 34 : 0) }}>
      <div className="iphone-chassis" style={{ transform: `scale(${scale})` }}>
        <div className="iphone-display">
          <div className="iphone-island" />
          <div className="ios-screen">
            <div className="ios-statusbar">
              <span>9:41</span>
              <span className="ios-statusicons">
                <IconSignal />
                <IconWifi />
                <IconBattery />
              </span>
            </div>
            {children}
            <span className="ios-homeindicator" />
          </div>
        </div>
      </div>
      {caption ? (
        <div className="iphone-caption" style={{ transform: `translateY(${CHASSIS_H * (scale - 1)}px)` }}>{caption}</div>
      ) : null}
    </div>
  )
}
