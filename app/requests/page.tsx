"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { acceptRequest, rejectRequest, JoinRequest } from "@/lib/requests";
import { buildAcceptedNotif } from "@/lib/notifications";

export default function RequestsPage() {
    const router = useRouter();
    const [user, setUser]       = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState<JoinRequest[]>([]);
    const [accepted, setAccepted] = useState<JoinRequest[]>([]);
    const [acting, setActing]   = useState<string | null>(null);
    const [tab, setTab]         = useState<"requests" | "chats">("requests");

    // Auth — only redirect AFTER loading is done
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setLoading(false);
            if (!u) {
                router.push("/");
                return;
            }
            setUser(u);
        });
        return () => unsub();
    }, [router]);

    // Pending requests sent TO me
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, "requests"),
            where("receiverUserId", "==", user.uid),
            where("status", "==", "pending")
        );
        return onSnapshot(q, (snap) => {
            setPending(
                snap.docs
                    .map((d) => ({ id: d.id, ...d.data() } as JoinRequest))
                    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
            );
        });
    }, [user]);

    // Accepted chats — I am receiver
    useEffect(() => {
        if (!user) return;
        const q1 = query(collection(db, "requests"), where("receiverUserId", "==", user.uid), where("status", "==", "accepted"));
        const q2 = query(collection(db, "requests"), where("senderUserId",   "==", user.uid), where("status", "==", "accepted"));

        const unsub1 = onSnapshot(q1, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JoinRequest));
            setAccepted((prev) => {
                const asSender = prev.filter((r) => r.senderUserId === user.uid);
                const ids = new Set(asSender.map((r) => r.id));
                return [...asSender, ...data.filter((r) => !ids.has(r.id))];
            });
        });
        const unsub2 = onSnapshot(q2, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JoinRequest));
            setAccepted((prev) => {
                const asReceiver = prev.filter((r) => r.receiverUserId === user.uid);
                const ids = new Set(asReceiver.map((r) => r.id));
                return [...asReceiver, ...data.filter((r) => !ids.has(r.id))];
            });
        });
        return () => { unsub1(); unsub2(); };
    }, [user]);

    const handleAccept = async (req: JoinRequest) => {
        setActing(req.id);
        try {
            await acceptRequest(req.id);
            buildAcceptedNotif(
                req.senderUserId,
                req.receiverUserId,
                user?.displayName ?? "Someone",
                req.postId,
                req.senderUserId,
            ).catch(console.warn);
            router.push(`/chat/${req.postId}_${req.senderUserId}`);
        } finally { setActing(null); }
    };

    const handleReject = async (req: JoinRequest) => {
        setActing(req.id);
        try { await rejectRequest(req.id); }
        finally { setActing(null); }
    };

    const openChat = (req: JoinRequest) => {
        router.push(`/chat/${req.postId}_${req.senderUserId}`);
    };

    const getOtherName = (req: JoinRequest): string => {
        if (!user) return "User";
        if (user.uid === req.senderUserId) return req.receiverUserName ?? "User";
        return req.senderUserName ?? "User";
    };

    const fmt = (ts: Timestamp | null) =>
        ts ? new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

    // Show spinner while auth loads — never redirect prematurely
    if (loading) return (
        <main className="flex min-h-screen items-center justify-center bg-[#0B0B0F]">
            <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </main>
    );

    if (!user) return null;

    return (
        <main className="min-h-screen bg-[#0B0B0F] text-white">
            <header className="sticky top-0 z-10 bg-[#0B0B0F]/90 backdrop-blur-md border-b border-white/[0.06]">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => router.back()} style={{ minHeight: 36 }}
                            className="text-sm text-[#A1A1AA] hover:text-white transition-colors">
                        ← Back
                    </button>
                    <h1 className="text-base font-semibold">Inbox</h1>
                    {pending.length > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
                    )}
                </div>
                <div className="flex px-4 gap-1 border-t border-white/[0.04]">
                    {(["requests", "chats"] as const).map((t) => (
                        <button key={t} onClick={() => setTab(t)}
                                className={`px-4 py-2.5 text-sm font-medium border-b-2 capitalize transition-colors whitespace-nowrap ${
                                    tab === t ? "border-blue-500 text-white" : "border-transparent text-[#52525B] hover:text-[#A1A1AA]"
                                }`}>
                            {t === "requests"
                                ? `📬 Requests${pending.length > 0 ? ` (${pending.length})` : ""}`
                                : `💬 Chats${accepted.length > 0 ? ` (${accepted.length})` : ""}`}
                        </button>
                    ))}
                </div>
            </header>

            <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

                {tab === "requests" && (
                    <>
                        {pending.length === 0 && (
                            <div className="text-center py-20 space-y-3">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-2xl">📬</div>
                                <p className="text-white font-semibold">No pending requests</p>
                                <p className="text-sm text-[#A1A1AA]">When someone wants to join your post, they appear here</p>
                            </div>
                        )}
                        {pending.map((req) => (
                            <div key={req.id} className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-base font-semibold text-white shrink-0">
                                        {req.senderUserName?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-semibold text-white">{req.senderUserName}</p>
                                        <p className="text-xs text-[#A1A1AA]">wants to join · {fmt(req.createdAt)}</p>
                                    </div>
                                </div>
                                {req.postText && (
                                    <div className="bg-[#0B0B0F] border border-white/[0.04] rounded-xl px-3 py-2.5">
                                        <p className="text-xs text-[#A1A1AA] leading-relaxed line-clamp-2">
                                            &quot;{req.postText}&quot;
                                        </p>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={() => handleAccept(req)} disabled={acting === req.id}
                                            style={{ minHeight: 48 }}
                                            className="flex-1 rounded-2xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {acting === req.id
                                            ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                            : "✓ Accept"}
                                    </button>
                                    <button onClick={() => handleReject(req)} disabled={acting === req.id}
                                            style={{ minHeight: 48 }}
                                            className="flex-1 rounded-2xl border border-white/10 text-[#A1A1AA] text-sm font-medium hover:border-white/20 hover:text-white active:scale-[0.98] transition-all disabled:opacity-50">
                                        ✕ Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {tab === "chats" && (
                    <>
                        {accepted.length === 0 && (
                            <div className="text-center py-20 space-y-3">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-2xl">💬</div>
                                <p className="text-white font-semibold">No active chats</p>
                                <p className="text-sm text-[#A1A1AA]">Accepted requests appear here</p>
                            </div>
                        )}
                        {accepted.map((req) => {
                            const otherName = getOtherName(req);
                            return (
                                <button key={req.id} onClick={() => openChat(req)}
                                        style={{ minHeight: 72 }}
                                        className="w-full bg-[#111118] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3 hover:border-white/15 active:scale-[0.99] transition-all text-left">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-base font-semibold text-white shrink-0">
                                        {otherName[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-semibold text-white">{otherName}</p>
                                        <p className="text-xs text-[#A1A1AA] truncate mt-0.5">Re: {req.postText}</p>
                                    </div>
                                    <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full font-semibold shrink-0">
                    Active
                  </span>
                                </button>
                            );
                        })}
                    </>
                )}
            </div>
        </main>
    );
}