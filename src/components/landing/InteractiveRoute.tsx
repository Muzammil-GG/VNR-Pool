"use client"

import React, { useEffect, useRef, useState, useId } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Car, Bike, Zap, ArrowRight, Clock, MapPin, Compass, ShieldCheck } from "lucide-react"

export interface RouteDetail {
  id: string
  routeCode: string
  corridorName: string
  origin: string
  originLabel: string
  startCoords: { x: number; y: number }
  destination: string
  destinationLabel: string
  endCoords: { x: number; y: number }
  waypoint: { name: string; x: number; y: number }
  pathD: string
  price: number
  driver: string
  dept: string
  rollPrefix: string
  avatar: string
  avatarBg: string
  time: string
  seatsLeft: number
  vehicle: "car" | "bike" | "auto"
  vehicleName: string
  badge: string
  distanceKm: number
  durationMin: number
}

export const CAMPUS_ROUTES: RouteDetail[] = [
  {
    id: "route-jntu",
    routeCode: "VNR-CR-01",
    corridorName: "Kukatpally / JNTU Corridor",
    origin: "Kukatpally (JNTU Metro Gate 2)",
    originLabel: "JNTU Metro",
    startCoords: { x: 50, y: 310 },
    destination: "VNR VJIET Campus Gate 1",
    destinationLabel: "Campus Gate 1",
    endCoords: { x: 480, y: 70 },
    waypoint: { name: "Pragathi X Roads", x: 250, y: 190 },
    pathD: "M 50 310 C 140 310, 160 210, 250 190 C 350 170, 390 80, 480 70",
    price: 40,
    driver: "Sneha K.",
    dept: "Dept. of CSE '25",
    rollPrefix: "21071A05",
    avatar: "S",
    avatarBg: "bg-blue-600",
    time: "08:15 AM",
    seatsLeft: 2,
    vehicle: "car",
    vehicleName: "Swift Dzire (TS 08)",
    badge: "High Frequency",
    distanceKm: 9.2,
    durationMin: 22,
  },
  {
    id: "route-miyapur",
    routeCode: "VNR-CR-02",
    corridorName: "Miyapur Metro Corridor",
    origin: "Miyapur Metro Station (Pillar 594)",
    originLabel: "Miyapur Metro",
    startCoords: { x: 50, y: 190 },
    destination: "VNR VJIET Campus Gate 2",
    destinationLabel: "Campus Gate 2",
    endCoords: { x: 470, y: 110 },
    waypoint: { name: "Bachupally Center", x: 260, y: 260 },
    pathD: "M 50 190 C 120 190, 170 280, 260 260 C 350 240, 400 130, 470 110",
    price: 30,
    driver: "Pranay R.",
    dept: "Dept. of IT '26",
    rollPrefix: "22071A12",
    avatar: "P",
    avatarBg: "bg-slate-700",
    time: "08:30 AM",
    seatsLeft: 1,
    vehicle: "bike",
    vehicleName: "Yamaha FZ (TS 07)",
    badge: "Express Transit",
    distanceKm: 6.8,
    durationMin: 16,
  },
  {
    id: "route-secbad",
    routeCode: "VNR-CR-03",
    corridorName: "Secunderabad Transit Arterial",
    origin: "Secunderabad (Paradise Hub)",
    originLabel: "Secunderabad",
    startCoords: { x: 440, y: 320 },
    destination: "VNR VJIET Campus Gate 1",
    destinationLabel: "Campus Gate 1",
    endCoords: { x: 480, y: 60 },
    waypoint: { name: "Balanagar Hub", x: 140, y: 230 },
    pathD: "M 440 320 C 300 320, 160 300, 140 230 C 120 140, 360 80, 480 60",
    price: 65,
    driver: "Ananya M.",
    dept: "Dept. of ECE '25",
    rollPrefix: "21071A04",
    avatar: "A",
    avatarBg: "bg-indigo-600",
    time: "07:45 AM",
    seatsLeft: 3,
    vehicle: "car",
    vehicleName: "Hyundai i20 (TS 09)",
    badge: "Women-Only Corridor",
    distanceKm: 24.5,
    durationMin: 45,
  },
  {
    id: "route-pragathi",
    routeCode: "VNR-CR-04",
    corridorName: "Pragathi Nagar Feeder Route",
    origin: "Pragathi Nagar (Lake Arch)",
    originLabel: "Pragathi Nagar",
    startCoords: { x: 160, y: 320 },
    destination: "VNR VJIET Campus Gate 1",
    destinationLabel: "Campus Gate 1",
    endCoords: { x: 460, y: 80 },
    waypoint: { name: "ALEAP Sector", x: 310, y: 210 },
    pathD: "M 160 320 C 210 270, 260 230, 310 210 C 370 185, 410 120, 460 80",
    price: 20,
    driver: "Rahul T.",
    dept: "Dept. of AIML '26",
    rollPrefix: "22071A73",
    avatar: "R",
    avatarBg: "bg-slate-700",
    time: "08:45 AM",
    seatsLeft: 2,
    vehicle: "car",
    vehicleName: "Honda City (TS 08)",
    badge: "Hyperlocal Feeder",
    distanceKm: 3.8,
    durationMin: 10,
  },
  {
    id: "route-gandi",
    routeCode: "VNR-CR-05",
    corridorName: "Gandi Maisamma ORR Corridor",
    origin: "Gandi Maisamma X Roads",
    originLabel: "Gandi Maisamma",
    startCoords: { x: 60, y: 70 },
    destination: "VNR VJIET Campus Gate 2",
    destinationLabel: "Campus Gate 2",
    endCoords: { x: 470, y: 150 },
    waypoint: { name: "Tech Mahindra Hub", x: 230, y: 220 },
    pathD: "M 60 70 C 120 120, 180 250, 230 220 C 290 180, 380 220, 470 150",
    price: 25,
    driver: "Kavya S.",
    dept: "Dept. of CSE '27",
    rollPrefix: "23071A05",
    avatar: "K",
    avatarBg: "bg-blue-600",
    time: "09:00 AM",
    seatsLeft: 2,
    vehicle: "auto",
    vehicleName: "Auto Pool Group",
    badge: "Metered Split",
    distanceKm: 7.5,
    durationMin: 15,
  },
]

export function InteractiveRoute({ onSelectRide }: { onSelectRide: (ride: any) => void }) {
  const pathRef = useRef<SVGPathElement>(null)
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0)
  const [vehiclePos, setVehiclePos] = useState({ x: 50, y: 310, angle: 0 })
  const [progress, setProgress] = useState(0)
  const [hasArrived, setHasArrived] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const activeRoute = CAMPUS_ROUTES[currentRouteIndex]
  const patternId = useId()

  const DRIVE_DURATION = 4800
  const ARRIVAL_PAUSE = 800

  useEffect(() => {
    let animationFrameId: number
    let startTime: number | null = null
    let arrivalTimeout: NodeJS.Timeout | null = null

    setHasArrived(false)
    setProgress(0)

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime

      if (elapsed < DRIVE_DURATION) {
        const t = Math.min(1, elapsed / DRIVE_DURATION)
        setProgress(t)

        if (pathRef.current) {
          const totalLength = pathRef.current.getTotalLength()
          const currentDist = t * totalLength
          const pt = pathRef.current.getPointAtLength(currentDist)

          const nextDist = Math.min(totalLength, currentDist + 3)
          const nextPt = pathRef.current.getPointAtLength(nextDist)
          const dx = nextPt.x - pt.x
          const dy = nextPt.y - pt.y
          const angle = Math.atan2(dy, dx) * (180 / Math.PI)

          setVehiclePos({ x: pt.x, y: pt.y, angle })
        }

        animationFrameId = requestAnimationFrame(step)
      } else {
        setProgress(1)
        setHasArrived(true)

        if (!isPaused) {
          arrivalTimeout = setTimeout(() => {
            setCurrentRouteIndex((prev) => (prev + 1) % CAMPUS_ROUTES.length)
          }, ARRIVAL_PAUSE)
        }
      }
    }

    animationFrameId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(animationFrameId)
      if (arrivalTimeout) clearTimeout(arrivalTimeout)
    }
  }, [currentRouteIndex, isPaused])

  const handleManualSwitch = (idx: number) => {
    setCurrentRouteIndex(idx)
  }

  return (
    <div 
      className="relative w-full max-w-[580px] mx-auto select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Official Telemetry Header Bar */}
      <div className="flex items-center justify-between pb-2.5 px-2 text-xs border-b border-slate-200 dark:border-slate-800 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">
            {activeRoute.corridorName}
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {activeRoute.routeCode}
          </span>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline-flex items-center gap-1">
            <Compass className="w-3 h-3 text-slate-400" />
            17.5389° N, 78.3868° E
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {hasArrived ? "Gate Reached" : `ETA ${Math.max(1, Math.ceil((1 - progress) * activeRoute.durationMin))}m`}
          </span>
          <span>•</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{activeRoute.distanceKm} km</span>
        </div>
      </div>

      {/* Official Map Canvas */}
      <div className="relative w-full aspect-[540/360] rounded-2xl bg-white dark:bg-[#0c101b] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden transition-colors">
        <svg
          viewBox="0 0 540 360"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800/40" strokeWidth="0.75" />
            </pattern>
          </defs>

          {/* Precision Grid Background */}
          <rect width="540" height="360" fill={`url(#${patternId})`} rx="16" />

          {/* Road Foundation Bed */}
          <path
            d={activeRoute.pathD}
            fill="none"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800/80 transition-all duration-700 ease-in-out"
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* Road Surface */}
          <path
            ref={pathRef}
            d={activeRoute.pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            className="text-slate-300 dark:text-[#1e293b] transition-all duration-700 ease-in-out"
          />

          {/* Active Instrumented Telemetry Trail */}
          <path
            d={activeRoute.pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={pathRef.current ? pathRef.current.getTotalLength() : 600}
            strokeDashoffset={pathRef.current ? (1 - progress) * pathRef.current.getTotalLength() : 0}
            className="transition-all ease-linear"
          />

          {/* Dashed Center Stripe */}
          <path
            d={activeRoute.pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            strokeLinecap="round"
            className="text-slate-400 dark:text-white opacity-70"
          />

          {/* Origin Stop */}
          <g transform={`translate(${activeRoute.startCoords.x}, ${activeRoute.startCoords.y})`}>
            <circle r="12" className="fill-white dark:fill-[#0f172a] stroke-slate-400 dark:stroke-slate-600" strokeWidth="2" />
            <circle r="4" fill="#0284c7" />
            <rect x="-42" y="16" width="84" height="16" rx="4" className="fill-white/95 dark:fill-slate-900/95 stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.75" />
            <text
              y="28"
              textAnchor="middle"
              className="text-[9.5px] font-bold fill-slate-800 dark:fill-slate-200 tracking-tight"
            >
              {activeRoute.originLabel}
            </text>
          </g>

          {/* Intermediate Landmark Waypoint Pin */}
          <g transform={`translate(${activeRoute.waypoint.x}, ${activeRoute.waypoint.y})`}>
            <circle r="4" className="fill-slate-400 dark:fill-slate-500" opacity="0.9" />
            <circle r="1.5" fill="#ffffff" />
            <rect x="-44" y="-22" width="88" height="14" rx="3" className="fill-white/90 dark:fill-slate-900/90 stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.5" />
            <text
              y="-12"
              textAnchor="middle"
              className="text-[8.5px] font-semibold fill-slate-600 dark:fill-slate-300 tracking-tight"
            >
              {activeRoute.waypoint.name}
            </text>
          </g>

          {/* Destination Gateway (Campus Gate) */}
          <g transform={`translate(${activeRoute.endCoords.x}, ${activeRoute.endCoords.y})`}>
            <circle r="14" className="fill-white dark:fill-[#0f172a] stroke-blue-600 dark:stroke-blue-500" strokeWidth="2.5" />
            <circle r="5" fill="#2563eb" className={hasArrived ? "animate-ping" : ""} />
            <rect x="-46" y="-30" width="92" height="16" rx="4" className="fill-blue-50/95 dark:fill-blue-950/90 stroke-blue-200 dark:stroke-blue-800" strokeWidth="0.75" />
            <text
              y="-18"
              textAnchor="middle"
              className="text-[9px] font-black fill-blue-700 dark:fill-blue-300 tracking-wider uppercase"
            >
              {activeRoute.destinationLabel}
            </text>
          </g>

          {/* Moving Vehicle Telemetry Node */}
          <g
            transform={`translate(${vehiclePos.x}, ${vehiclePos.y}) rotate(${vehiclePos.angle})`}
            className="cursor-pointer transition-transform duration-75"
            onClick={() => onSelectRide(activeRoute)}
          >
            <circle r="16" fill="#2563eb" opacity="0.18" />
            <circle
              r="13"
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth="2"
              className="dark:fill-[#0b0f19] dark:stroke-[#3b82f6]"
            />
            <g transform="translate(-6, -6)">
              <foreignObject width="12" height="12">
                <div className="flex items-center justify-center w-full h-full text-blue-600 dark:text-white">
                  {activeRoute.vehicle === "bike" ? (
                    <Bike className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  ) : activeRoute.vehicle === "auto" ? (
                    <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  ) : (
                    <Car className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              </foreignObject>
            </g>
          </g>
        </svg>

        {/* Floating Official Ride Dispatch Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRoute.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={() => onSelectRide(activeRoute)}
            className="absolute top-3.5 left-3.5 right-3.5 sm:right-auto sm:max-w-[310px] p-3.5 rounded-xl bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors group z-20"
          >
            {/* Header: Verified Student Dispatch & Cost */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {hasArrived ? "Campus Gate Reached" : activeRoute.badge}
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                ₹{activeRoute.price}
                <span className="text-[10px] text-slate-500 font-normal ml-0.5">fuel split</span>
              </span>
            </div>

            {/* Commute Route Points */}
            <div className="space-y-1 mb-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium truncate">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                <span className="truncate">{activeRoute.origin}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold truncate">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                <span className="truncate">{activeRoute.destination}</span>
              </div>
            </div>

            {/* Student Driver Credential */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full ${activeRoute.avatarBg} text-white font-bold flex items-center justify-center text-[9px]`}>
                  {activeRoute.avatar}
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{activeRoute.driver}</span>
                  <span className="text-slate-500 ml-1 text-[10px]">({activeRoute.dept})</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span className="font-semibold">{activeRoute.time}</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-slate-900 text-blue-700 dark:text-slate-300 font-bold text-[10px] border border-blue-200 dark:border-slate-800">
                  {activeRoute.seatsLeft} seat{activeRoute.seatsLeft > 1 ? 's' : ''} left
                </span>
              </div>
            </div>

            {/* Action Request */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              <span>{hasArrived ? "Loop finished • Click to book" : "Request seat in verified pool"}</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Official Corridor Selectors */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 px-1">
        {CAMPUS_ROUTES.map((route, idx) => (
          <button
            key={route.id}
            onClick={() => handleManualSwitch(idx)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              idx === currentRouteIndex
                ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white border border-slate-700 shadow-xs"
                : "bg-slate-100 text-slate-700 hover:text-slate-900 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800/60"
            }`}
          >
            {route.originLabel}
          </button>
        ))}
      </div>
    </div>
  )
}
