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
    receiverUserName?: string;   // post creator's name — stored on create
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
    receiverUserId: string,
    receiverUserName?: string
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
        receiverUserName: receiverUserName ?? "",
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

// Checks if EITHER user blocked the other — used in chat to fully prevent messaging
export async function isBlockedEitherWay(
    userA: string,
    userB: string
): Promise<{ blocked: boolean; iBlockedThem: boolean; theyBlockedMe: boolean }> {
    const [aBlockedB, bBlockedA] = await Promise.all([
        getDocs(query(collection(db, "blocks"),
            where("blockedBy", "==", userA), where("blockedUserId", "==", userB))),
        getDocs(query(collection(db, "blocks"),
            where("blockedBy", "==", userB), where("blockedUserId", "==", userA))),
    ]);
    const iBlockedThem = !aBlockedB.empty;
    const theyBlockedMe = !bBlockedA.empty;
    return { blocked: iBlockedThem || theyBlockedMe, iBlockedThem, theyBlockedMe };
}

export async function unblockUser(
    currentUserId: string,
    targetUserId: string
): Promise<void> {
    const snap = await getDocs(query(
        collection(db, "blocks"),
        where("blockedBy",     "==", currentUserId),
        where("blockedUserId", "==", targetUserId)
    ));
    for (const d of snap.docs) {
        const { deleteDoc, doc: docRef } = await import("firebase/firestore");
        await deleteDoc(docRef(db, "blocks", d.id));
    }
}

export async function getBlockedUserIds(currentUserId: string): Promise<string[]> {
    const snap = await getDocs(query(
        collection(db, "blocks"),
        where("blockedBy", "==", currentUserId)
    ));
    return snap.docs.map((d) => d.data().blockedUserId as string);
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

export async function getTrustScore(userId: string): Promise<TrustScore> {  const snap = await getDocs(query(
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

// ── Edit / delete your own review ──────────────────────────
// A review is the `review` field on an interaction doc the user authored.

/** Delete the current user's review (the interaction stays, only the review text is removed). */
export async function deleteReview(reviewId: string, currentUserId: string): Promise<void> {
    const { deleteField } = await import("firebase/firestore");
    const ref = doc(db, "interactions", reviewId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    if (snap.data().userId !== currentUserId) throw new Error("Not your review");
    await updateDoc(ref, { review: deleteField() });
}

/** Edit the current user's review text. */
export async function editReview(reviewId: string, currentUserId: string, newText: string): Promise<void> {
    const ref = doc(db, "interactions", reviewId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    if (snap.data().userId !== currentUserId) throw new Error("Not your review");
    await updateDoc(ref, { review: newText.trim() });
}

// ── Delete your own post ───────────────────────────────────
export async function deletePost(postId: string, currentUserId: string): Promise<void> {
    const ref = doc(db, "posts", postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    if (snap.data().userId !== currentUserId) throw new Error("Not your post");
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(ref);
}

// ── Admin moderation ───────────────────────────────────────

/** Ban a user: marks their user doc as banned and deletes all their active posts. */
export async function banUser(targetUserId: string, reason: string): Promise<void> {
    const { serverTimestamp, writeBatch } = await import("firebase/firestore");
    // Mark user as banned
    await updateDoc(doc(db, "users", targetUserId), {
        banned: true,
        bannedReason: reason || "Violation of community guidelines",
        bannedAt: serverTimestamp(),
    });
    // Delete all their posts
    const theirPosts = await getDocs(query(collection(db, "posts"), where("userId", "==", targetUserId)));
    if (!theirPosts.empty) {
        const batch = writeBatch(db);
        theirPosts.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
}

/** Lift a ban. */
export async function unbanUser(targetUserId: string): Promise<void> {
    const { deleteField } = await import("firebase/firestore");
    await updateDoc(doc(db, "users", targetUserId), {
        banned: false,
        bannedReason: deleteField(),
        bannedAt: deleteField(),
    });
}

/** Admin: delete any post regardless of owner. */
export async function adminDeletePost(postId: string): Promise<void> {
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "posts", postId));
}

/** Mark a report as reviewed/resolved. */
export async function resolveReport(reportId: string): Promise<void> {
    const { serverTimestamp } = await import("firebase/firestore");
    await updateDoc(doc(db, "reports", reportId), {
        status: "resolved",
        resolvedAt: serverTimestamp(),
    });
}