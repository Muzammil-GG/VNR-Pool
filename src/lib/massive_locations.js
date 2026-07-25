const fs = require('fs');

const extraLocations = [
  "Afzalgunj Bus Depot", "Mahatma Gandhi Bus Station (MGBS)", "Jubilee Bus Station (JBS)", "Dilsukhnagar Bus Depot", "Kukatpally Bus Depot", "Miyapur Bus Depot", "Midhani Bus Depot", "Falaknuma Bus Depot", "Barkatpura Bus Depot", "Musheerabad Bus Depot", "Ranigunj Bus Depot", "Cantonment Bus Depot", "Hakimpet Bus Depot", "Uppal Bus Depot", "Hayathnagar Bus Depot", "Mehdipatnam Bus Depot", "Chengicherla Bus Depot", "Kushiguda Bus Depot",
  "Secunderabad Railway Station", "Hyderabad Deccan (Nampally) Railway Station", "Kacheguda Railway Station", "Lingampally Railway Station", "Begumpet Railway Station", "Falaknuma Railway Station", "Malakpet Railway Station", "Dabirpura Railway Station", "Yakutpura Railway Station", "Huppuguda Railway Station", "Borabanda Railway Station", "Hi-Tech City Railway Station", "Hafeezpet Railway Station", "Chandanagar Railway Station",
  "Koti Women's College", "Koti Maternity Hospital", "Osmania General Hospital", "Salar Jung Museum", "Charminar Bus Stop", "Madina Circle", "Nayapul", "Afzalgunj", "Gowliguda", "Putbowli", "Ram Koti", "Narayanaguda", "RTC X Roads", "Chikkadpally", "Ashok Nagar", "Indira Park", "Tank Bund", "Necklace Road", "Sanjeevaiah Park", "Jalavihar",
  "Begumpet", "Panjagutta", "Somajiguda", "Khairatabad", "Lakdikapul", "Assembly", "Nampally", "Abids", "Basheerbagh", "Liberty", "Himayatnagar", "Domalguda", "Vidyanagar", "Adikmet", "Nallakunta", "Amberpet", "Ramanthapur", "Uppal X Roads", "Habsiguda", "Tarnaka", "Mettuguda", "Chilkalguda", "Secunderabad Clock Tower", "Paradise Circle", "Patny Center", "Sikh Village", "Bowenpally Checkpost",
  "Balanagar X Roads", "Moosapet X Roads", "Kukatpally Housing Board (KPHB)", "JNTU College", "Nizampet X Roads", "Miyapur X Roads", "Allwyn X Roads", "Madinaguda", "Chandanagar", "BHEL X Roads", "Patancheru Bus Stop", "Isnapur", "Muttangi", "Rudraram", "Kandi",
  "Gachibowli X Roads", "Indira Gandhi Statue (Gachibowli)", "Bio-Diversity Park", "Mindspace Junction", "Cyber Towers", "Hitex Exhibition Center", "Kondapur X Roads", "Kothaguda X Roads", "Hafeezpet X Roads", "Tolichowki X Roads", "Rethibowli", "Mehdipatnam X Roads", "Nanal Nagar", "Langar Houz", "Golkonda Fort", "Qutb Shahi Tombs", "Shaikpet", "Manikonda", "Puppalaguda", "Narsingi", "Kokapet", "Financial District", "Wipro Circle", "IIIT Hyderabad", "ISB Hyderabad", "University of Hyderabad (HCU)",
  "Attapur", "Rajendranagar", "Agriculture University", "Aramghar X Roads", "Shamshabad", "Rajiv Gandhi International Airport (RGIA)", "Pahadi Shareef", "Chandrayangutta", "Barkas", "Bandlaguda", "Santhoshnagar", "Saidabad", "IS Sadan", "Malakpet X Roads", "Chaderghat",
  "Dilsukhnagar", "Chaitanyapuri", "Kothapet", "L.B. Nagar X Roads", "Bairamalguda", "Sagar Ring Road", "Karmanghat", "Champapet", "Owaisi Hospital", "Midhani", "DRDL", "Balapur", "Katedan", "Mylardevpally",
  "Vanasthalipuram", "Hayathnagar", "Pedda Amberpet", "Ramoji Film City", "Ghatkesar", "Pocharam", "Narapally", "Boduppal", "Peerzadiguda", "Medipally", "Chengicherla",
  "ECIL X Roads", "A.S. Rao Nagar", "Radhika Theatre", "Kapra", "Kushaiguda", "Sainikpuri", "Neredmet X Roads", "Safilguda", "Malkajgiri", "Anandbagh", "ZTS X Roads", "Lalapet",
  "Alwal", "Bolarum", "Kompally", "Suchitra X Roads", "Jeedimetla Village", "Suraram", "Gajularamaram", "Shapur Nagar", "Quthbullapur", "Chintal", "IDA Jeedimetla", "Bahadurpally X Roads", "Gandimaisamma X Roads", "Dundigal", "Bowrampet", "Mallampet", "Bachupally X Roads", "Pragathi Nagar",
  "Yusufguda", "Kalyan Nagar", "S.R. Nagar", "Ameerpet X Roads", "Maitrivanam", "Erragadda", "Sanathnagar", "Bharat Nagar", "Motinagar", "Karmika Nagar",
  "Banjara Hills Road No. 1", "Banjara Hills Road No. 12", "Jubilee Hills Check Post", "Peddamma Temple", "Madhapur Police Station", "Jubilee Hills Road No. 36", "Jubilee Hills Road No. 45", "Durgam Cheruvu", "Inorbit Mall", "IKEA",
  "Moula Ali", "Nagaram", "Dammaiguda", "Cheeryal", "Keesara", "Shamirpet", "Turkapally", "Aliabad", "Lalgadi Malakpet", "Medchal", "Gowdavalli", "Kandlakoya", "Gundlapochampally"
];

const locsPath = 'c:/Users/mdmuz/OneDrive/Desktop/VNRPOOL/src/lib/locations.ts';
let locationsFile = fs.readFileSync(locsPath, 'utf-8');

const existingMatches = [...locationsFile.matchAll(/name:\s*"([^"]+)"/g)];
const existingNames = new Set(existingMatches.map(m => m[1].toLowerCase()));

const newLocs = [];
for (const wp of extraLocations) {
  if (!existingNames.has(wp.toLowerCase()) && wp !== 'VNR VJIET') {
    newLocs.push(`  { name: "${wp}", lat: 17.3850, lng: 78.4867 }`);
  }
}

if (newLocs.length > 0) {
  const idx = locationsFile.lastIndexOf('];');
  if (idx !== -1) {
    const updated = locationsFile.slice(0, idx) + ',\n' + newLocs.join(',\n') + '\n' + locationsFile.slice(idx);
    fs.writeFileSync(locsPath, updated);
    console.log('Added ' + newLocs.length + ' MASSIVE locations.');
  }
} else {
  console.log('No new locations to add.');
}
