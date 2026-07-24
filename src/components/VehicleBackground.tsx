"use client"

import { motion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Car, Bike } from 'lucide-react'

// Array of vehicle icons/emojis and their configuration
const vehicles = [
  { id: 1, type: 'car', icon: '🚗', y: 10, duration: 25, delay: 0, direction: 1, size: 'text-6xl' },
  { id: 2, type: 'auto', icon: '🛺', y: 30, duration: 35, delay: 2, direction: -1, size: 'text-5xl' },
  { id: 3, type: 'bike', icon: '🏍️', y: 55, duration: 20, delay: 5, direction: 1, size: 'text-4xl' },
  { id: 4, type: 'taxi', icon: '🚕', y: 75, duration: 30, delay: 1, direction: -1, size: 'text-5xl' },
  { id: 5, type: 'bus', icon: '🚌', y: 90, duration: 45, delay: 3, direction: 1, size: 'text-7xl' },
]

export function VehicleBackground({ withScroll = false }: { withScroll?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const { scrollYProgress } = useScroll()

  // We use scroll to shift vehicles left/right slightly if withScroll is true
  const scrollOffset1 = useTransform(scrollYProgress, [0, 1], [0, 200])
  const scrollOffset2 = useTransform(scrollYProgress, [0, 1], [0, -200])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="fixed inset-0 z-0 bg-slate-50 dark:bg-slate-950 pointer-events-none" />

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-slate-50 dark:bg-slate-950">
      <div className="absolute inset-0 opacity-40 dark:opacity-20" 
           style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      {vehicles.map((v) => (
        <motion.div
          key={v.id}
          className={`absolute opacity-10 dark:opacity-[0.07] ${v.size}`}
          style={{
            top: `${v.y}%`,
            ...(withScroll ? { x: v.direction === 1 ? scrollOffset1 : scrollOffset2 } : {})
          }}
          animate={{
            x: v.direction === 1 ? ['-20vw', '120vw'] : ['120vw', '-20vw'],
            y: [0, -15, 15, 0] // Subtle bobbing motion
          }}
          transition={{
            x: { duration: v.duration, repeat: Infinity, ease: "linear", delay: v.delay },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <div style={{ transform: v.direction === -1 ? 'scaleX(-1)' : 'none' }}>
            {v.icon}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
