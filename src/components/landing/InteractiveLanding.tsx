"use client"

import React, { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Righteous } from "next/font/google"
import {
  ArrowRight,
  Search,
  ShieldCheck,
  Users,
  Zap,
  Play,
  Clock,
  MapPin,
  ChevronDown,
  Leaf,
  School,
  Building2,
  Calendar,
  AlertCircle,
  ExternalLink,
  Phone,
  Compass,
} from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { InteractiveRoute } from "./InteractiveRoute"
import { HowItWorksModal } from "./HowItWorksModal"
import { AuthModal } from "./AuthModal"
import { createClient } from "@/lib/supabase/client"

const righteous = Righteous({ weight: "400", subsets: ["latin"] })

interface RideItem {
  id: string
  routeCode: string
  corridor: string
  driverName: string
  driverInitial: string
  avatarBg: string
  rating: number
  price: number
  from: string
  to: string
  time: string
  seatsLeft: number
  vehicleType: "car" | "bike" | "auto"
  vehicleModel: string
  isWomenOnly?: boolean
  dept: string
}

const ALL_LIVE_RIDES: RideItem[] = [
  {
    id: "live-1",
    routeCode: "VNR-CR-01",
    corridor: "Kukatpally / JNTU",
    driverName: "Sneha K.",
    driverInitial: "S",
    avatarBg: "bg-blue-600",
    rating: 4.9,
    price: 40,
    from: "Kukatpally (JNTU Metro Gate 2)",
    to: "VNR Campus Gate 1",
    time: "08:15 AM",
    seatsLeft: 2,
    vehicleType: "car",
    vehicleModel: "Swift Dzire",
    dept: "CSE '25",
  },
  {
    id: "live-2",
    routeCode: "VNR-CR-02",
    corridor: "Miyapur Metro",
    driverName: "Pranay R.",
    driverInitial: "P",
    avatarBg: "bg-slate-700",
    rating: 4.8,
    price: 30,
    from: "Miyapur Metro (Pillar 594)",
    to: "VNR Campus Gate 2",
    time: "08:30 AM",
    seatsLeft: 1,
    vehicleType: "bike",
    vehicleModel: "Yamaha FZ",
    dept: "IT '26",
  },
  {
    id: "live-3",
    routeCode: "VNR-CR-03",
    corridor: "Secunderabad",
    driverName: "Ananya M.",
    driverInitial: "A",
    avatarBg: "bg-indigo-600",
    rating: 5.0,
    price: 65,
    from: "Secunderabad (Paradise Hub)",
    to: "VNR Campus Gate 1",
    time: "07:45 AM",
    seatsLeft: 3,
    vehicleType: "car",
    vehicleModel: "Hyundai i20",
    isWomenOnly: true,
    dept: "ECE '25",
  },
  {
    id: "live-4",
    routeCode: "VNR-CR-04",
    corridor: "Pragathi Nagar",
    driverName: "Rahul T.",
    driverInitial: "R",
    avatarBg: "bg-slate-700",
    rating: 4.9,
    price: 20,
    from: "Pragathi Nagar (Lake Arch)",
    to: "VNR Campus Gate 1",
    time: "08:45 AM",
    seatsLeft: 2,
    vehicleType: "car",
    vehicleModel: "Honda City",
    dept: "AIML '26",
  },
  {
    id: "live-5",
    routeCode: "VNR-CR-01",
    corridor: "Kukatpally / JNTU",
    driverName: "Karthik V.",
    driverInitial: "K",
    avatarBg: "bg-blue-600",
    rating: 4.7,
    price: 35,
    from: "KPHB Colony (Phase 1)",
    to: "VNR Campus Gate 1",
    time: "08:20 AM",
    seatsLeft: 1,
    vehicleType: "bike",
    vehicleModel: "Royal Enfield",
    dept: "EEE '25",
  },
  {
    id: "live-6",
    routeCode: "VNR-CR-04",
    corridor: "Pragathi Nagar",
    driverName: "Divya S.",
    driverInitial: "D",
    avatarBg: "bg-indigo-600",
    rating: 4.9,
    price: 25,
    from: "Simhapuri Colony Kaman",
    to: "VNR Campus Gate 2",
    time: "08:50 AM",
    seatsLeft: 2,
    vehicleType: "car",
    vehicleModel: "Tata Altroz",
    isWomenOnly: true,
    dept: "CSBS '27",
  },
]

const CORRIDOR_FILTERS = [
  "All Corridors",
  "Kukatpally / JNTU",
  "Miyapur Metro",
  "Secunderabad",
  "Pragathi Nagar",
  "Female-Only",
]

const FAQ_ITEMS = [
  {
    question: "Who can use VNR Pool?",
    answer: "Only verified VNR VJIET students, faculty, and staff with an active @vnrvjiet.in email account.",
  },
  {
    question: "How does the fuel split work?",
    answer: "Riders share the exact fuel cost on a non-profit basis. No commercial markups or surge pricing.",
  },
  {
    question: "How do Women-Only rides work?",
    answer: "Female drivers can restrict rides exclusively to verified female students and faculty.",
  },
  {
    question: "Where are the pickup and drop points?",
    answer: "Major metro stops (JNTU, Miyapur), Pragathi Nagar, Gandi Maisamma, and campus Gates 1 & 2.",
  },
]

interface InteractiveLandingProps {
  defaultAuthOpen?: boolean
  defaultAuthMode?: "login" | "signup"
}

export function InteractiveLanding({
  defaultAuthOpen = false,
  defaultAuthMode = "login",
}: InteractiveLandingProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(defaultAuthOpen)
  const [authMode, setAuthMode] = useState<"login" | "signup">(defaultAuthMode)
  const [authContext, setAuthContext] = useState<string | undefined>(undefined)
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false)

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState("All Corridors")
  const [searchOrigin, setSearchOrigin] = useState("Kukatpally (JNTU Metro Gate 2)")
  const [searchDest, setSearchDest] = useState("VNR Campus Gate 1")

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  useEffect(() => {
    // If the client has a valid session already, navigate directly to dashboard
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          window.location.href = "/"
        }
      })
    } catch {
      // Ignore
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("auth") === "login" || params.get("mode") === "login") {
        setAuthMode("login")
        setIsAuthOpen(true)
      } else if (params.get("auth") === "signup" || params.get("mode") === "signup") {
        setAuthMode("signup")
        setIsAuthOpen(true)
      }
    }
  }, [])

  const openAuth = (mode: "login" | "signup", context?: string) => {
    setAuthMode(mode)
    setAuthContext(context)
    setIsAuthOpen(true)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    openAuth("login", `Rides from ${searchOrigin.split('(')[0].trim()}`)
  }

  const filteredRides = useMemo(() => {
    if (activeFilter === "All Corridors") return ALL_LIVE_RIDES
    if (activeFilter === "Female-Only") return ALL_LIVE_RIDES.filter((r) => r.isWomenOnly)
    return ALL_LIVE_RIDES.filter((r) => r.corridor === activeFilter)
  }, [activeFilter])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-slate-100 relative overflow-x-hidden selection:bg-blue-600 selection:text-white transition-colors duration-200">
      
      {/* ═══════════════════════════════════════════════════════════
          TOP INSTITUTIONAL ANNOUNCEMENT BANNER
          ═══════════════════════════════════════════════════════════ */}
      <div className="w-full bg-slate-900 text-slate-300 py-1.5 px-4 text-[10px] sm:text-[11px] font-semibold border-b border-slate-800 tracking-wide">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="font-bold text-white">VNR VJIET</span>
            <span className="text-slate-400">• Autonomous Institution • Affiliated to JNTUH • NAAC 'A++' Grade</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Transport Helpline: support.vnrpool@gmail.com</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">100% Student Verified</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CLEAN HEADER
          ═══════════════════════════════════════════════════════════ */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#070b13]/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-xs p-1">
              <Image src="/vnr-logo.png" alt="VNR VJIET" width={34} height={34} className="object-contain" priority />
            </div>
            <span className={`text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white ${righteous.className}`}>
              VNR <span className="text-blue-600 dark:text-blue-500">Pool</span>
            </span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setIsHowItWorksOpen(true)}
              className="hidden sm:inline-flex text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <ThemeToggle />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openAuth("login")}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-700 text-white hover:bg-blue-600 active:scale-[0.99] transition-all cursor-pointer shadow-xs"
            >
              Student & Faculty Login
            </motion.button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION: High-Authority Institutional Presentation
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative pt-10 pb-12 sm:pt-16 sm:pb-18 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Official Positioning */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-7 space-y-5 text-center lg:text-left"
          >
            {/* Official Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>VNR VJIET • Campus Mobility</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Verified Peer Commuting for VNR VJIET.
            </h1>

            {/* Subhead */}
            <p className="text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Smart carpool and auto split network for students and faculty. Verified peers, fair fuel splits, and female-only rides along Hyderabad's key corridors.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openAuth("signup")}
                className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm text-white bg-blue-700 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs group"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>

              <button
                onClick={() => setIsHowItWorksOpen(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>How It Works</span>
              </button>
            </div>

            {/* Institutional Compliance Metrics */}
            <div className="pt-4 grid grid-cols-3 gap-3 max-w-lg mx-auto lg:mx-0 border-t border-slate-200 dark:border-slate-800/80 text-center lg:text-left">
              <div>
                <span className="block text-base sm:text-lg font-black text-slate-900 dark:text-white">100% Verified</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">@vnrvjiet.in Only</span>
              </div>
              <div>
                <span className="block text-base sm:text-lg font-black text-slate-900 dark:text-white">5 Corridors</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Hyderabad-Wide</span>
              </div>
              <div>
                <span className="block text-base sm:text-lg font-black text-slate-900 dark:text-white">Fair Fuel Split</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Non-Profit</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Instrumented Telemetry Route Simulator */}
          <motion.div 
            id="corridors"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:col-span-5 flex justify-center items-center w-full"
          >
            <InteractiveRoute 
              onSelectRide={(ride) => openAuth("signup", `Booking: ${ride.originLabel} (₹${ride.price})`)} 
            />
          </motion.div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            OFFICIAL CORRIDOR DISPATCH FINDER
            ═══════════════════════════════════════════════════════════ */}
        <div className="mt-10 sm:mt-14 max-w-4xl mx-auto">
          <form
            onSubmit={handleSearchSubmit}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl flex flex-col md:flex-row items-stretch md:items-center gap-3 transition-colors"
          >
            {/* Origin Hub */}
            <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 focus-within:border-blue-500 transition-colors">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">Pickup Location</span>
                <select
                  value={searchOrigin}
                  onChange={(e) => setSearchOrigin(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer truncate"
                >
                  <option value="Kukatpally (JNTU Metro Gate 2)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Kukatpally (JNTU Metro Gate 2)</option>
                  <option value="Miyapur Metro Station (Pillar 594)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Miyapur Metro Station (Pillar 594)</option>
                  <option value="Secunderabad (Paradise Hub)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Secunderabad (Paradise Hub)</option>
                  <option value="Pragathi Nagar (Lake Arch)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Pragathi Nagar (Lake Arch)</option>
                  <option value="KPHB Colony (Phase 1)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">KPHB Colony (Phase 1)</option>
                  <option value="Bachupally X Roads Hub" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Bachupally X Roads Hub</option>
                  <option value="Gandi Maisamma ORR Hub" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Gandi Maisamma ORR Hub</option>
                </select>
              </div>
            </div>

            {/* Separator */}
            <div className="hidden md:flex items-center justify-center text-slate-400 dark:text-slate-600">
              <ArrowRight className="w-4 h-4" />
            </div>

            {/* Campus Gateway Destination */}
            <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 focus-within:border-blue-500 transition-colors">
              <School className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">Campus Drop</span>
                <select
                  value={searchDest}
                  onChange={(e) => setSearchDest(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer truncate"
                >
                  <option value="VNR Campus Gate 1" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">VNR Campus Gate 1 (Main Entrance)</option>
                  <option value="VNR Campus Gate 2" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">VNR Campus Gate 2 (Hostel Road)</option>
                  <option value="VNR Hostel Corridor" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">VNR Hostel Corridor (Bachupally)</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-blue-700 hover:bg-blue-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs"
            >
              <Search className="w-4 h-4" />
              <span>Find Rides</span>
            </motion.button>
          </form>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          OFFICIAL SCHEDULE & DISPATCH BOARD
          ═══════════════════════════════════════════════════════════ */}
      <section id="schedule" className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-0.5">
              Live Rides
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Today's Campus Departures
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active rides along popular Hyderabad corridors
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Dispatch Active</span>
          </div>
        </div>

        {/* Corridor Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {CORRIDOR_FILTERS.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === chip
                  ? "bg-blue-700 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-800"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Filterable Animated Schedule Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredRides.map((ride) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={ride.id}
                onClick={() => openAuth("signup", `Booking: ${ride.from.split('(')[0].trim()} (₹${ride.price})`)}
                className="p-5 rounded-2xl bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-slate-700 shadow-sm transition-all cursor-pointer group relative overflow-hidden"
              >
                {/* Top Row: Driver, Roll Dept & Fare */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-full ${ride.avatarBg} text-white font-black flex items-center justify-center text-xs shadow-xs`}>
                      {ride.driverInitial}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">{ride.driverName}</span>
                        {ride.isWomenOnly && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 font-bold">
                            Women-Only
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {ride.dept} • ★ {ride.rating.toFixed(1)} verified
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                      ₹{ride.price}
                    </div>
                    <span className="text-[10px] text-slate-500 block -mt-0.5 font-medium">
                      per seat
                    </span>
                  </div>
                </div>

                {/* Corridor Route Visual */}
                <div className="space-y-2 relative pl-5 mb-4">
                  <div className="absolute left-2 top-2 bottom-2 w-[1.5px] bg-slate-200 dark:bg-slate-800" />

                  {/* Origin */}
                  <div className="relative">
                    <div className="absolute -left-5 top-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 ring-2 ring-white dark:ring-[#0e1320]" />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium block truncate">
                      {ride.from}
                    </span>
                  </div>

                  {/* Destination */}
                  <div className="relative">
                    <div className="absolute -left-5 top-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-[#0e1320]" />
                    <span className="text-xs text-slate-900 dark:text-white font-bold block truncate">
                      {ride.to}
                    </span>
                  </div>
                </div>

                {/* Bottom Details: Time & Seats Left */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{ride.time}</span>
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span className="font-medium">{ride.vehicleModel}</span>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-slate-900 text-blue-700 dark:text-slate-300 font-bold text-[11px] border border-blue-200 dark:border-slate-800">
                    {ride.seatsLeft} seat{ride.seatsLeft > 1 ? 's' : ''} left
                  </span>
                </div>

                {/* Book Seat Prompt */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors">
                  <span>Reserve Seat</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CAMPUS SAFETY & TRUST (BENTO)
          ═══════════════════════════════════════════════════════════ */}
      <section id="safety" className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center mb-8">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-0.5">
            Safety & Trust
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Why Choose VNR Pool?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto">
            Safe, verified, and community-driven commuting for VNR VJIET.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">100% College Verified</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Exclusive @vnrvjiet.in access. Outsiders and strangers are strictly barred.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Women-Only Rides</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Dedicated option for female students to travel exclusively with verified female peers.
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="mt-4 p-5 rounded-2xl bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-slate-900 border border-amber-100 dark:border-slate-800 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Leaf className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Fair Fuel Split & Green Campus</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Automated distance-based split. Zero awkward negotiations while reducing campus traffic.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => openAuth("signup")}
            className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-700 hover:bg-blue-600 active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
          >
            <span>Join VNR Pool</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FAQ
          ═══════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center mb-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-0.5">
            FAQ
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quick answers about campus carpooling
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx
            return (
              <div
                key={faq.question}
                className="rounded-xl bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full py-3.5 px-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 text-blue-700 dark:text-blue-400" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          OFFICIAL INSTITUTION FOOTER
          ═══════════════════════════════════════════════════════════ */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#060910] text-xs text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800/80 pb-6 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1">
                <Image src="/vnr-logo.png" alt="VNR VJIET" width={32} height={32} className="object-contain" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  Vallurupalli Nageswara Rao Vignana Jyothi Institute of Engineering & Technology
                </p>
                <p className="text-[11px] text-slate-500">
                  An Autonomous Institution • Affiliated to JNTUH • Approved by AICTE • NAAC 'A++' Grade
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 text-xs">
              <span className="font-medium">Campus Transport Support:</span>
              <a
                href="mailto:support.vnrpool@gmail.com"
                className="font-bold text-blue-700 dark:text-blue-400 hover:underline"
              >
                support.vnrpool@gmail.com
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© 2026 VNR Pool. For VNR VJIET Students, Faculty & Staff Members.</p>
            <p>Vignana Jyothi Nagar, Pragathi Nagar, Nizampet (S.O), Hyderabad, Telangana 500090</p>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════ */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onGetStarted={() => openAuth("signup")}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        contextMessage={authContext}
      />
    </div>
  )
}
