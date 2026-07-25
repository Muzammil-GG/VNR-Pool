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
