/**
 * Calculates the great-circle distance between two points on Earth using the Haversine formula.
 * @param {Object} a - First point with lat/lng properties
 * @param {number} a.lat - Latitude of first point in degrees
 * @param {number} a.lng - Longitude of first point in degrees
 * @param {Object} b - Second point with lat/lng properties  
 * @param {number} b.lat - Latitude of second point in degrees
 * @param {number} b.lng - Longitude of second point in degrees
 * @returns {number} Distance in kilometers
 */
export function haversine(a, b) {
  const R = 6371; // Earth radius in km
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}