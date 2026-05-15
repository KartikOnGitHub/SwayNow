import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { app, db } from "./firebase";

// 🔧 Get this from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
export const VAPID_KEY = "BOQ6a79v23DyfrGRV9VrpnMzsTFtsxZV_6jrMAnCy6ar21nNz8bFnmTEkpNZ_9WmrqI3S6S0zhbnWr7JC51DRLc";

export type NotifType =
    | "join_request"
    | "request_accepted"
    | "request_rejected"
    | "new_message";

export interface SwayNotification {
    toUserId: string;
    fromUserId: string;
    fromUserName: string;
    type: NotifType;
    title: string;
    body: string;
    data?: Record<string, string>;
    createdAt: ReturnType<typeof serverTimestamp>;
    read: boolean;
}

// ── Request permission + save FCM token ──────────────────

export async function requestNotificationPermission(userId: string): Promise<boolean> {
    try {
        if (!("Notification" in window)) return false;
        if (Notification.permission === "denied") return false;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return false;

        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });

        if (token) {
            // Save token to Firestore under the user
            await setDoc(doc(db, "fcm_tokens", userId), {
                token,
                userId,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            return true;
        }
        return false;
    } catch (e) {
        console.warn("FCM permission error:", e);
        return false;
    }
}

// ── Listen for foreground messages ───────────────────────

export function onForegroundMessage(callback: (payload: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, string>;
}) => void) {
    try {
        const messaging = getMessaging(app);
        return onMessage(messaging, (payload) => {
            callback({
                title: payload.notification?.title ?? "SwayNow",
                body: payload.notification?.body ?? "",
                type: payload.data?.type ?? "general",
                data: payload.data as Record<string, string>,
            });
        });
    } catch {
        return () => {};
    }
}

// ── Save notification to Firestore ────────────────────────
// (A Cloud Function would send push, but we store in Firestore
//  as a reliable fallback + in-app notification center)

export async function saveNotification(notif: Omit<SwayNotification, "createdAt" | "read">) {
    await addDoc(collection(db, "notifications"), {
        ...notif,
        createdAt: serverTimestamp(),
        read: false,
    });
}

// ── Notification builders ─────────────────────────────────

export function buildJoinRequestNotif(
    toUserId: string,
    fromUserId: string,
    fromUserName: string,
    postText: string,
    postId: string,
) {
    return saveNotification({
        toUserId,
        fromUserId,
        fromUserName,
        type: "join_request",
        title: `${fromUserName} wants to join`,
        body: `"${postText.slice(0, 60)}${postText.length > 60 ? "…" : ""}"`,
        data: { type: "join_request", postId },
    });
}

export function buildAcceptedNotif(
    toUserId: string,
    fromUserId: string,
    fromUserName: string,
    postId: string,
    senderUserId: string,
) {
    const chatId = `${postId}_${senderUserId}`;
    return saveNotification({
        toUserId,
        fromUserId,
        fromUserName,
        type: "request_accepted",
        title: "Request accepted! 🎉",
        body: `${fromUserName} accepted your request. Say hi!`,
        data: { type: "request_accepted", chatId },
    });
}

export function buildMessageNotif(
    toUserId: string,
    fromUserId: string,
    fromUserName: string,
    messageText: string,
    chatId: string,
) {
    return saveNotification({
        toUserId,
        fromUserId,
        fromUserName,
        type: "new_message",
        title: fromUserName,
        body: messageText.slice(0, 80),
        data: { type: "new_message", chatId },
    });
}