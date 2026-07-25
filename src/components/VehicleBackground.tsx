"use client"

import { useEffect, useState, useRef, useCallback } from 'react'

/*
 * Scroll-driven vehicle background.
 * Horizontal position is controlled by page scroll (scroll down = vehicles move forward).
 * A single rAF loop updates one CSS variable; the GPU handles all transforms.
 * Wiggle is a pure-CSS animation layered on top.
 */

const vehicles = [
  // Lane 1 (Top)
  { icon: '🚗', y: 5,  speed: 0.5,  dir: 1,  size: 48, wiggle: 12, startX: 5   },
  { icon: '🏍️', y: 12, speed: 0.65, dir: 1,  size: 34, wiggle: 15, startX: 65  },
  // Lane 2
  { icon: '🛺', y: 20, speed: 0.4,  dir: -1, size: 40, wiggle: 8,  startX: 25  },
  { icon: '🚕', y: 28, speed: 0.5,  dir: -1, size: 42, wiggle: 10, startX: 80  },
  // Lane 3
  { icon: '🚌', y: 35, speed: 0.25, dir: 1,  size: 56, wiggle: 6,  startX: 15  },
  { icon: '🚗', y: 42, speed: 0.6,  dir: 1,  size: 46, wiggle: 14, startX: 75  },
  // Lane 4
  { icon: '🏍️', y: 50, speed: 0.7,  dir: -1, size: 36, wiggle: 16, startX: 35  },
  { icon: '🛺', y: 58, speed: 0.35, dir: -1, size: 38, wiggle: 9,  startX: 90  },
  // Lane 5
  { icon: '🚕', y: 65, speed: 0.45, dir: 1,  size: 44, wiggle: 11, startX: 10  },
  { icon: '🚗', y: 72, speed: 0.55, dir: 1,  size: 48, wiggle: 13, startX: 60  },
  // Lane 6 (Bottom)
  { icon: '🚌', y: 82, speed: 0.2,  dir: -1, size: 54, wiggle: 7,  startX: 45  },
  { icon: '🏍️', y: 90, speed: 0.8,  dir: -1, size: 32, wiggle: 18, startX: 95  },
]

export function VehicleBackground() {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const scrollRef = useRef(0)

  const updatePositions = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return

    const scrollY = window.scrollY
    const width = window.innerWidth
    const buffer = 150 // pixels to wait before wrapping so they fully exit screen
    const totalWidth = width + buffer * 2

    const vehicleElements = containerRef.current.querySelectorAll<HTMLElement>('.vehicle-wrapper')
    
    vehicleElements.forEach((el, i) => {
      const v = vehicles[i]
      
      // Map startX percentage to pixels
      const startPx = (v.startX / 100) * totalWidth
      
      // Absolute scroll movement (1px scroll = v.speed px vehicle movement)
      const movePx = scrollY * v.speed * v.dir
      
      // Wrap around infinitely
      let currentPx = (startPx + movePx) % totalWidth
      if (currentPx < 0) currentPx += totalWidth
      
      // Offset by buffer so 0 is actually off-screen left
      currentPx -= buffer
      
      el.style.transform = `translateX(${currentPx}px)`
    })
  }, [])

  useEffect(() => {
    setMounted(true)

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updatePositions)
    }

    // Set initial position
    // Delay slightly to ensure window.innerWidth is correct
    setTimeout(updatePositions, 10)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updatePositions, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updatePositions)
      cancelAnimationFrame(rafRef.current)
    }
  }, [updatePositions])

  if (!mounted) return <div className="fixed inset-0 -z-10 bg-slate-50 dark:bg-slate-950 pointer-events-none" />

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-background">
      {/* Magic UI / Aceternity Style Animated Grid */}
      <div 
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:[mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
      ></div>
      <div 
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.2]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(16, 185, 129, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(16, 185, 129, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
        }}
      ></div>
      
      {/* A vibrant animated glowing orb in the center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 dark:bg-emerald-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none animate-pulse"></div>

      {/* Vehicles */}
      {vehicles.map((v, i) => {
        const wiggleDur = 2.5 + (i % 3) * 0.7
        
        return (
          <div
            key={i}
            className="vehicle-wrapper absolute will-change-transform"
            style={{
              top: `${v.y}%`,
              left: 0, // Pos is fully controlled by translateX
              // Very subtle transition so rapid scroll events are smoothed, but short enough to avoid lag
              transition: 'transform 0.05s linear',
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
