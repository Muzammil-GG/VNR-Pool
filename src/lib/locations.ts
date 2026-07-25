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
  { name: "Dullapally X Roads", lat: 17.5623, lng: 78.4357 },
  { name: "Suchitra Circle", lat: 17.5147, lng: 78.4727 },
  { name: "Kompally X Roads", lat: 17.5369, lng: 78.4849 },
  { name: "Suraram X Roads", lat: 17.5422, lng: 78.4239 },
  { name: "Jeedimetla (Subash Nagar)", lat: 17.5113, lng: 78.4419 },
  { name: "Shapurnagar X Roads", lat: 17.5222, lng: 78.4334 },
  { name: "Chintal", lat: 17.5028, lng: 78.4421 },
  { name: "IDPL X Roads", lat: 17.4789, lng: 78.4447 },
  { name: "Balanagar X Roads", lat: 17.4665, lng: 78.4485 },
  { name: "Bowenpally X Roads", lat: 17.4725, lng: 78.4839 },
  { name: "Alwal (Lothkunta)", lat: 17.5037, lng: 78.5087 },
  { name: "Secunderabad (Paradise Circle)", lat: 17.4426, lng: 78.4862 },
  { name: "Begumpet (Shoppers Stop)", lat: 17.4431, lng: 78.4604 },
  { name: "Sanath Nagar", lat: 17.4578, lng: 78.4445 },
  { name: "Erragadda (Gokul Theatre)", lat: 17.4526, lng: 78.4344 },
  { name: "Moosapet Metro Station", lat: 17.4636, lng: 78.4277 },
  { name: "Khairatabad RTA", lat: 17.4116, lng: 78.4589 },
  { name: "Lakdikapul X Roads", lat: 17.4042, lng: 78.4630 },
  { name: "Abids GPO", lat: 17.3888, lng: 78.4760 },
  { name: "Koti (Women's College)", lat: 17.3850, lng: 78.4867 },
  { name: "RTC X Roads", lat: 17.4082, lng: 78.4988 },
  { name: "Narayanguda X Roads", lat: 17.3970, lng: 78.4863 },
  { name: "Himayatnagar", lat: 17.4038, lng: 78.4795 },
  { name: "Malakpet TV Tower", lat: 17.3734, lng: 78.5082 },
  { name: "Attapur (Pillar No 143)", lat: 17.3670, lng: 78.4285 },
  { name: "Mehdipatnam (Reti Bowli)", lat: 17.3889, lng: 78.4267 },
  { name: "Shaikpet (D-Mart)", lat: 17.4038, lng: 78.3970 },
  { name: "Manikonda (Marichettu)", lat: 17.4054, lng: 78.3861 },
  { name: "Narsingi ORR", lat: 17.3824, lng: 78.3516 },
  { name: "Lingampally Railway Station", lat: 17.4833, lng: 78.3182 },
  { name: "Chandanagar Circle", lat: 17.4939, lng: 78.3303 },
  { name: "Miyapur Allwyn X Roads", lat: 17.5028, lng: 78.3503 },
  { name: "Pista House, Kukatpally", lat: 17.4820, lng: 78.4065 },
  { name: "Pista House, Gachibowli", lat: 17.4401, lng: 78.3619 },
  { name: "Pista House, Tolichowki", lat: 17.4013, lng: 78.4111 },
  { name: "Paradise Biryani, Secunderabad", lat: 17.4429, lng: 78.4871 },
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
// Finds the nearest location to the given text based on simple string matching,
// OR extracts exact coordinates if the name is a serialized custom location.
export function findBestMatchLocation(query: string): Location | null {
  if (!query) return null;
  
  // 1. Check for exact precision coordinates in the string
  // Format: "Current Location (17.1234, 78.1234)" or "Custom Location (..."
  const coordMatch = query.match(/\(([^,]+),\s*([^)]+)\)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        id: `precise-${lat}-${lng}`,
        name: query,
        lat,
        lng,
        distanceToVnr: calculateDistance(VNR_COORDS.lat, VNR_COORDS.lng, lat, lng)
      };
    }
  }

  const q = query.toLowerCase().trim();
  
  // Try exact match first
  const exactMatch = VALID_LOCATIONS.find(loc => loc.name.toLowerCase() === q);
  if (exactMatch) return exactMatch;

  // Try substring match
  const subMatch = VALID_LOCATIONS.find(loc => loc.name.toLowerCase().includes(q) || q.includes(loc.name.toLowerCase()));
  if (subMatch) return subMatch;

  // Fallback to nearest by distance if no string match (very loose fallback)
  // Or just return null
  return null;
}
