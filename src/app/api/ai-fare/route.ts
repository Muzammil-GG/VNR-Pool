import { NextResponse } from 'next/server';
import { calculateDistance, findBestMatchLocation } from '@/lib/locations';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { origin, destination, vehicle_type, passengers, ride_category } = await req.json();

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }

    const isCommercialSplit = ride_category === 'auto_split';
    const numPassengers = passengers || 1;

    // Calculate realistic Hyderabad driving distance in km
    const matchOrig = findBestMatchLocation(origin);
    const matchDest = findDirectMatchOrFallback(destination);
    
    let distKm = 10; // default average campus commute
    if (matchOrig && matchDest) {
      const straightLineDist = calculateDistance(matchOrig.lat, matchOrig.lon, matchDest.lat, matchDest.lon);
      distKm = Math.max(3, Math.round(straightLineDist * 1.35 * 10) / 10); // 1.35 factor for road sinuosity in Hyderabad
    }

    // Rapido / Uber Hyderabad Real Pricing Models:
    // Bike: Base ₹20 + ₹11 per km
    // Auto: Base ₹30 + ₹16 per km
    // Car/Cab: Base ₹50 + ₹22 per km
    let baseFare = 50;
    let perKmRate = 22;

    const vType = (vehicle_type || 'car').toLowerCase();
    if (vType === 'bike') {
      baseFare = 20;
      perKmRate = 11;
    } else if (vType === 'auto') {
      baseFare = 30;
      perKmRate = 16;
    }

    const calculatedTotal = Math.round(baseFare + (distKm * perKmRate));

    let suggestedFare = 0;
    let reasoning = '';

    if (isCommercialSplit) {
      suggestedFare = calculatedTotal;
      reasoning = `${distKm}km trip. Rapido/Uber meter estimated at ₹${suggestedFare}.`;
    } else {
      // Student pool per seat
      suggestedFare = Math.max(20, Math.round(calculatedTotal / numPassengers / 10) * 10);
      reasoning = `${distKm}km commute. Split across ${numPassengers} seats: ₹${suggestedFare}/seat.`;
    }

    return NextResponse.json({
      reasoning,
      suggested_total_fare: suggestedFare
    });

  } catch (error) {
    console.error('AI Fare Error:', error);
    return NextResponse.json({ error: 'Failed to calculate fare' }, { status: 500 });
  }
}

function findDirectMatchOrFallback(query: string) {
  return findBestMatchLocation(query);
}
