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
  // ── NEW: Dozens of detailed locations & stops ──
  { name: "KPHB Phase 1", lat: 17.4891, lng: 78.3971 },
  { name: "KPHB Phase 3", lat: 17.4931, lng: 78.3921 },
  { name: "KPHB Phase 6", lat: 17.4811, lng: 78.3901 },
  { name: "Nizampet Village", lat: 17.5256, lng: 78.3751 },
  { name: "Pragati Nagar Lake", lat: 17.5097, lng: 78.3886 },
  { name: "Hydernagar", lat: 17.4988, lng: 78.3791 },
  { name: "Hafeezpet X Roads", lat: 17.4839, lng: 78.3582 },
  { name: "Kondapur X Roads", lat: 17.4628, lng: 78.3562 },
  { name: "Botanical Garden, Kondapur", lat: 17.4566, lng: 78.3614 },
  { name: "Raidurg Metro Station", lat: 17.4390, lng: 78.3795 },
  { name: "Durgam Cheruvu Metro Station", lat: 17.4367, lng: 78.3942 },
  { name: "Madhapur Metro Station", lat: 17.4355, lng: 78.3995 },
  { name: "Peddamma Temple", lat: 17.4300, lng: 78.4060 },
  { name: "Gachibowli Stadium", lat: 17.4452, lng: 78.3456 },
  { name: "IIIT Hyderabad", lat: 17.4455, lng: 78.3483 },
  { name: "HCU (University of Hyderabad)", lat: 17.4600, lng: 78.3276 },
  { name: "Lingampally X Roads", lat: 17.4829, lng: 78.3155 },
  { name: "BHEL Circle", lat: 17.5024, lng: 78.3073 },
  { name: "Muthangi ORR", lat: 17.5305, lng: 78.2323 },
  { name: "Kandlakoya (ORR Exit 6)", lat: 17.5896, lng: 78.4721 },
  { name: "Medchal Bus Depot", lat: 17.6253, lng: 78.4820 },
  { name: "Gundlapochampally", lat: 17.5684, lng: 78.4682 },
  { name: "Petbasheerabad", lat: 17.5255, lng: 78.4754 },
  { name: "Dairy Farm Road", lat: 17.4785, lng: 78.4812 },
  { name: "Bowenpally Check Post", lat: 17.4725, lng: 78.4839 },
  { name: "Tadbund X Roads", lat: 17.4619, lng: 78.4825 },
  { name: "Bolarum X Roads", lat: 17.5140, lng: 78.5080 },
  { name: "Hakimpet", lat: 17.5452, lng: 78.5283 },
  { name: "Shamirpet (Leonia)", lat: 17.6163, lng: 78.5700 },
  { name: "ECIL X Roads", lat: 17.4735, lng: 78.5687 },
  { name: "AS Rao Nagar", lat: 17.4795, lng: 78.5587 },
  { name: "Radhika X Roads", lat: 17.4827, lng: 78.5539 },
  { name: "Malkajgiri", lat: 17.4526, lng: 78.5342 },
  { name: "Safilguda", lat: 17.4627, lng: 78.5360 },
  { name: "Neredmet X Roads", lat: 17.4803, lng: 78.5312 },
  { name: "RK Puram", lat: 17.4759, lng: 78.5256 },
  { name: "Trimulgherry X Roads", lat: 17.4879, lng: 78.5037 },
  { name: "Temple Alwal", lat: 17.5134, lng: 78.5134 },
  { name: "Secunderabad East Metro", lat: 17.4332, lng: 78.5042 },
  { name: "Secunderabad West Metro", lat: 17.4335, lng: 78.4975 },
  { name: "Rasoolpura Metro Station", lat: 17.4410, lng: 78.4739 },
  { name: "Prakash Nagar Metro Station", lat: 17.4385, lng: 78.4659 },
  { name: "Ameerpet X Roads", lat: 17.4363, lng: 78.4447 },
  { name: "SR Nagar Metro Station", lat: 17.4419, lng: 78.4443 },
  { name: "ESI Hospital Metro", lat: 17.4452, lng: 78.4377 },
  { name: "Bharat Nagar Metro", lat: 17.4586, lng: 78.4312 },
  { name: "Erragadda Metro Station", lat: 17.4526, lng: 78.4344 },
  { name: "Sanath Nagar Bus Stop", lat: 17.4578, lng: 78.4445 },
  { name: "Panjagutta Metro Station", lat: 17.4262, lng: 78.4520 },
  { name: "Irrum Manzil Metro", lat: 17.4172, lng: 78.4552 },
  { name: "Khairatabad Metro Station", lat: 17.4116, lng: 78.4589 },
  { name: "Nampally Metro Station", lat: 17.3919, lng: 78.4688 },
  { name: "Gandhi Bhavan Metro", lat: 17.3855, lng: 78.4725 },
  { name: "Osmania Medical College", lat: 17.3820, lng: 78.4800 },
  { name: "MGBS (Mahatma Gandhi Bus Station)", lat: 17.3785, lng: 78.4815 },
  { name: "Dilsukhnagar Bus Station", lat: 17.3688, lng: 78.5247 },
  { name: "LB Nagar X Roads", lat: 17.3457, lng: 78.5522 },
  { name: "Uppal X Roads", lat: 17.3984, lng: 78.5583 },
  { name: "Tarnaka X Roads", lat: 17.4293, lng: 78.5290 },
  { name: "VST X Roads", lat: 17.4082, lng: 78.4988 },
  { name: "Nallakunta", lat: 17.3980, lng: 78.5030 },
  { name: "Vidyanagar", lat: 17.3930, lng: 78.5080 },
  { name: "Habsiguda X Roads", lat: 17.4124, lng: 78.5451 },
  { name: "Ramanthapur", lat: 17.3879, lng: 78.5284 },
  { name: "Amberpet X Roads", lat: 17.3879, lng: 78.5134 },
  { name: "Kothapet (Fruit Market)", lat: 17.3688, lng: 78.5360 },
  { name: "Chaitanyapuri", lat: 17.3650, lng: 78.5330 },
  { name: "Saidabad", lat: 17.3644, lng: 78.4984 },
  { name: "Santosh Nagar", lat: 17.3455, lng: 78.4990 },
  { name: "Chandrayangutta X Roads", lat: 17.3189, lng: 78.4747 },
  { name: "Aramghar X Roads", lat: 17.3150, lng: 78.4350 },
  { name: "Attapur Ring Road", lat: 17.3560, lng: 78.4230 },
  { name: "Mehdipatnam Bus Stop", lat: 17.3921, lng: 78.4323 },
  { name: "Tolichowki Flyover", lat: 17.3992, lng: 78.4116 },
  // ── NEW: South-West / Attapur / Kismatpur Region ──
  { name: "Vaishnavi Triumph Villas", lat: 17.3370, lng: 78.3950 },
  { name: "Kismatpur X Roads", lat: 17.3385, lng: 78.3970 },
  { name: "Bandlaguda Jagir", lat: 17.3450, lng: 78.3930 },
  { name: "Sun City (Bandlaguda)", lat: 17.3520, lng: 78.3970 },
  { name: "Rajendra Nagar", lat: 17.3400, lng: 78.3680 },
  { name: "APPA Junction (Peerancheru)", lat: 17.3554, lng: 78.3601 },
  { name: "Kalimandir", lat: 17.3582, lng: 78.3756 },
  { name: "Langar Houz", lat: 17.3820, lng: 78.4110 },
  { name: "Hyderguda (Attapur)", lat: 17.3685, lng: 78.4355 },
  { name: "Upperpally", lat: 17.3458, lng: 78.4180 },
  { name: "Shivrampally", lat: 17.3235, lng: 78.4320 },
  { name: "Rambagh (Attapur)", lat: 17.3695, lng: 78.4310 },
  { name: "Attapur Pillar 80", lat: 17.3750, lng: 78.4370 },
  // ── NEW: Sangareddy & Medchal Regions ──
  { name: "Sangareddy X Roads", lat: 17.6190, lng: 78.0930 },
  { name: "Kandi (IIT Hyderabad)", lat: 17.5950, lng: 78.1170 },
  { name: "Rudraram (GITAM)", lat: 17.5750, lng: 78.1560 },
  { name: "Isnapur X Roads", lat: 17.5450, lng: 78.1960 },
  { name: "Sadashivpet", lat: 17.6160, lng: 77.9470 },
  { name: "RC Puram (Ramachandrapuram)", lat: 17.5140, lng: 78.2930 },
  { name: "Medchal Check Post", lat: 17.6270, lng: 78.4860 },
  { name: "CMR College (Kandlakoya)", lat: 17.6040, lng: 78.4850 },
  { name: "Malla Reddy College (Maisammaguda)", lat: 17.5560, lng: 78.4440 },
  { name: "Bolarum Check Post", lat: 17.5250, lng: 78.5080 },
  { name: "Kompally CinePlanet", lat: 17.5400, lng: 78.4830 },
  // ── NEW: Massive Hyderabad Expansion (All Zones) ──
  { name: "Falaknuma Palace", lat: 17.3275, lng: 78.4678 },
  { name: "Zoo Park (Bahadurpura)", lat: 17.3503, lng: 78.4526 },
  { name: "Afzalgunj", lat: 17.3776, lng: 78.4800 },
  { name: "Puranapul", lat: 17.3698, lng: 78.4619 },
  { name: "Vanasthalipuram", lat: 17.3315, lng: 78.5668 },
  { name: "Hayathnagar", lat: 17.3217, lng: 78.6015 },
  { name: "Ramoji Film City", lat: 17.2533, lng: 78.6811 },
  { name: "Mansoorabad", lat: 17.3396, lng: 78.5619 },
  { name: "Saroornagar Lake", lat: 17.3567, lng: 78.5323 },
  { name: "Somajiguda Circle", lat: 17.4261, lng: 78.4593 },
  { name: "Tank Bund", lat: 17.4172, lng: 78.4754 },
  { name: "Necklace Road", lat: 17.4190, lng: 78.4650 },
  { name: "Chikkadpally", lat: 17.3995, lng: 78.4977 },
  { name: "Bagh Lingampally", lat: 17.3965, lng: 78.5020 },
  { name: "Barkatpura", lat: 17.3941, lng: 78.4983 },
  { name: "Sitaphalmandi", lat: 17.4258, lng: 78.5134 },
  { name: "Padmarao Nagar", lat: 17.4259, lng: 78.5042 },
  { name: "Sikh Village", lat: 17.4612, lng: 78.4916 },
  { name: "Kokapet X Roads", lat: 17.3957, lng: 78.3308 },
  { name: "Puppalaguda", lat: 17.4048, lng: 78.3697 },
  { name: "KBR Park", lat: 17.4180, lng: 78.4196 },
  { name: "Film Nagar", lat: 17.4116, lng: 78.4069 },
  { name: "Whisper Valley", lat: 17.4214, lng: 78.4022 },
  { name: "Bowrampet", lat: 17.5583, lng: 78.4031 },
  { name: "Mallampet", lat: 17.5542, lng: 78.3917 },
  { name: "Dundigal (IAF Academy)", lat: 17.6186, lng: 78.4026 },
  { name: "Jagadgirigutta", lat: 17.5144, lng: 78.4186 },
  { name: "Tumkunta", lat: 17.5649, lng: 78.5367 },
  { name: "Gaganpahad", lat: 17.3023, lng: 78.4357 },
  { name: "Katedan Industrial Area", lat: 17.3090, lng: 78.4414 },
  { name: "Nanakramguda Rotary", lat: 17.4150, lng: 78.3396 },
  { name: "Kothaguda X Roads", lat: 17.4589, lng: 78.3702 },
  { name: "Ameerpet Metro Station", lat: 17.4363, lng: 78.4447 },
  { name: "Mettuguda Metro Station", lat: 17.4300, lng: 78.5193 },
  { name: "Hitech City Metro Station", lat: 17.4496, lng: 78.3857 },
  { name: "Jubilee Hills Check Post Metro", lat: 17.4316, lng: 78.4074 },
  { name: "Yusufguda Metro Station", lat: 17.4328, lng: 78.4239 },
  // ── NEW: Gandipet / Mehdipatnam / Uppal / Chandanagar / Ameerpet Regions ──
  { name: "Gandipet X Roads", lat: 17.3820, lng: 78.3320 },
  { name: "CBIT (Gandipet)", lat: 17.3916, lng: 78.3190 },
  { name: "Taramati Baradari", lat: 17.3789, lng: 78.3800 },
  { name: "Nanal Nagar X Roads", lat: 17.3930, lng: 78.4230 },
  { name: "Kakatiya Nagar (Tolichowki)", lat: 17.4040, lng: 78.4060 },
  { name: "Shaikpet Nala", lat: 17.4030, lng: 78.4010 },
  { name: "G Narayanamma College (GNITS)", lat: 17.4120, lng: 78.3970 },
  { name: "OU Colony", lat: 17.4090, lng: 78.3900 },
  { name: "Ramanthapur TV Studio", lat: 17.3900, lng: 78.5200 },
  { name: "NGRI Metro Station", lat: 17.4110, lng: 78.5520 },
  { name: "Uppal Depot", lat: 17.4030, lng: 78.5680 },
  { name: "Boduppal X Roads", lat: 17.4150, lng: 78.5800 },
  { name: "Peerzadiguda", lat: 17.4120, lng: 78.5900 },
  { name: "Medipally", lat: 17.4180, lng: 78.6100 },
  { name: "Ghatkesar", lat: 17.4460, lng: 78.6830 },
  { name: "BHEL MIG", lat: 17.5050, lng: 78.3150 },
  { name: "Gangaram", lat: 17.4980, lng: 78.3380 },
  { name: "Madinaguda", lat: 17.4950, lng: 78.3420 },
  { name: "Deepthisri Nagar", lat: 17.4990, lng: 78.3450 },
  { name: "Alwyn Colony (Kukatpally)", lat: 17.5020, lng: 78.4000 },
  { name: "Maitrivanam (Ameerpet)", lat: 17.4370, lng: 78.4440 },
  { name: "Yellareddyguda", lat: 17.4390, lng: 78.4410 },
  { name: "Srinagar Colony", lat: 17.4300, lng: 78.4420 },
  { name: "Yusufguda Basti", lat: 17.4320, lng: 78.4350 },
  { name: "Krishna Nagar", lat: 17.4310, lng: 78.4280 },
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
