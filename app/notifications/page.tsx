"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { acceptRequest, rejectRequest, JoinRequest } from "@/lib/requests";
import { buildAcceptedNotif } from "@/lib/notifications";

interface AcceptedRequest extends JoinRequest {
    id: string;
}

export default function RequestsPage() {
    const router = useRouter();
    const [user, setUser]               = useState<User | null>(null);
    const [loading, setLoading]         = useState(true);
    const [pending, setPending]         = useState<JoinRequest[]>([]);
    const [accepted, setAccepted]       = useState<AcceptedRequest[]>([]);
    const [acting, setActing]           = useState<string | null>(null);
    const [tab, setTab]                 = useState<"requests" | "chats">("requests");

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u); setLoading(false);
            if (!u) router.push("/");
        });
        return () => unsub();
    }, [router]);

    // Pending requests sent TO me (I am the post creator)
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, "requests"),
            where("receiverUserId", "==", user.uid),
            where("status", "==", "pending")
        );
        const unsub = onSnapshot(q, (snap) => {
            setPending(
                snap.docs
                    .map((d) => ({ id: d.id, ...d.data() } as JoinRequest))
                    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
            );
        });
        return () => unsub();
    }, [user]);

    // Accepted requests — both sides (I sent OR I received)
    useEffect(() => {
        if (!user) return;

        // As receiver
        const q1 = query(
            collection(db, "requests"),
            where("receiverUserId", "==", user.uid),
            where("status", "==", "accepted")
        );
        // As sender
        const q2 = query(
            collection(db, "requests"),
            where("senderUserId", "==", user.uid),
            where("status", "==", "accepted")
        );

        const unsub1 = onSnapshot(q1, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AcceptedRequest));
            setAccepted((prev) => {
                const fromSender = prev.filter((r) => r.senderUserId === user.uid);
                return [...fromSender, ...data];
            });
        });
        const unsub2 = onSnapshot(q2, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AcceptedRequest));
            setAccepted((prev) => {
                const fromReceiver = prev.filter((r) => r.receiverUserId === user.uid);
                return [...fromReceiver, ...data];
            });
        });

        return () => { unsub1(); unsub2(); };
    }, [user]);

    const handleAccept = async (req: JoinRequest) => {
        setActing(req.id);
        try {
            await acceptRequest(req.id);
            // Notify the sender their request was accepted
            buildAcceptedNotif(
                req.senderUserId,
                req.receiverUserId,
                user?.displayName ?? "Someone",
                req.postId,
                req.senderUserId,
            ).catch(console.warn);
            const chatId = `${req.postId}_${req.senderUserId}`;
            router.push(`/chat/${chatId}`);
        } finally { setActing(null); }
    };

    const handleReject = async (req: JoinRequest) => {
        setActing(req.id);
        try { await rejectRequest(req.id); }
        finally { setActing(null); }
    };

    const openChat = (req: AcceptedRequest) => {
        const chatId = `${req.postId}_${req.senderUserId}`;
        router.push(`/chat/${chatId}`);
    };

    const getOtherName = (req: AcceptedRequest) => {
        if (!user) return "User";
        return user.uid === req.senderUserId ? req.senderUserName : req.senderUserName;
    };

    const fmt = (ts: Timestamp | null) =>
        ts ? new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

    if (loading) return (
        <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
        </main>
    );

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-neutral-800/60 bg-[#0a0a0a]/90 backdrop-blur">
                <div className="flex items-center gap-3 px-5 py-4">
                    <button onClick={() => router.push("/")} className="text-neutral-500 hover:text-white text-sm transition-colors">← Back</button>
                    <h1 className="text-lg font-bold">Inbox</h1>
                    {pending.length > 0 && (
                        <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex px-5 gap-1">
                    {(["requests", "chats"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                                tab === t ? "border-white text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"
                            }`}
                        >
                            {t === "requests" ? `📬 Requests${pending.length > 0 ? ` (${pending.length})` : ""}` : `💬 Chats${accepted.length > 0 ? ` (${accepted.length})` : ""}`}
                        </button>
                    ))}
                </div>
            </header>

            <div className="max-w-xl mx-auto px-4 py-6 space-y-3">

                {/* ── Requests tab ── */}
                {tab === "requests" && (
                    <>
                        {pending.length === 0 && (
                            <div className="text-center py-20 space-y-2">
                                <p className="text-3xl">📬</p>
                                <p className="text-neutral-500 text-sm">No pending requests</p>
                                <p className="text-neutral-700 text-xs">When someone wants to join your post, it appears here</p>
                            </div>
                        )}
                        {pending.map((req) => (
                            <div key={req.id} className="bg-[#141414] border border-neutral-800 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-300 shrink-0">
                                        {req.senderUserName[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{req.senderUserName}</p>
                                        <p className="text-xs text-neutral-600">wants to join · {fmt(req.createdAt)}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-neutral-500 bg-neutral-900 rounded-xl px-3 py-2 border border-neutral-800 leading-relaxed">
                                    &quot;{req.postText}{req.postText?.length >= 120 ? "…" : ""}&quot;
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAccept(req)}
                                        disabled={acting === req.id}
                                        className="flex-1 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                    >
                                        {acting === req.id ? "…" : "✓ Accept"}
                                    </button>
                                    <button
                                        onClick={() => handleReject(req)}
                                        disabled={acting === req.id}
                                        className="flex-1 py-2 rounded-xl border border-neutral-700 text-neutral-400 text-sm font-medium hover:border-neutral-500 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                        {acting === req.id ? "…" : "✕ Reject"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* ── Chats tab ── */}
                {tab === "chats" && (
                    <>
                        {accepted.length === 0 && (
                            <div className="text-center py-20 space-y-2">
                                <p className="text-3xl">💬</p>
                                <p className="text-neutral-500 text-sm">No active chats yet</p>
                                <p className="text-neutral-700 text-xs">Accepted requests will appear here</p>
                            </div>
                        )}
                        {accepted.map((req) => (
                            <button
                                key={req.id}
                                onClick={() => openChat(req)}
                                className="w-full bg-[#141414] border border-neutral-800 rounded-2xl p-4 flex items-center gap-3 hover:border-neutral-600 transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-300 shrink-0">
                                    {req.senderUserName[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold">{req.senderUserName}</p>
                                    <p className="text-xs text-neutral-600 truncate">Re: {req.postText}</p>
                                </div>
                                <span className="text-neutral-600 text-lg">→</span>
                            </button>
                        ))}
                    </>
                )}

            </div>
        </main>
    );
}