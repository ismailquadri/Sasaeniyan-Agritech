'use client'

import { useLayoutEffect, useState, type ReactNode } from 'react'
import { IconSignal, IconWifi, IconBattery } from '@/components/ios/icons'

const CHASSIS_W = 421
const CHASSIS_H = 886

function useFrameScale() {
  const [scale, setScale] = useState(0.8)
  useLayoutEffect(() => {
    const fit = () =>
      setScale(Math.min(1, (window.innerHeight * 0.88) / CHASSIS_H, (window.innerWidth * 0.92) / CHASSIS_W))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

/** CSS iPhone 16 Pro. Children render as the app inside a .ios-screen. */
export function IPhoneFrame({ children, caption }: { children: ReactNode; caption?: string }) {
  const scale = useFrameScale()
  return (
    <div className="iphone-wrap" style={{ width: CHASSIS_W * scale, height: CHASSIS_H * scale + (caption ? 34 : 0) }}>
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
