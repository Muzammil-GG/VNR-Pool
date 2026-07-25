const fs = require('fs');

const routesPath = 'c:/Users/mdmuz/OneDrive/Desktop/VNRPOOL/src/lib/routes.ts';
const locsPath = 'c:/Users/mdmuz/OneDrive/Desktop/VNRPOOL/src/lib/locations.ts';

const routesFile = fs.readFileSync(routesPath, 'utf-8');
const locationsFile = fs.readFileSync(locsPath, 'utf-8');

const waypointsSet = new Set();
const matches = [...routesFile.matchAll(/waypoints:\s*\[(.*?)\]/g)];
for (const match of matches) {
  const arr = match[1].split(',').map(s => s.trim().replace(/"/g, ''));
  arr.forEach(w => waypointsSet.add(w));
}

const existingMatches = [...locationsFile.matchAll(/name:\s*"([^"]+)"/g)];
const existingNames = new Set(existingMatches.map(m => m[1].toLowerCase()));

const newLocs = [];
for (const wp of waypointsSet) {
  if (!existingNames.has(wp.toLowerCase()) && wp !== 'VNR VJIET') {
    newLocs.push(`  { name: "${wp}", lat: 17.4399, lng: 78.4983 }`);
  }
}

if (newLocs.length > 0) {
  const idx = locationsFile.lastIndexOf('];');
  const updated = locationsFile.slice(0, idx) + ',\n' + newLocs.join(',\n') + '\n' + locationsFile.slice(idx);
  fs.writeFileSync(locsPath, updated);
  console.log('Added ' + newLocs.length + ' locations.');
} else {
  console.log('No new locations to add.');
}
