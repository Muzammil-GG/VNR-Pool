import { getRouteById } from './routes';

/**
 * Calculates the fractional price for a passenger who only rides part of the route.
 * @param routeId The predefined route ID (e.g., 'S12')
 * @param startLoc Passenger's pickup location
 * @param endLoc Passenger's dropoff location
 * @param totalSeatPrice The price for the entire route
 * @returns The calculated fractional price (rounded to nearest integer)
 */
export function calculateFractionalPrice(
  routeId: string, 
  startLoc: string, 
  endLoc: string, 
  totalSeatPrice: number
): number {
  const route = getRouteById(routeId);
  if (!route) return totalSeatPrice;

  const clean = (s: string) => s.toLowerCase().trim();
  const start = clean(startLoc);
  const end = clean(endLoc);
  
  const startIndex = route.waypoints.findIndex(w => clean(w).includes(start) || start.includes(clean(w)));
  const endIndex = route.waypoints.findIndex(w => clean(w).includes(end) || end.includes(clean(w)));

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return totalSeatPrice; // Fallback if match fails
  }

  const passengerStops = endIndex - startIndex;
  const totalStops = route.waypoints.length - 1;

  if (totalStops <= 0) return totalSeatPrice;

  // Simple proportional pricing based on stops. 
  // We can add a base fare (e.g. 20% flat + 80% distance) if needed, but simple ratio is standard.
  const rawPrice = (passengerStops / totalStops) * totalSeatPrice;
  
  // Floor to nearest integer, but never less than 10 rs minimum (unless total seat price is somehow less)
  const minimumPrice = Math.min(10, totalSeatPrice);
  return Math.max(minimumPrice, Math.round(rawPrice));
}

export interface PassengerTrip {
  id: string;
  startLoc: string;
  endLoc: string;
}

/**
 * Calculates dynamic proportional split pricing for an auto/cab where cost is divided among active passengers per segment.
 */
export function calculateDynamicSplitPricing(
  routeId: string | null | undefined,
  totalTripCost: number,
  passengers: PassengerTrip[]
): Record<string, number> {
  const route = routeId ? getRouteById(routeId) : null;
  
  // Fallback to simple equal split if no valid predefined route
  if (!route || route.waypoints.length <= 1) {
    const costPerPerson = passengers.length > 0 ? Math.round(totalTripCost / passengers.length) : totalTripCost;
    return passengers.reduce((acc, p) => ({ ...acc, [p.id]: costPerPerson }), {});
  }

  const clean = (s: string) => s.toLowerCase().trim();
  const waypoints = route.waypoints.map(clean);
  const totalSegments = waypoints.length - 1;
  const costPerSegment = totalTripCost / totalSegments;

  const costMap: Record<string, number> = {};
  passengers.forEach(p => costMap[p.id] = 0);

  // Map each passenger to the segments they travel
  // segment i represents travel from waypoints[i] to waypoints[i+1]
  const passengerSegments = passengers.map(p => {
    const startIdx = waypoints.findIndex(w => w.includes(clean(p.startLoc)) || clean(p.startLoc).includes(w));
    const endIdx = waypoints.findIndex(w => w.includes(clean(p.endLoc)) || clean(p.endLoc).includes(w));
    
    // If custom text doesn't perfectly match a waypoint, default them to the full route to be safe
    const actualStart = startIdx !== -1 ? startIdx : 0;
    const actualEnd = endIdx !== -1 && endIdx > actualStart ? endIdx : totalSegments;
    
    return { id: p.id, start: actualStart, end: actualEnd };
  });

  // Split the cost of each segment among passengers present in that segment
  for (let i = 0; i < totalSegments; i++) {
    const activePassengers = passengerSegments.filter(p => p.start <= i && p.end > i);
    if (activePassengers.length > 0) {
      const splitCost = costPerSegment / activePassengers.length;
      activePassengers.forEach(p => {
        costMap[p.id] += splitCost;
      });
    }
  }

  // Round prices
  for (const id in costMap) {
    costMap[id] = Math.round(costMap[id]);
  }

  // Correct rounding errors so the total always exactly matches totalTripCost
  const currentSum = Object.values(costMap).reduce((a, b) => a + b, 0);
  if (currentSum !== totalTripCost && passengers.length > 0) {
    const diff = totalTripCost - currentSum;
    // Apply difference to the first passenger (usually the ride creator who is taking responsibility)
    costMap[passengers[0].id] += diff;
  }

  return costMap;
}
