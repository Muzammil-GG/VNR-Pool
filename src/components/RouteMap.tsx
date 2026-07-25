"use client"

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { findBestMatchLocation, VNR_COORDS } from '@/lib/locations'

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

// Helper component to auto-fit the map to bounds
function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  
  useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords)
      map.fitBounds(bounds, { padding: [30, 30] })
    }
  }, [coords, map])
  
  return null
}

interface RouteMapProps {
  waypoints: string[];
  className?: string;
}

export default function RouteMap({ waypoints, className = "h-48 w-full rounded-xl" }: RouteMapProps) {
  const [mounted, setMounted] = useState(false)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const [validWaypoints, setValidWaypoints] = useState<{name: string, lat: number, lng: number}[]>([])
  
  useEffect(() => {
    setMounted(true)
    
    // Map waypoints to coordinates
    const mapped = waypoints.map(wp => {
      // Hardcode fallback for VNR to ensure exact routing
      if (wp.toLowerCase().includes('vnr') && wp.toLowerCase().includes('vjiet')) {
        return { name: "VNR VJIET", lat: VNR_COORDS.lat, lng: VNR_COORDS.lng }
      }
      const match = findBestMatchLocation(wp)
      if (match) return { name: wp, lat: match.lat, lng: match.lng }
      return null
    }).filter(Boolean) as {name: string, lat: number, lng: number}[]
    
    setValidWaypoints(mapped)

    // Fetch exact road path from OSRM
    if (mapped.length > 1) {
      const coordsString = mapped.map(m => `${m.lng},${m.lat}`).join(';')
      fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes.length > 0) {
            const geojsonCoords = data.routes[0].geometry.coordinates // [lng, lat][]
            const latLngCoords = geojsonCoords.map((c: number[]) => [c[1], c[0]])
            setRouteCoords(latLngCoords)
          } else {
            setRouteCoords(mapped.map(m => [m.lat, m.lng])) // fallback to straight lines
          }
        })
        .catch(err => {
          console.error("OSRM Routing Error:", err)
          setRouteCoords(mapped.map(m => [m.lat, m.lng])) // fallback to straight lines
        })
    } else {
      setRouteCoords(mapped.map(m => [m.lat, m.lng]))
    }
  }, [waypoints])

  if (!mounted) return <div className={`bg-secondary animate-pulse ${className}`} />

  // Hyderabad center as fallback
  const center: [number, number] = routeCoords.length > 0 ? routeCoords[0] : [17.3850, 78.4867]

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
        
        {routeCoords.length > 0 && (
          <>
            <Polyline positions={routeCoords} color="#3b82f6" weight={5} opacity={0.8} />
            <FitBounds coords={routeCoords} />
          </>
        )}
        
        {validWaypoints.map((wp, i) => (
          <Marker key={`${wp.name}-${i}`} position={[wp.lat, wp.lng]} icon={customIcon}>
            <Popup className="font-semibold">{wp.name} {i === 0 ? '(Start)' : i === validWaypoints.length - 1 ? '(End)' : ''}</Popup>
          </Marker>
        ))}

        <div className="absolute top-2 right-2 bg-background/90 px-3 py-1.5 rounded-lg border border-border shadow-sm z-[1000] text-xs font-bold pointer-events-none">
          Route Map
        </div>
      </MapContainer>
    </div>
  )
}
