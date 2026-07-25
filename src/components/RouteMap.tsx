"use client"

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet's default icon path issues in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

const customIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface RouteMapProps {
  waypoints: string[];
  className?: string;
}

export default function RouteMap({ waypoints, className = "h-48 w-full rounded-xl" }: RouteMapProps) {
  // Since we don't have exact lat/lngs for every waypoint yet, we can mock 
  // the coordinates for the map display, or use a generic representation.
  // For a robust implementation, we would geocode these or use predefined coordinates.
  // We'll use a placeholder map centered on Hyderabad for now, with markers for Start/End.
  
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className={`bg-secondary animate-pulse ${className}`} />

  // Hyderabad center
  const center: [number, number] = [17.3850, 78.4867]

  return (
    <div className={`overflow-hidden border border-border/50 z-0 ${className}`}>
      <MapContainer 
        center={center} 
        zoom={11} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* We would render markers/polylines here based on geocoded waypoints */}
        <div className="absolute top-2 right-2 bg-background/90 px-3 py-1.5 rounded-lg border border-border shadow-sm z-[1000] text-xs font-bold pointer-events-none">
          Route Map
        </div>
      </MapContainer>
    </div>
  )
}
