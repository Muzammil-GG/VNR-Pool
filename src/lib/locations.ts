export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceToVnr?: number;
}

export const VNR_COORDS = { lat: 17.5389, lng: 78.3868 };

// Haversine distance formula in kilometers
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Detailed list of Hyderabad landmarks and major locations
const rawLocations: Omit<Location, 'id' | 'distanceToVnr'>[] = [
  { name: "VNR VJIET", lat: 17.5389, lng: 78.3868 },
  { name: "Miyapur Metro Station", lat: 17.4968, lng: 78.3614 },
  { name: "Miyapur X Roads", lat: 17.4950, lng: 78.3612 },
  { name: "JNTU Metro Station", lat: 17.4933, lng: 78.3914 },
  { name: "KPHB Metro Station", lat: 17.4875, lng: 78.3988 },
  { name: "Nexus Mall Kukatpally", lat: 17.4849, lng: 78.4069 },
  { name: "Kukatpally Y Junction", lat: 17.4762, lng: 78.4194 },
  { name: "Cyber Towers, HITEC City", lat: 17.4504, lng: 78.3808 },
  { name: "Mindspace IT Park", lat: 17.4423, lng: 78.3813 },
  { name: "Inorbit Mall, Madhapur", lat: 17.4337, lng: 78.3871 },
  { name: "IKEA, HITEC City", lat: 17.4398, lng: 78.3768 },
  { name: "DLF Cyber City, Gachibowli", lat: 17.4474, lng: 78.3496 },
  { name: "AIG Hospitals, Gachibowli", lat: 17.4435, lng: 78.3644 },
  { name: "Sarath City Capital Mall", lat: 17.4576, lng: 78.3641 },
  { name: "AMB Cinemas, Kondapur", lat: 17.4578, lng: 78.3643 },
  { name: "Banjara Hills Road No. 1", lat: 17.4156, lng: 78.4357 },
  { name: "Banjara Hills Road No. 12", lat: 17.4085, lng: 78.4382 },
  { name: "Jubilee Hills Check Post", lat: 17.4326, lng: 78.4070 },
  { name: "Secunderabad Railway Station", lat: 17.4330, lng: 78.5016 },
  { name: "Kacheguda Railway Station", lat: 17.3887, lng: 78.4975 },
  { name: "Nampally Railway Station", lat: 17.3919, lng: 78.4688 },
  { name: "Rajiv Gandhi International Airport", lat: 17.2403, lng: 78.4294 },
  { name: "Charminar", lat: 17.3616, lng: 78.4747 },
  { name: "Golkonda Fort", lat: 17.3833, lng: 78.4011 },
  { name: "Pragati Nagar Kaman", lat: 17.5147, lng: 78.3976 },
  { name: "Nizampet X Roads", lat: 17.5186, lng: 78.3815 },
  { name: "Bolarum Railway Station", lat: 17.5185, lng: 78.5133 },
  { name: "Kompally D-Mart", lat: 17.5451, lng: 78.4843 },
  { name: "Bachupally X Roads", lat: 17.5487, lng: 78.3879 },
  { name: "Ameerpet Metro Station", lat: 17.4363, lng: 78.4447 },
  { name: "SR Nagar Police Station", lat: 17.4419, lng: 78.4443 },
  { name: "Punjagutta X Roads", lat: 17.4262, lng: 78.4520 },
  { name: "LB Nagar Metro Station", lat: 17.3457, lng: 78.5522 },
  { name: "Dilsukhnagar Metro Station", lat: 17.3688, lng: 78.5247 },
  { name: "Tarnaka Metro Station", lat: 17.4293, lng: 78.5290 },
  { name: "Uppal Ring Road", lat: 17.3984, lng: 78.5583 },
  { name: "Mehdipatnam Rythu Bazar", lat: 17.3921, lng: 78.4323 },
  { name: "Tolichowki X Roads", lat: 17.3992, lng: 78.4116 },
  { name: "BHEL Circle", lat: 17.5024, lng: 78.3073 },
  { name: "Patancheru Bus Stand", lat: 17.5284, lng: 78.2662 },
];

export const VALID_LOCATIONS: Location[] = rawLocations
  .map(loc => {
    const distance = calculateDistance(VNR_COORDS.lat, VNR_COORDS.lng, loc.lat, loc.lng);
    return {
      ...loc,
      id: loc.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      distanceToVnr: distance
    };
  })
  .filter((loc, index, self) => 
    index === self.findIndex((t) => t.id === loc.id)
  )
  .filter(loc => loc.distanceToVnr <= 50) // Strictly 50km radius
  .sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical order for dropdown

// Helper for smart search fallback
// Finds the nearest location to the given text based on simple string matching
export function findBestMatchLocation(query: string): Location | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  
  // Try exact match first
  const exactMatch = VALID_LOCATIONS.find(loc => loc.name.toLowerCase() === q);
  if (exactMatch) return exactMatch;

  // Try substring match
  const subMatch = VALID_LOCATIONS.find(loc => loc.name.toLowerCase().includes(q) || q.includes(loc.name.toLowerCase()));
  if (subMatch) return subMatch;

  // If no match, return null
  return null;
}
