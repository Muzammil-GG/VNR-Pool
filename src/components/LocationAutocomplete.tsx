"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Search } from "lucide-react"
import { VALID_LOCATIONS, Location } from "@/lib/locations"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  onSelect?: (loc: Location) => void;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Search location...", 
  className,
  icon = <MapPin className="w-5 h-5 text-emerald-500" />,
  onSelect
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update internal search state if external value changes (e.g. cleared)
  useEffect(() => {
    setSearch(value)
  }, [value])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // If they didn't select anything, revert to the last valid value or clear if they typed garbage
        // Actually, we'll let Dashboard handle validation, just close the UI
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredLocations = VALID_LOCATIONS.filter(loc => 
    loc.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (loc: Location) => {
    setSearch(loc.name)
    onChange(loc.name)
    setIsOpen(false)
    if (onSelect) onSelect(loc)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    onChange(e.target.value) // Propagate typed text for "smart fallback" in search filters
    setIsOpen(true)
  }

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
        <Input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          className="pl-10 h-12 bg-background border-border focus-visible:ring-emerald-500 w-full"
        />
      </div>

      <AnimatePresence>
        {isOpen && search.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto"
          >
            {filteredLocations.length > 0 ? (
              <ul className="py-2">
                {filteredLocations.map(loc => (
                  <li 
                    key={loc.id}
                    onClick={() => handleSelect(loc)}
                    className="px-4 py-2 hover:bg-secondary cursor-pointer flex items-center gap-2 text-foreground transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{loc.name}</p>
                      <p className="text-xs text-muted-foreground">{loc.distanceToVnr?.toFixed(1)} km from VNR VJIET</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm flex flex-col items-center">
                <Search className="w-5 h-5 mb-2 opacity-50" />
                <p>No locations found.</p>
                <p className="text-xs opacity-75 mt-1">Try a nearby major area.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
