import { useEffect, useState, useRef, useCallback } from 'react'

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
      
      {/* Ambient Glowing Orbs */}
      <div 
        className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/15 blur-[120px] mix-blend-normal dark:mix-blend-screen animate-pulse" 
        style={{ animationDuration: '8s' }} 
      />
      <div 
        className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] mix-blend-normal dark:mix-blend-screen animate-pulse" 
        style={{ animationDuration: '10s', animationDelay: '2s' }} 
      />
      <div 
        className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] mix-blend-normal dark:mix-blend-screen animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '1s' }} 
      />

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
              className={`flex items-center justify-center ${flipClass} drop-shadow-2xl opacity-100 dark:opacity-80`}
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
