"use client"

import { useEffect, useState, useRef, useCallback } from 'react'

/*
 * Scroll-driven vehicle background.
 * Horizontal position is controlled by page scroll (scroll down = vehicles move forward).
 * A single rAF loop updates one CSS variable; the GPU handles all transforms.
 * Wiggle is a pure-CSS animation layered on top.
 */

const vehicles = [
  { icon: '🚗', y: 8,  speed: 0.5,  dir: 1,  size: 48, wiggle: 12, startX: 5   },
  { icon: '🛺', y: 25, speed: 0.35, dir: -1, size: 40, wiggle: 8,  startX: 85  },
  { icon: '🏍️', y: 45, speed: 0.6,  dir: 1,  size: 36, wiggle: 15, startX: 20  },
  { icon: '🚕', y: 65, speed: 0.25, dir: -1, size: 44, wiggle: 10, startX: 70  },
  { icon: '🚌', y: 85, speed: 0.2,  dir: 1,  size: 56, wiggle: 6,  startX: 40  },
  { icon: '🚗', y: 15, speed: 0.4,  dir: -1, size: 32, wiggle: 14, startX: 60  },
  { icon: '🛺', y: 50, speed: 0.55, dir: 1,  size: 38, wiggle: 9,  startX: 10  },
  { icon: '🏍️', y: 72, speed: 0.35, dir: -1, size: 30, wiggle: 18, startX: 90  },
]

export function VehicleBackground() {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const scrollRef = useRef(0)

  const updatePositions = useCallback(() => {
    if (!containerRef.current) return

    const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    const progress = window.scrollY / docHeight // 0 → 1

    containerRef.current.style.setProperty('--scroll', String(progress))
    scrollRef.current = progress
  }, [])

  useEffect(() => {
    setMounted(true)

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updatePositions)
    }

    // Set initial position
    updatePositions()

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [updatePositions])

  if (!mounted) return <div className="fixed inset-0 z-0 bg-slate-50 dark:bg-slate-950 pointer-events-none" />

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-slate-50 dark:bg-slate-950" style={{ ['--scroll' as any]: '0' }}>
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
        const wiggleDur = 2.5 + (i % 3) * 0.7
        // Each vehicle travels (speed * 100)vw over the full scroll range.
        // dir controls forward/backward direction.
        // startX offsets them so they aren't all bunched together.
        const travelVw = v.speed * 100
        
        return (
          <div
            key={i}
            className="absolute will-change-transform"
            style={{
              top: `${v.y}%`,
              left: `${v.startX}%`,
              // Smooth CSS transition so small scroll jumps don't look jerky
              transition: 'transform 0.15s linear',
              transform: `translateX(calc(var(--scroll) * ${v.dir * travelVw}vw))`,
            }}
          >
            <span
              style={{
                fontSize: `${v.size}px`,
                opacity: 0.12,
                display: 'inline-block',
                animation: `vehicle-wiggle ${wiggleDur}s ease-in-out infinite`,
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
        @keyframes vehicle-wiggle {
          0%, 100% { transform: translateY(0); }
          25%      { transform: translateY(calc(var(--wiggle-px, 12px) * -1)); }
          75%      { transform: translateY(var(--wiggle-px, 12px)); }
        }
      `}</style>
    </div>
  )
}
