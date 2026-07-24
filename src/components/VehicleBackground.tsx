"use client"

import { useEffect, useState } from 'react'

/*
 * Pure-CSS animated vehicles background.
 * Every vehicle drifts smoothly from one edge of the screen to the other
 * using a CSS @keyframes animation (linear, infinite).
 * No JavaScript runs per-frame → buttery-smooth even while scrolling.
 */

const vehicles = [
  { icon: '🚗', y: 8,  dur: 22, delay: 0,  dir: 1,  size: 48 },
  { icon: '🛺', y: 25, dur: 30, delay: 4,  dir: -1, size: 40 },
  { icon: '🏍️', y: 45, dur: 18, delay: 2,  dir: 1,  size: 36 },
  { icon: '🚕', y: 65, dur: 28, delay: 6,  dir: -1, size: 44 },
  { icon: '🚌', y: 85, dur: 38, delay: 1,  dir: 1,  size: 56 },
  { icon: '🚗', y: 15, dur: 35, delay: 8,  dir: -1, size: 32 },
  { icon: '🛺', y: 50, dur: 24, delay: 10, dir: 1,  size: 38 },
  { icon: '🏍️', y: 72, dur: 20, delay: 3,  dir: -1, size: 30 },
]

export function VehicleBackground() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="fixed inset-0 z-0 bg-slate-50 dark:bg-slate-950 pointer-events-none" />

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-slate-50 dark:bg-slate-950">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-15"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Vehicles */}
      {vehicles.map((v, i) => {
        const animName = v.dir === 1 ? 'drift-ltr' : 'drift-rtl'
        return (
          <span
            key={i}
            className="absolute will-change-transform"
            style={{
              top: `${v.y}%`,
              fontSize: `${v.size}px`,
              opacity: 0.08,
              animation: `${animName} ${v.dur}s linear ${v.delay}s infinite`,
              transform: v.dir === -1 ? 'scaleX(-1)' : undefined,
            }}
          >
            {v.icon}
          </span>
        )
      })}

      {/* Inline keyframes — keeps everything self-contained */}
      <style jsx global>{`
        @keyframes drift-ltr {
          0%   { left: -10%; }
          100% { left: 110%; }
        }
        @keyframes drift-rtl {
          0%   { left: 110%; }
          100% { left: -10%; }
        }
      `}</style>
    </div>
  )
}
