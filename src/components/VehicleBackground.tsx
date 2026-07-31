import { useEffect, useState, useRef, useCallback } from 'react'

const vehicles = [
  // Reduced vehicles for cleaner UI
  { icon: '🚗', y: 15, speed: 0.5,  dir: 1,  size: 48, wiggle: 12, startX: 5   },
  { icon: '🛺', y: 30, speed: 0.4,  dir: -1, size: 40, wiggle: 8,  startX: 25  },
  { icon: '🚌', y: 45, speed: 0.25, dir: 1,  size: 56, wiggle: 6,  startX: 75  },
  { icon: '🏍️', y: 60, speed: 0.7,  dir: -1, size: 36, wiggle: 16, startX: 35  },
  { icon: '🚕', y: 75, speed: 0.45, dir: 1,  size: 44, wiggle: 11, startX: 90  },
  { icon: '🏍️', y: 90, speed: 0.8,  dir: -1, size: 32, wiggle: 18, startX: 15  },
]

export function VehicleBackground() {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  
  const updatePositions = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return

    const scrollY = window.scrollY
    const width = window.innerWidth
    const buffer = 150
    const totalWidth = width + buffer * 2

    const vehicleElements = containerRef.current.querySelectorAll<HTMLElement>('.vehicle-wrapper')
    
    vehicleElements.forEach((el, i) => {
      const v = vehicles[i]
      const startPx = (v.startX / 100) * totalWidth
      const movePx = scrollY * v.speed * v.dir
      
      let currentPx = (startPx + movePx) % totalWidth
      if (currentPx < 0) currentPx += totalWidth
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
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-background flex items-center justify-center">
      {/* Premium Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.2]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(79, 70, 229, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(79, 70, 229, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '4rem 4rem',
          maskImage: 'radial-gradient(ellipse 80% 100% at 50% 0%, black 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 100% at 50% 0%, black 20%, transparent 100%)',
        }}
      />
      
      {/* Ambient Glowing Orbs Removed for cleaner UI */}

      {/* Floating Vehicles */}
      {vehicles.map((v, i) => {
        const flipClass = v.dir === -1 ? 'scale-x-[-1]' : ''
        
        return (
          <div
            key={i}
            className="vehicle-wrapper absolute left-0 will-change-transform"
            style={{ 
              top: `${v.y}%`,
              transform: `translateX(-1000px)` 
            }}
          >
            <div 
              className={`flex items-center justify-center ${flipClass} drop-shadow-2xl opacity-40 dark:opacity-20`}
              style={{ fontSize: `${v.size}px` }}
            >
              <div 
                className="animate-wiggle"
                style={{ 
                  animationDuration: `${0.8 + Math.random() * 0.4}s`,
                  animationDelay: `${Math.random() * -1}s`,
                }}
              >
                {v.icon}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
