export interface Route {
  id: string;
  name: string;
  waypoints: string[];
}

export const COLLEGE_ROUTES: Route[] = [
  // --- Standard College Bus Routes (from physical charts) ---
  {
    id: "S1",
    name: "Patancheru to VNRVJIET (via BHEL)",
    waypoints: ["Muthangi ORR", "Patancheru Bus Stand", "Patancheru", "Beeramguda Kaman", "BHEL MIG", "BHEL Circle", "BHEL", "Gangaram", "Deepthisri Nagar", "Madinaguda", "Chandanagar Circle", "Chandanagar", "Miyapur Allwyn X Roads", "Miyapur", "VNR VJIET"]
  },
  {
    id: "S2",
    name: "LB Nagar to VNRVJIET (via Koti)",
    waypoints: ["LB Nagar X Roads", "LB Nagar", "Chaitanyapuri", "Dilsukhnagar Bus Station", "Dilsukhnagar", "Malakpet TV Tower", "Malakpet", "Koti (Women's College)", "Koti", "Abids GPO", "Abids", "Lakdikapul X Roads", "Lakdi ka pool", "Khairatabad Metro Station", "Khairatabad RTA", "Khairatabad", "VNR VJIET"]
  },
  {
    id: "S3",
    name: "Yusufguda to VNRVJIET (via Jubilee Check Post)",
    waypoints: ["Maitrivanam (Ameerpet)", "Yellareddyguda", "Srinagar Colony", "Krishna Nagar", "Yusufguda Basti", "Yusufguda Temple", "Yusufguda Check post", "Jubilee check post", "Peddamma Temple", "Madhapur Metro Station", "Madapur", "Durgam Cheruvu Metro Station", "Hi-Tech City", "Kothaguda", "Botanical Garden, Kondapur", "Kondapur X Roads", "Kondapur", "Hafeezpet X Roads", "Hafeezpet", "Miyapur X Roads", "VNR VJIET"]
  },
  {
    id: "S5",
    name: "Attapur to VNRVJIET (via Mehdipatnam)",
    waypoints: ["Attapur Ring Road", "Hyderguda (Attapur)", "Attapur (Pillar No 143)", "Rambagh (Attapur)", "Attapur Pillar 80", "Attapur", "Langar Houz", "Mehdipatnam (Reti Bowli)", "Retibowli", "Mehdipatnam Bus Stop", "Mehdipatnam", "Masab Tank", "Banjara Hills", "Panjagutta Metro Station", "Punjagutta", "Ameerpet X Roads", "Ameerpet", "SR Nagar Metro Station", "SR Nagar", "ESI Hospital Metro", "Erragadda Metro Station", "Erragadda (Gokul Theatre)", "Erragadda", "Bharat Nagar Metro", "VNR VJIET"]
  },
  {
    id: "S6",
    name: "Anandbagh to VNRVJIET (via Musheerabad)",
    waypoints: ["Anandbagh", "Malkajgiri", "Mettuguda", "Chilkalguda X Rds", "Musheerabad", "RTC X Roads", "RTC X Rds", "Narayanguda X Roads", "Narayanguda fly over", "Himayatnagar", "Himayat Nagar", "Liberty", "Khairatabad", "VNR VJIET"]
  },
  {
    id: "S7",
    name: "Mothinagar to VNRVJIET (via Moosapet)",
    waypoints: ["Mothinagar Signal", "PR Nagar", "Bharat Nagar Metro", "Bharathnagar Fly Over", "Moosapet Metro Station", "Moosapet", "Rainbow Vista", "Lodha Bellezza", "Brand Factory", "Road No 1", "KPHB Phase 1", "KPHB", "KPHB Phase 3", "JNTU", "Addagutta", "Pragati Nagar Lake", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "S9",
    name: "Kukatpally to VNRVJIET (via Nizampet)",
    waypoints: ["Kukatpally", "Ramdev Hosp", "Vasanth Nagar Kaman", "Hydernagar", "Miyapur Metro", "Nizampet X Roads", "Nizampet Village", "Sanghamithra", "Hanuman Temple", "Hill County", "Bachupally", "VNR VJIET"]
  },
  {
    id: "S10",
    name: "Manikonda to VNRVJIET (via Hi-Tech City)",
    waypoints: ["Manikonda (Marichettu)", "Manikonda Marri Chettu", "Lanco Hills", "Khazaguda", "Shaikpet (D-Mart)", "Gachibowli Stadium", "Gachibowli", "Bio Diversity Park", "IKEA", "Hi-Tech City Rly Stn Fly over", "Nexus Mall", "Manjeera Mall", "VNR VJIET"]
  },
  {
    id: "S11",
    name: "Masjidbanda to VNRVJIET (via Nallagandla)",
    waypoints: ["Masjidbanda", "HCU (University of Hyderabad)", "HCU", "Lingampally Railway Station", "Lingampally X Roads", "Nallagandla Fly Over", "BHEL", "Miyapur X Roads", "Bachupally", "VNR VJIET"]
  },
  {
    id: "S12",
    name: "Nagole to VNRVJIET (via Balanagar)",
    waypoints: ["Ghatkesar", "Medipally", "Peerzadiguda", "Boduppal X Roads", "Nagole", "Uppal Depot", "Uppal X Roads", "Uppal", "NGRI Metro Station", "Ramanthapur TV Studio", "Tarnaka X Roads", "Tarnaka", "Secunderabad East Metro", "Secunderabad", "Secunderabad (Paradise Circle)", "Himalaya Book Store", "JBS", "Tadbund X Roads", "Tadbund", "Bowenpally Check Post", "Bowenpally", "Balanagar X Roads", "Balanagar", "VNR VJIET"]
  },
  {
    id: "41",
    name: "ECIL to VNRVJIET (via Suchithra)",
    waypoints: ["ECIL X Roads", "ECIL", "AS Rao Nagar", "Radhika X Roads", "Radhika", "Sainikpuri", "Neredmet X Roads", "Trimulgherry X Roads", "Thirumalgiri", "Bowenpally", "Bapuji Nagar", "Suchitra Circle", "Suchitra", "Kompally X Roads", "Kompally", "Dullapally X Roads", "Gundlapochampally", "Kandlakoya (ORR Exit 6)", "VNR VJIET"]
  },
  {
    id: "42",
    name: "Old Alwal to VNRVJIET (via Gajularamaram)",
    waypoints: ["Temple Alwal", "Old Alwal IG Statue", "Alwal (Lothkunta)", "Father Balaiah Ngr", "Suchitra", "Jeedimetla (Subash Nagar)", "Qutbullapur", "Suraram X Roads", "Chintal", "Shapurnagar X Roads", "Shapur Signal", "IDPL X Roads", "Gajularamaram", "VNR VJIET"]
  },

  // --- Major City Corridors (from Maps & AI suggestions) ---
  {
    id: "C1",
    name: "Attapur Corridor",
    waypoints: ["Gandipet X Roads", "CBIT (Gandipet)", "Taramati Baradari", "APPA Junction (Peerancheru)", "Kalimandir", "Kismatpur X Roads", "Bandlaguda Jagir", "Sun City (Bandlaguda)", "Shivrampally", "Rajendra Nagar", "Attapur Ring Road", "Hyderguda (Attapur)", "Attapur (Pillar No 143)", "Rambagh (Attapur)", "Attapur Pillar 80", "Attapur", "Upperpally", "Langar Houz", "Nanal Nagar X Roads", "Mehdipatnam Bus Stop", "Mehdipatnam", "Rethibowli", "Toli Chowki", "Tolichowki Flyover", "Kakatiya Nagar (Tolichowki)", "Shaikpet Nala", "OU Colony", "G Narayanamma College (GNITS)", "Gachibowli", "Hitech City", "Kukatpally", "KPHB Phase 1", "KPHB", "KPHB Phase 3", "JNTU", "Nizampet Village", "Nizampet", "Pragati Nagar Lake", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C2",
    name: "Secunderabad Corridor",
    waypoints: ["Secunderabad East Metro", "Secunderabad", "Secunderabad (Paradise Circle)", "Paradise", "Bowenpally Check Post", "Bowenpally", "Balanagar X Roads", "Balanagar", "Moosapet Metro Station", "Moosapet", "Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C3",
    name: "Ameerpet Corridor",
    waypoints: ["Panjagutta Metro Station", "Panjagutta", "Ameerpet X Roads", "Ameerpet", "ESI Hospital Metro", "ESI", "SR Nagar Metro Station", "SR Nagar", "Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C4",
    name: "Gachibowli / Financial Dist Corridor",
    waypoints: ["Financial District", "Nanakramguda", "Gachibowli Stadium", "Gachibowli", "Botanical Garden, Kondapur", "Kondapur X Roads", "Kondapur", "Hafeezpet X Roads", "Hafeezpet", "Miyapur Allwyn X Roads", "Miyapur", "Nizampet Village", "Nizampet", "Pragati Nagar Lake", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C5",
    name: "Miyapur Direct Route",
    waypoints: ["Miyapur Allwyn X Roads", "Miyapur", "Hafeezpet X Roads", "Hafeezpet", "Nizampet Village", "Nizampet", "Pragati Nagar Lake", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C6",
    name: "KPHB Direct Route",
    waypoints: ["KPHB Phase 1", "KPHB", "KPHB Phase 3", "JNTU", "Nizampet Village", "Nizampet", "Pragati Nagar Lake", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C7",
    name: "Kompally / Northern Corridor",
    waypoints: ["Kompally", "Suchitra", "Suchitra Hotel", "Suchitra X Roads", "Jeedimetla", "Gundlapochampally", "Gandimaisamma", "Bahadurpally", "Bowrampet", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C8",
    name: "Uppal / East Corridor",
    waypoints: ["Uppal", "Habsiguda", "Tarnaka", "Secunderabad", "Paradise", "Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C9",
    name: "LB Nagar / Central Corridor",
    waypoints: ["LB Nagar", "Dilsukhnagar", "Malakpet", "Nampally", "Lakdikapul", "Punjagutta", "Ameerpet", "Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C10",
    name: "Shamshabad Airport (City Route)",
    waypoints: ["Shamshabad", "Aramghar", "Attapur", "Mehdipatnam", "Gachibowli", "Hitech City", "Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C11",
    name: "ORR Express (Shamshabad to VNR)",
    waypoints: ["Shamshabad ORR", "Kokapet", "Narsingi", "Gachibowli ORR", "Patancheru Exit", "Bachupally Exit", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C12",
    name: "MGBS / Koti Route",
    waypoints: ["MGBS", "Koti", "Lakdikapul", "Ameerpet", "Kukatpally", "JNTU", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "C13",
    name: "Alwal Corridor",
    waypoints: ["Alwal", "Suchitra", "Jeedimetla", "Suraram", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C14",
    name: "ECIL Corridor",
    waypoints: ["ECIL", "AS Rao Nagar", "Malkajgiri", "Bowenpally", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C15",
    name: "Kapra Route",
    waypoints: ["Kapra", "ECIL", "Malkajgiri", "Bowenpally", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C16",
    name: "Sainikpuri Route",
    waypoints: ["Sainikpuri", "AS Rao Nagar", "ECIL", "Bowenpally", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C17",
    name: "Neredmet Route",
    waypoints: ["Neredmet", "Malkajgiri", "Bowenpally", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C18",
    name: "Beeramguda Route",
    waypoints: ["Beeramguda", "BHEL", "Chandanagar", "Miyapur", "Nizampet", "VNR VJIET"]
  },
  {
    id: "C19",
    name: "Lingampally Route",
    waypoints: ["Lingampally", "Chandanagar", "Miyapur", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "C20",
    name: "BHEL Route",
    waypoints: ["BHEL", "Madinaguda", "Miyapur", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "C21",
    name: "Patancheru Route",
    waypoints: ["Patancheru", "BHEL", "Chandanagar", "Miyapur", "VNR VJIET"]
  },
  {
    id: "C22",
    name: "Medchal Route",
    waypoints: ["Medchal", "Kompally", "Suchitra", "Suchitra Hotel", "Suraram", "Bahadurpally", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C23",
    name: "Dundigal Route",
    waypoints: ["Dundigal", "Gandimaisamma", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C24",
    name: "Quthbullapur Route",
    waypoints: ["Quthbullapur", "Suraram", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C25",
    name: "Nagole Route",
    waypoints: ["Nagole", "Uppal", "Tarnaka", "Secunderabad", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C26",
    name: "Hayathnagar Route",
    waypoints: ["Hayathnagar", "LB Nagar", "Dilsukhnagar", "Ameerpet", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C27",
    name: "Financial District Direct",
    waypoints: ["Financial District", "Nanakramguda", "Gachibowli", "Kondapur", "KPHB", "JNTU", "VNR VJIET"]
  },
  {
    id: "C28",
    name: "Kokapet Route",
    waypoints: ["Kokapet", "Narsingi", "Gachibowli", "Kondapur", "JNTU", "VNR VJIET"]
  },
  {
    id: "C29",
    name: "Tarnaka Route",
    waypoints: ["Tarnaka", "Habsiguda", "Secunderabad", "Paradise", "Kukatpally", "JNTU", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "C30",
    name: "Dilsukhnagar Route",
    waypoints: ["Dilsukhnagar", "Chaderghat", "Nampally", "Ameerpet", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C31",
    name: "Mehdipatnam Route",
    waypoints: ["Mehdipatnam", "Masab Tank", "Punjagutta", "Ameerpet", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C32",
    name: "Attapur (via Ameerpet)",
    waypoints: ["Attapur", "Mehdipatnam", "Punjagutta", "Ameerpet", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C33",
    name: "Tolichowki Route",
    waypoints: ["Tolichowki", "Gachibowli", "Kondapur", "KPHB", "JNTU", "VNR VJIET"]
  },
  {
    id: "C34",
    name: "Manikonda Route",
    waypoints: ["Manikonda", "Khajaguda", "Gachibowli", "Kondapur", "KPHB", "JNTU", "VNR VJIET"]
  },
  {
    id: "C35",
    name: "Kompally (via Suraram)",
    waypoints: ["Kompally", "Suchitra", "Suchitra Hotel", "Jeedimetla", "Suraram", "Bahadurpally", "Bachupally", "VNR VJIET"]
  },
  {
    id: "C36",
    name: "Raidurg Route",
    waypoints: ["Raidurg", "HITEC City", "Madhapur", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "C37",
    name: "HITEC City Direct",
    waypoints: ["HITEC City", "Madhapur", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "C38",
    name: "Madhapur Route",
    waypoints: ["Madhapur", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "C39",
    name: "Jubilee Hills Check Post",
    waypoints: ["Jubilee Hills Check Post", "Madhapur", "KPHB", "JNTU", "VNR VJIET"]
  },
  {
    id: "C40",
    name: "Road No. 5 Jubilee Hills",
    waypoints: ["Road No. 5 Jubilee Hills", "Jubilee Hills Check Post", "Madhapur", "JNTU", "VNR VJIET"]
  },
  {
    id: "C41",
    name: "Yusufguda Route",
    waypoints: ["Yusufguda", "Ameerpet", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C42",
    name: "Begumpet Route",
    waypoints: ["Begumpet", "Ameerpet", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "C43",
    name: "Paradise Route",
    waypoints: ["Paradise", "Secunderabad", "Balanagar", "Kukatpally", "JNTU", "VNR VJIET"]
  },

  // --- Master Corridors (Highly Detailed) ---
  {
    id: "M1",
    name: "South Hyderabad Corridor",
    waypoints: ["Airport", "Shamshabad", "Rajendranagar", "Attapur", "Mehdipatnam", "Masab Tank", "Lakdikapul", "Khairatabad", "Punjagutta", "Ameerpet", "ESI", "Erragadda", "Bharat Nagar", "Moosapet", "Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "M2",
    name: "IT Corridor",
    waypoints: ["Financial District", "Kokapet", "Narsingi", "Khajaguda", "Manikonda", "Toli Chowki", "Gachibowli", "Raidurg", "HITEC City", "Madhapur", "Kondapur", "Hafeezpet", "Miyapur", "Allwyn X Roads", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "M3",
    name: "Central Hyderabad Corridor",
    waypoints: ["Assembly", "Gandhi Bhavan", "Nampally", "Sultan Bazar", "MGBS", "Chaderghat", "Dilsukhnagar", "LB Nagar", "Hayathnagar", "Punjagutta", "Ameerpet", "Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "M4",
    name: "Secunderabad Master Corridor",
    waypoints: ["Secunderabad East", "Parade Ground", "Paradise", "Bowenpally", "Balanagar", "Moosapet", "Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "M5",
    name: "North-East Corridor",
    waypoints: ["Nagole", "Stadium", "NGRI", "Habsiguda", "Tarnaka", "Mettuguda", "Secunderabad", "Paradise", "Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "M6",
    name: "ECIL Master Corridor",
    waypoints: ["Sainikpuri", "Kapra", "ECIL", "AS Rao Nagar", "Neredmet", "Malkajgiri", "Bowenpally", "Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "M7",
    name: "North-West Corridor",
    waypoints: ["Medchal", "Kompally", "Alwal", "Suchitra", "Suchitra Hotel", "Jeedimetla", "Suraram", "Quthbullapur", "Dundigal", "Gandimaisamma", "Bahadurpally", "Bachupally", "VNR VJIET"]
  },
  {
    id: "M8",
    name: "Western Corridor",
    waypoints: ["Patancheru", "Beeramguda", "BHEL", "Lingampally", "Chandanagar", "Madinaguda", "Miyapur", "Allwyn X Roads", "Nizampet", "Pragathi Nagar", "Bachupally", "VNR VJIET"]
  },
  {
    id: "M9",
    name: "Short VNR Corridor",
    waypoints: ["Kukatpally", "KPHB", "JNTU", "JNTU Metro", "Miyapur", "Allwyn X Roads", "Nizampet", "Pragathi Nagar", "Bachupally X Roads", "Bachupally", "VNR VJIET"]
  },

  // --- Short City Routes ---
  {
    id: "S13",
    name: "Punjagutta Route",
    waypoints: ["Punjagutta", "Ameerpet", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "S14",
    name: "ESI Hospital Route",
    waypoints: ["ESI Hospital", "Erragadda", "Bharat Nagar", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "S15",
    name: "Bharat Nagar Route",
    waypoints: ["Bharat Nagar", "Moosapet", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "S16",
    name: "Moosapet Route",
    waypoints: ["Moosapet", "Kukatpally", "JNTU", "VNR VJIET"]
  },
  {
    id: "S17",
    name: "Balanagar Route",
    waypoints: ["Balanagar", "Kukatpally", "JNTU", "Nizampet", "VNR VJIET"]
  },
  {
    id: "S18",
    name: "Kukatpally Route",
    waypoints: ["Kukatpally", "KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "S19",
    name: "KPHB Colony Route",
    waypoints: ["KPHB", "JNTU", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "S20",
    name: "JNTU College Route",
    waypoints: ["JNTU", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  },
  {
    id: "S21",
    name: "Miyapur Extended Route",
    waypoints: ["Miyapur", "Allwyn X Roads", "Nizampet", "Pragathi Nagar", "VNR VJIET"]
  }
];

export function getRouteById(id: string): Route | undefined {
  return COLLEGE_ROUTES.find(r => r.id === id);
}

// Checks if a start and end location exist sequentially in a given route
export function checkFractionalMatch(routeId: string, startLoc: string, endLoc: string): boolean {
  const route = getRouteById(routeId);
  if (!route) return false;
  
  // Clean up strings for comparison
  const clean = (s: string) => s.toLowerCase().trim();
  const start = clean(startLoc);
  const end = clean(endLoc);
  
  const startIndex = route.waypoints.findIndex(w => clean(w).includes(start) || start.includes(clean(w)));
  const endIndex = route.waypoints.findIndex(w => clean(w).includes(end) || end.includes(clean(w)));
  
  return startIndex !== -1 && endIndex !== -1 && startIndex < endIndex;
}

function findWaypointIndex(waypoints: string[], location: string): number {
  const clean = (s: string) => s.toLowerCase().trim();
  const target = clean(location);
  let bestIndex = -1;
  
  for (let i = 0; i < waypoints.length; i++) {
    const w = clean(waypoints[i]);
    if (w.includes(target) || target.includes(w)) {
      return i;
    }
  }
  
  return bestIndex;
}

export function getSlicedWaypoints(routeId: string, origin: string, destination: string): string[] {
  const route = getRouteById(routeId);
  if (!route) return [origin, destination];

  const startIndex = findWaypointIndex(route.waypoints, origin);
  const endIndex = findWaypointIndex(route.waypoints, destination);

  if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
    return route.waypoints.slice(startIndex, endIndex + 1);
  }

  return route.waypoints;
}
