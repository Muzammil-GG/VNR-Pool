"use client"

import { useEffect, useState } from 'react'

/*
 * Pure-CSS animated vehicles background.
 * Vehicles drift smoothly across the screen with a gentle vertical wiggle.
 * No JS runs per-frame → buttery-smooth even while scrolling.
 */

const vehicles = [
  { icon: '🚗', y: 8,  dur: 22, delay: 0,  dir: 1,  size: 48, wiggle: 12 },
  { icon: '🛺', y: 25, dur: 30, delay: 4,  dir: -1, size: 40, wiggle: 8  },
  { icon: '🏍️', y: 45, dur: 18, delay: 2,  dir: 1,  size: 36, wiggle: 15 },
  { icon: '🚕', y: 65, dur: 28, delay: 6,  dir: -1, size: 44, wiggle: 10 },
  { icon: '🚌', y: 85, dur: 38, delay: 1,  dir: 1,  size: 56, wiggle: 6  },
  { icon: '🚗', y: 15, dur: 35, delay: 8,  dir: -1, size: 32, wiggle: 14 },
  { icon: '🛺', y: 50, dur: 24, delay: 10, dir: 1,  size: 38, wiggle: 9  },
  { icon: '🏍️', y: 72, dur: 20, delay: 3,  dir: -1, size: 30, wiggle: 18 },
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

      {/* Vehicles — each wrapped in two layers: outer = horizontal drift, inner = vertical wiggle */}
      {vehicles.map((v, i) => {
        // dir=1 → left-to-right (faces right), dir=-1 → right-to-left (faces left)
        const driftAnim = v.dir === 1 ? 'drive-ltr' : 'drive-rtl'
        const wiggleDur = 2.5 + (i % 3) * 0.7 // slightly varied wiggle speed per vehicle

        return (
          <div
            key={i}
            className="absolute will-change-transform"
            style={{
              top: `${v.y}%`,
              animation: `${driftAnim} ${v.dur}s linear -${v.delay}s infinite`,
            }}
          >
            <span
              style={{
                fontSize: `${v.size}px`,
                opacity: 0.08,
                display: 'inline-block',
                animation: `wiggle ${wiggleDur}s ease-in-out infinite`,
                // dir=-1 vehicles travel right-to-left, so flip them to face left
                transform: v.dir === -1 ? 'scaleX(-1)' : undefined,
                ['--wiggle-px' as any]: `${v.wiggle}px`,
              }}
            >
              {v.icon}
            </span>
          </div>
        )
      })}

      <style jsx global>{`
        /* Horizontal drift */
        @keyframes drive-ltr {
          0%   { left: -8%; }
          100% { left: 108%; }
        }
        @keyframes drive-rtl {
          0%   { left: 108%; }
          100% { left: -8%; }
        }

        /* Gentle vertical wiggle */
        @keyframes wiggle {
          0%, 100% { transform: translateY(0) var(--flip, ); }
          25%      { transform: translateY(calc(var(--wiggle-px, 12px) * -1)); }
          75%      { transform: translateY(var(--wiggle-px, 12px)); }
        }

        /* Override wiggle for flipped vehicles so scaleX is preserved */
        [style*="scaleX(-1)"] {
          --flip: scaleX(-1);
        }
      `}</style>
    </div>
  )
}
