const fs = require('fs');

const extraLocations = [
  "Paradise Biryani (Secunderabad)", "Paradise Biryani (Kukatpally)", "Paradise Biryani (Gachibowli)", "Paradise Biryani (Begumpet)",
  "Pista House (Tolichowki)", "Pista House (Charminar)", "Pista House (Kondapur)", "Pista House (Nizampet)", "Pista House (Mehdipatnam)",
  "Bawarchi (RTC X Roads)", "Cafe Bahar (Basheerbagh)", "Shah Ghouse (Tolichowki)", "Shah Ghouse (Gachibowli)", "Shah Ghouse (Charminar)",
  "Karachi Bakery (Moazzam Jahi Market)", "Karachi Bakery (Kukatpally)", "Karachi Bakery (Banjara Hills)",
  "Chutneys (Banjara Hills)", "Chutneys (Jubilee Hills)", "Chutneys (Kukatpally)",
  "Ohris (Banjara Hills)", "Ohris (Basheerbagh)", "Minerva Coffee Shop", "Santosh Dhaba (Abids)", "Santosh Dhaba (Koti)",
  "ITC Kakatiya", "Taj Krishna", "Taj Banjara", "Taj Deccan", "Novotel (HITEC City)", "Novotel (Airport)",
  "Westin (Mindspace)", "Trident (HITEC City)", "Sheraton (Gachibowli)", "Radisson Blu (Banjara Hills)", "Park Hyatt (Banjara Hills)",
  "Marriott (Tank Bund)", "Avasa Hotel (Madhapur)", "Dasapalla Hotel (Jubilee Hills)", "Lemon Tree (HITEC City)", "Red Fox (HITEC City)",
  "Platform 65 (Kukatpally)", "Platform 65 (Kondapur)", "Flechazo (Madhapur)", "Barbeque Nation (Banjara Hills)", "Barbeque Nation (Kukatpally)",
  "Absolute Barbecues (Jubilee Hills)", "Absolute Barbecues (Gachibowli)",
  "Blue Fox (Minerva Grand)", "Shadab Hotel (Charminar)", "Nayaab Hotel", "Nimrah Cafe (Charminar)",
  "Mehfil (Narayanguda)", "Mehfil (Kukatpally)", "Kritunga (Kukatpally)", "Kritunga (Ameerpet)", "Kritunga (Gachibowli)"
];

const locsPath = 'c:/Users/mdmuz/OneDrive/Desktop/VNRPOOL/src/lib/locations.ts';
let locationsFile = fs.readFileSync(locsPath, 'utf-8');

const existingMatches = [...locationsFile.matchAll(/name:\s*"([^"]+)"/g)];
const existingNames = new Set(existingMatches.map(m => m[1].toLowerCase()));

const newLocs = [];
for (const wp of extraLocations) {
  if (!existingNames.has(wp.toLowerCase()) && wp !== 'VNR VJIET') {
    newLocs.push(`  { name: "${wp}", lat: 17.4000, lng: 78.4000 }`);
  }
}

if (newLocs.length > 0) {
  const idx = locationsFile.lastIndexOf('];');
  if (idx !== -1) {
    const updated = locationsFile.slice(0, idx) + ',\n' + newLocs.join(',\n') + '\n' + locationsFile.slice(idx);
    fs.writeFileSync(locsPath, updated);
    console.log('Added ' + newLocs.length + ' Hotels/Restaurants.');
  }
} else {
  console.log('No new locations to add.');
}
