// Straight-line distance between two points on Earth (haversine), for delivery fees by radius.
export interface Point {
	lat: number;
	lng: number;
}

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceMeters(a: Point, b: Point): number {
	const dLat = rad(b.lat - a.lat);
	const dLng = rad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** "2,5" or "3" km as typed by the owner → metres; null when out of range (0.1 to 100 km). */
export function parseRadiusKm(text: string): number | null {
	const km = Number(text.trim().replace(',', '.'));
	if (!Number.isFinite(km) || km < 0.1 || km > 100) return null;
	return Math.round(km * 1000);
}
