// ====================================================================
// GEOLOCATION & ANTI-FRAUD UTILITIES
// Cloud Kitchen Coordinates: Sohna GLS Homes near GDGU, Haryana
// ====================================================================

export const KITCHEN_LAT = 28.2468;
export const KITCHEN_LNG = 77.0628;
export const MAX_SERVICE_RADIUS_KM = 99999; // Radius restriction disabled

/**
 * Calculates straight-line distance in kilometers between two GPS coordinates
 * using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number = KITCHEN_LAT,
  lon2: number = KITCHEN_LNG
): number {
  if (!lat1 || !lon1) return 0;
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return parseFloat(distance.toFixed(2));
}

/**
 * Fetches user's public IP address from client
 */
export async function fetchPublicIP(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) return data.ip;
    }
  } catch {
    // Fallback IP
  }
  return '103.211.14.82';
}

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  distanceKm: number;
  isWithinZone: boolean;
  ipAddress: string;
  errorType?: 'DENIED' | 'OUT_OF_ZONE' | 'UNAVAILABLE';
  errorMessage?: string;
}

/**
 * Requests browser HTML5 Geolocation API.
 * Radius restriction is disabled - all locations are accepted smoothly.
 */
export async function requestValidatedLocation(): Promise<GeoLocationResult> {
  const ipAddress = await fetchPublicIP();

  if (!('geolocation' in navigator)) {
    return {
      latitude: KITCHEN_LAT,
      longitude: KITCHEN_LNG,
      distanceKm: 0.1,
      isWithinZone: true,
      ipAddress
    };
  }

  try {
    const position: GeolocationPosition = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    });

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const distanceKm = calculateDistanceKm(lat, lng, KITCHEN_LAT, KITCHEN_LNG);

    return {
      latitude: lat,
      longitude: lng,
      distanceKm,
      isWithinZone: true,
      ipAddress
    };
  } catch {
    // Fallback gracefully to default kitchen coordinates without blocking user
    return {
      latitude: KITCHEN_LAT,
      longitude: KITCHEN_LNG,
      distanceKm: 0.1,
      isWithinZone: true,
      ipAddress
    };
  }
}
