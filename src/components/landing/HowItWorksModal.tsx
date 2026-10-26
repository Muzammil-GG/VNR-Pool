"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, ShieldCheck, Zap, X, ArrowRight } from "lucide-react"

interface HowItWorksModalProps {
  isOpen: boolean
  onClose: () => void
  onGetStarted: () => void
}

export function HowItWorksModal({ isOpen, onClose, onGetStarted }: HowItWorksModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Window: Responsive Light & Dark Mode */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0e1320] text-slate-900 dark:text-slate-100 p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 transition-colors"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              How It Works
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Steps List */}
          <div className="py-4 space-y-4">
            {/* Step 1: Find Route */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">1. Find Your Corridor</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Search pickup hubs across Hyderabad to find students heading to VNR campus.
                </p>
              </div>
            </div>

            {/* Step 2: Book Seat */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">2. Verified Rides Only</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  100% @vnrvjiet.in verified peers with dedicated Women-Only travel options.
                </p>
              </div>
            </div>

            {/* Step 3: Fair Split */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">3. Fair Fuel Split</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fixed distance meter share. Zero haggling, pure convenience.
                </p>
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                onClose()
                onGetStarted()
              }}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-700 hover:bg-blue-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
