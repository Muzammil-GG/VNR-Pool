"use client"

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { findBestMatchLocation, VNR_COORDS } from '@/lib/locations'

// Custom glowing dot icon
const glowingDotHtml = `
  <div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-emerald-400"></div>
    <div class="relative inline-flex w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
  </div>
`

const glowingIcon = new L.DivIcon({
  html: glowingDotHtml,
  className: 'bg-transparent border-none',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// Automatically resizes the map when its container stretches in the CSS Grid
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

export default function LiveDashboardMap({ 
  rides, 
  selectedRide, 
  onRideSelect,
  searchOrigin = '',
  searchDestination = ''
}: { 
  rides: any[], 
  selectedRide: any, 
  onRideSelect: (ride: any) => void,
  searchOrigin?: string,
  searchDestination?: string
}) {
  const [mounted, setMounted] = useState(false)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (selectedRide) {
      const matchStart = selectedRide.origin.toLowerCase().includes('vnr') ? VNR_COORDS : findBestMatchLocation(selectedRide.origin)
      const matchEnd = selectedRide.destination.toLowerCase().includes('vnr') ? VNR_COORDS : findBestMatchLocation(selectedRide.destination)

      if (matchStart && matchEnd) {
        fetch(`https://router.project-osrm.org/route/v1/driving/${matchStart.lng},${matchStart.lat};${matchEnd.lng},${matchEnd.lat}?overview=full&geometries=geojson`)
          .then(res => res.json())
          .then(data => {
            if (data.routes && data.routes.length > 0) {
              const geojsonCoords = data.routes[0].geometry.coordinates
              setRouteCoords(geojsonCoords.map((c: number[]) => [c[1], c[0]]))
            }
          })
      }
    } else {
      setRouteCoords([])
    }
  }, [selectedRide])

  if (!mounted) return <div className="w-full h-full bg-slate-900 animate-pulse rounded-xl" />

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-800/50 shadow-2xl">
      <MapContainer 
        center={[17.5385, 78.3847]} 
        zoom={12} 
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        zoomControl={false}
        scrollWheelZoom={false}
      >
        {/* CartoDB Dark Matter TileLayer for stunning neon look */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapResizer />

        <ZoomControl position="bottomright" />

        {/* Plot available rides as glowing nodes based on search context */}
        {rides.map(ride => {
          // If the user searched for an origin, plot the point there (since it's en-route). Otherwise use ride origin.
          const plotName = searchOrigin ? searchOrigin : ride.origin
          const loc = plotName.toLowerCase().includes('vnr') ? VNR_COORDS : findBestMatchLocation(plotName)
          if (!loc) return null
          
          return (
            <Marker 
              key={ride.id} 
              position={[loc.lat, loc.lng]} 
              icon={glowingIcon}
              eventHandlers={{
                click: () => {
                  if (selectedRide?.id === ride.id) {
                    onRideSelect(null)
                  } else {
                    onRideSelect(ride)
                  }
                }
              }}
            >
              <Popup className="dark-popup">
                <div className="font-semibold text-slate-800">{ride.origin} → {ride.destination}</div>
                <div className="text-sm text-slate-500">Driver: {ride.driver?.full_name}</div>
                {searchOrigin && <div className="text-xs text-emerald-400 mt-1 font-medium">Passes through {searchOrigin}</div>}
              </Popup>
            </Marker>
          )
        })}

        {/* Animate the route if a ride is selected */}
        {routeCoords.length > 0 && (
          <Polyline 
            positions={routeCoords} 
            color="#10b981" 
            weight={4} 
            opacity={0.8}
            className="animate-route-flow"
          />
        )}
      </MapContainer>
      
      {/* Custom CSS for route animation */}
      <style dangerouslySetInnerHTML={{__html: `
        .animate-route-flow {
          stroke-dasharray: 20;
          animation: dashflow 1s linear infinite;
        }
        @keyframes dashflow {
          to { stroke-dashoffset: -40; }
        }
        .dark-popup .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.9);
          color: white;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .dark-popup .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.9);
        }
        .dark-popup .text-slate-800 { color: #f8fafc !important; }
        .dark-popup .text-slate-500 { color: #94a3b8 !important; }
      `}} />
    </div>
  )
}
