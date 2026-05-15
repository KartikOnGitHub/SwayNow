import { Timestamp } from "firebase/firestore";

export type Duration = 30 | 60 | 120 | 240; // minutes

export const DURATIONS: { label: string; value: Duration }[] = [
    { label: "30 min", value: 30  },
    { label: "1 hr",   value: 60  },
    { label: "2 hrs",  value: 120 },
    { label: "4 hrs",  value: 240 },
];

/** Returns a Firestore Timestamp for now + durationMinutes */
export function getExpiresAt(durationMinutes: Duration): Timestamp {
    const ms = Date.now() + durationMinutes * 60 * 1000;
    return Timestamp.fromMillis(ms);
}

/** Returns true if the post has not yet expired */
export function isActive(expiresAt: Timestamp): boolean {
    return expiresAt.toMillis() > Date.now();
}

/**
 * Returns a human-readable string for time remaining.
 * e.g. "45 min left", "1 hr 12 min left", "Expired"
 */
export function timeRemaining(expiresAt: Timestamp): string {
    const msLeft = expiresAt.toMillis() - Date.now();
    if (msLeft <= 0) return "Expired";

    const totalMinutes = Math.floor(msLeft / 60000);
    const hours        = Math.floor(totalMinutes / 60);
    const minutes      = totalMinutes % 60;

    if (hours === 0) return `${minutes} min left`;
    if (minutes === 0) return `${hours} hr left`;
    return `${hours} hr ${minutes} min left`;
}

/**
 * Returns a 0–1 fraction of life remaining, for a progress indicator.
 */
export function lifeFraction(createdAt: Timestamp, expiresAt: Timestamp): number {
    const total   = expiresAt.toMillis() - createdAt.toMillis();
    const elapsed = Date.now()           - createdAt.toMillis();
    return Math.max(0, Math.min(1, 1 - elapsed / total));
}