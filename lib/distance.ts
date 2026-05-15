/**
 * Haversine formula — returns distance in kilometres between two coordinates.
 */
export function getDistanceKm(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
    return (deg * Math.PI) / 180;
}

/**
 * Formats a km distance into a readable string.
 * < 1 km  → "340 m away"
 * >= 1 km → "2.4 km away"
 */
export function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
}