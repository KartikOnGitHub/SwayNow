import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    getDoc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { buildJoinRequestNotif, buildAcceptedNotif } from "./notifications";

// ── Types ──────────────────────────────────────────────────

export type RequestStatus = "pending" | "accepted" | "rejected";
export type ReportReason  = "spam" | "harassment" | "inappropriate" | "other";

export interface JoinRequest {
    id: string;
    postId: string;
    postText: string;
    senderUserId: string;
    senderUserName: string;
    receiverUserId: string;
    status: RequestStatus;
    createdAt: Timestamp | null;
}

export interface Review {
    id: string;
    authorId: string;
    authorName: string;
    otherUserId: string;
    text: string;
    positive: boolean;
    met: boolean;
    createdAt: Timestamp | null;
}

export interface TrustScore {
    metCount: number;
    positiveCount: number;
}

// ── Join Requests ──────────────────────────────────────────

export async function sendJoinRequest(
    postId: string,
    postText: string,
    senderUserId: string,
    senderUserName: string,
    receiverUserId: string
): Promise<void> {
    const existing = await getDocs(query(
        collection(db, "requests"),
        where("postId",        "==", postId),
        where("senderUserId", "==", senderUserId),
        where("status",        "==", "pending")
    ));
    if (!existing.empty) return;
    await addDoc(collection(db, "requests"), {
        postId,
        postText: postText.slice(0, 120),
        senderUserId,
        senderUserName,
        receiverUserId,
        status: "pending",
        createdAt: serverTimestamp(),
    });

    // Notify post creator
    buildJoinRequestNotif(receiverUserId, senderUserId, senderUserName, postText, postId)
        .catch(console.warn);
}

export async function acceptRequest(requestId: string): Promise<void> {
    await updateDoc(doc(db, "requests", requestId), { status: "accepted" });

    // Notify the sender
    try {
        const snap = await getDoc(doc(db, "requests", requestId));
        if (snap.exists()) {
            const data = snap.data();
            buildAcceptedNotif(
                data.senderUserId,
                data.receiverUserId,
                "Someone",
                data.postId,
                data.senderUserId,
            ).catch(console.warn);
        }
    } catch (e) { console.warn(e); }
}

export async function rejectRequest(requestId: string): Promise<void> {
    await updateDoc(doc(db, "requests", requestId), { status: "rejected" });
}

export async function getAcceptedRequest(
    postId: string,
    senderUserId: string
): Promise<JoinRequest | null> {
    const snap = await getDocs(query(
        collection(db, "requests"),
        where("postId",        "==", postId),
        where("senderUserId", "==", senderUserId),
        where("status",        "==", "accepted")
    ));
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as JoinRequest;
}

export async function getPendingRequestId(
    postId: string,
    senderUserId: string
): Promise<string | null> {
    const snap = await getDocs(query(
        collection(db, "requests"),
        where("postId",        "==", postId),
        where("senderUserId", "==", senderUserId),
        where("status",        "==", "pending")
    ));
    if (snap.empty) return null;
    return snap.docs[0].id;
}

// ── Block ──────────────────────────────────────────────────

export async function blockUser(
    currentUserId: string,
    targetUserId: string,
    targetUserName: string
): Promise<void> {
    const existing = await getDocs(query(
        collection(db, "blocks"),
        where("blockedBy",     "==", currentUserId),
        where("blockedUserId", "==", targetUserId)
    ));
    if (!existing.empty) return;
    await addDoc(collection(db, "blocks"), {
        blockedBy: currentUserId,
        blockedUserId: targetUserId,
        blockedUserName: targetUserName,
        createdAt: serverTimestamp(),
    });
}

export async function isUserBlocked(
    currentUserId: string,
    targetUserId: string
): Promise<boolean> {
    const snap = await getDocs(query(
        collection(db, "blocks"),
        where("blockedBy",     "==", currentUserId),
        where("blockedUserId", "==", targetUserId)
    ));
    return !snap.empty;
}

// ── Report ─────────────────────────────────────────────────

export async function reportUser(
    reportedBy: string,
    reportedUserId: string,
    reportedUserName: string,
    postId: string,
    reason: ReportReason
): Promise<void> {
    const existing = await getDocs(query(
        collection(db, "reports"),
        where("reportedBy", "==", reportedBy),
        where("postId",     "==", postId)
    ));
    if (!existing.empty) return;
    await addDoc(collection(db, "reports"), {
        reportedBy,
        reportedUserId,
        reportedUserName,
        postId,
        reason,
        createdAt: serverTimestamp(),
    });
}

// ── Interactions / Trust ───────────────────────────────────

export async function saveInteraction(
    userId: string,
    otherUserId: string,
    postId: string,
    met: boolean,
    positive: boolean,
    review?: string,
    authorName?: string
): Promise<void> {
    const existing = await getDocs(query(
        collection(db, "interactions"),
        where("userId", "==", userId),
        where("postId", "==", postId)
    ));
    if (!existing.empty) {
        await updateDoc(doc(db, "interactions", existing.docs[0].id), {
            met,
            positive,
            ...(review     ? { review }     : {}),
            ...(authorName ? { authorName } : {}),
        });
        return;
    }
    await addDoc(collection(db, "interactions"), {
        userId,
        otherUserId,
        postId,
        met,
        positive,
        authorName: authorName ?? "Anonymous",
        ...(review ? { review } : {}),
        createdAt: serverTimestamp(),
    });
}

export async function getTrustScore(userId: string): Promise<TrustScore> {
    const snap = await getDocs(query(
        collection(db, "interactions"),
        where("otherUserId", "==", userId),
        where("met",         "==", true)
    ));
    const metCount      = snap.size;
    const positiveCount = snap.docs.filter((d) => d.data().positive === true).length;
    return { metCount, positiveCount };
}

/** Returns all public reviews written ABOUT a user */
export async function getReviews(userId: string): Promise<Review[]> {
    const snap = await getDocs(query(
        collection(db, "interactions"),
        where("otherUserId", "==", userId),
        where("met",         "==", true)
    ));
    return snap.docs
        .filter((d) => !!d.data().review)
        .map((d) => ({
            id:          d.id,
            authorId:    d.data().userId     ?? "",
            authorName:  d.data().authorName ?? "Anonymous",
            otherUserId: d.data().otherUserId,
            text:        d.data().review,
            positive:    d.data().positive   ?? false,
            met:         d.data().met        ?? true,
            createdAt:   d.data().createdAt  ?? null,
        } as Review))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
}