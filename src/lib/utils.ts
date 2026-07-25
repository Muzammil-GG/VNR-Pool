import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidIndianVehicleNumber(number: string | null | undefined): boolean {
  if (!number) return true; // Optional field, empty is valid
  const clean = number.replace(/[\s-]/g, '').toUpperCase();
  if (clean.length === 0) return true;
  
  // Standard format: State code (2 letters) + RTO code (1-2 digits) + Optional letters (0-3) + Number (1-4 digits)
  const modernRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/;
  
  // Bharat Series (BH): Year (2 digits) + BH + Number (4 digits) + Letters (1-2 letters)
  const bhRegex = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
  
  return modernRegex.test(clean) || bhRegex.test(clean);
}
