import {
    doc, getDoc, setDoc, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ── Types ──────────────────────────────────────────────────
export type Gender = "male" | "female" | "non-binary" | "prefer not to say";

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string | null;       // From Google account
    age: number | null;
    gender: Gender | null;
    languages: string[];
    interests: string[];
    bio: string;
    onboardedAt: Timestamp | null;
    updatedAt: Timestamp | null;
}

export const INTEREST_OPTIONS = [
    "☕ Coffee","🍻 Drinks","🍜 Food","🧭 Exploring","🎨 Art","📚 Reading",
    "🏀 Basketball","⚽ Football","🏃 Running","🧗 Climbing","🚴 Cycling","🏋️ Gym",
    "🎮 Gaming","🎸 Music","🎬 Movies","📷 Photography","💃 Dancing","🧘 Yoga",
    "🌍 Travel","🗣️ Languages","💻 Tech","📈 Startups","🐶 Animals","🌱 Nature",
    "🛹 Skating","🎤 Nightlife","🧩 Board games","✏️ Studying",
];

export const LANGUAGE_OPTIONS = [
    "English","German","French","Spanish","Italian","Portuguese","Dutch",
    "Russian","Polish","Turkish","Arabic","Hebrew","Hindi","Punjabi","Urdu",
    "Bengali","Tamil","Telugu","Mandarin","Cantonese","Japanese","Korean",
    "Vietnamese","Thai","Indonesian","Filipino","Swahili","Greek","Czech",
    "Swedish","Norwegian","Danish","Finnish","Romanian","Hungarian","Ukrainian",
];

export const GENDERS: Gender[] = ["male","female","non-binary","prefer not to say"];

// ── Firestore ────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as UserProfile;
}

export async function saveUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
    const ref = doc(db, "users", profile.uid);
    await setDoc(ref, {
        ...profile,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

export async function completeOnboarding(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
    const docRef = doc(db, "users", profile.uid);
    await setDoc(docRef, {
        ...profile,
        onboardedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }, { merge: true });
}