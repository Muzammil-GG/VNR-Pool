const routes = [
  {
    id: "S1",
    name: "Patancheru to VNRVJIET (via BHEL)",
    waypoints: ["Patancheru", "Beeramguda Kaman", "BHEL", "Chandanagar", "Miyapur", "VNR VJIET"]
  }
];

function checkFractionalMatch(routeId, startLoc, endLoc) {
  const route = routes.find(r => r.id === routeId);
  if (!route) return false;
  
  const clean = (s) => s.toLowerCase().trim();
  const start = clean(startLoc);
  const end = clean(endLoc);
  
  const startIndex = route.waypoints.findIndex(w => clean(w).includes(start) || start.includes(clean(w)));
  const endIndex = route.waypoints.findIndex(w => clean(w).includes(end) || end.includes(clean(w)));
  
  console.log('startIndex:', startIndex, 'endIndex:', endIndex);
  return startIndex !== -1 && endIndex !== -1 && startIndex < endIndex;
}

console.log(checkFractionalMatch('S1', 'BHEL', 'VNR VJIET Campus Gate 1'));
