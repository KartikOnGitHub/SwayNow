"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    collection, addDoc, query, where, orderBy,
    onSnapshot, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { blockUser, reportUser, saveInteraction, ReportReason } from "@/lib/requests";
import { buildMessageNotif } from "@/lib/notifications";

interface Message {
    id: string;
    chatId: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: Timestamp | null;
}

export default function ChatPage() {
    const params   = useParams<{ chatId: string }>();
    const router   = useRouter();
    const chatId   = params?.chatId ?? "";

    // chatId = "{postId}_{senderUserId}"
    const underscoreIdx = chatId.lastIndexOf("_");
    const postId        = chatId.slice(0, underscoreIdx);
    const senderUserId  = chatId.slice(underscoreIdx + 1);

    const [user, setUser]               = useState<User | null>(null);
    const [loading, setLoading]         = useState(true);
    const [authorized, setAuthorized]   = useState(false);
    const [otherUserId, setOtherUserId] = useState("");
    const [otherName, setOtherName]     = useState("User");
    const [messages, setMessages]       = useState<Message[]>([]);
    const [text, setText]               = useState("");
    const [sending, setSending]         = useState(false);

    const [showMenu, setShowMenu]         = useState(false);
    const [showReport, setShowReport]     = useState(false);
    const [reportReason, setReportReason] = useState<ReportReason>("spam");
    const [actionMsg, setActionMsg]       = useState("");
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackDone, setFeedbackDone] = useState(false);
    const [reviewText, setReviewText]     = useState("");

    const bottomRef = useRef<HTMLDivElement>(null);

    // ── Auth ─────────────────────────────────────────────────
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
            if (!u) router.push("/");
        });
        return () => unsub();
    }, [router]);

    // ── Verify access via accepted request ───────────────────
    useEffect(() => {
        if (!user) return;

        const verify = async () => {
            const { getDocs, query: q2, where: w } = await import("firebase/firestore");

            const snap = await getDocs(q2(
                collection(db, "requests"),
                w("postId",        "==", postId),
                w("senderUserId",  "==", senderUserId),
                w("status",        "==", "accepted")
            ));

            if (snap.empty) { router.push("/"); return; }

            const req = snap.docs[0].data();

            // current user must be one of the two participants
            if (user.uid === senderUserId) {
                setOtherUserId(req.receiverUserId);
            } else if (user.uid === req.receiverUserId) {
                setOtherUserId(senderUserId);
            } else {
                router.push("/"); return;
            }

            setAuthorized(true);
        };

        verify();
    }, [user, postId, senderUserId, router]);

    // ── Live messages — keyed by chatId field ────────────────
    useEffect(() => {
        if (!authorized) return;

        const q = query(
            collection(db, "messages"),
            where("chatId", "==", chatId),
            orderBy("createdAt", "asc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
            setMessages(msgs);

            // Pick up the other person's name from their messages
            const other = msgs.find((m) => m.senderId !== user?.uid);
            if (other) setOtherName(other.senderName);

            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        });

        return () => unsub();
    }, [authorized, chatId, user]);

    // ── Send ─────────────────────────────────────────────────
    const handleSend = async () => {
        if (!user || !text.trim() || sending) return;
        setSending(true);
        try {
            await addDoc(collection(db, "messages"), {
                chatId,                               // ← key field for querying
                senderId:   user.uid,
                senderName: user.displayName ?? "Anonymous",
                text:       text.trim(),
                createdAt:  serverTimestamp(),
            });
            setText("");
        } finally {
            setSending(false);
        }
    };

    // ── Safety actions ───────────────────────────────────────
    const handleBlock = async () => {
        if (!user) return;
        await blockUser(user.uid, otherUserId, otherName);
        setActionMsg(`${otherName} blocked.`);
        setShowMenu(false);
    };

    const handleReport = async () => {
        if (!user) return;
        await reportUser(user.uid, otherUserId, otherName, postId, reportReason);
        setActionMsg("Report submitted.");
        setShowReport(false);
    };

    const handleFeedback = async (met: boolean, positive: boolean) => {
        if (!user) return;
        await saveInteraction(user.uid, otherUserId, postId, met, positive, reviewText.trim() || undefined, user.displayName ?? "Anonymous");
        setFeedbackDone(true);
        setTimeout(() => setShowFeedback(false), 1500);
    };

    // ── Render ───────────────────────────────────────────────
    if (loading || !authorized) return (
        <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
        </main>
    );

    return (
        <main className="flex flex-col h-screen bg-[#0a0a0a] text-white">

            {/* Header */}
            <header className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/60 bg-[#0a0a0a]/90 backdrop-blur shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/")} className="text-neutral-500 hover:text-white text-sm">←</button>
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold">
                        {otherName[0]?.toUpperCase()}
                    </div>
                    <button
                        onClick={() => router.push(`/profile/${otherUserId}`)}
                        className="font-medium text-sm hover:text-neutral-300 transition-colors"
                    >
                        {otherName}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFeedback(true)}
                        className="text-xs text-neutral-500 hover:text-white border border-neutral-800 rounded-lg px-2 py-1 transition-colors"
                    >
                        ⭐ Feedback
                    </button>
                    <div className="relative">
                        <button onClick={() => setShowMenu((v) => !v)} className="text-neutral-500 hover:text-white px-2 text-lg">⋯</button>
                        {showMenu && (
                            <div className="absolute right-0 top-9 bg-[#1c1c1c] border border-neutral-800 rounded-xl overflow-hidden shadow-xl z-20 min-w-[140px]">
                                <button onClick={() => { setShowReport(true); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-3 text-sm text-amber-400 hover:bg-neutral-800">
                                    🚩 Report
                                </button>
                                <button onClick={handleBlock}
                                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-neutral-800 border-t border-neutral-800">
                                    🚫 Block
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {actionMsg && (
                <div className="bg-neutral-800 text-neutral-300 text-xs text-center py-2">{actionMsg}</div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && (
                    <div className="text-center py-20 space-y-2">
                        <p className="text-2xl">💬</p>
                        <p className="text-neutral-600 text-sm">Request accepted — say hi!</p>
                    </div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    const time = msg.createdAt
                        ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "";
                    return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className="max-w-[75%] space-y-1">
                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                    isMe
                                        ? "bg-white text-black rounded-br-sm"
                                        : "bg-[#1c1c1c] border border-neutral-800 text-neutral-200 rounded-bl-sm"
                                }`}>
                                    {msg.text}
                                </div>
                                <p className={`text-xs text-neutral-700 px-1 ${isMe ? "text-right" : "text-left"}`}>{time}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-neutral-800/60 px-4 py-3 bg-[#0a0a0a] flex gap-3 items-end">
        <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message…"
            rows={1}
            maxLength={500}
            className="flex-1 bg-[#141414] border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-neutral-600 resize-none transition-colors"
        />
                <button
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-40 shrink-0"
                >
                    {sending ? "…" : "Send"}
                </button>
            </div>

            {/* Report modal */}
            {showReport && (
                <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-30 p-4" onClick={() => setShowReport(false)}>
                    <div className="bg-[#1c1c1c] border border-neutral-800 rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h2 className="font-semibold text-sm">Report this user</h2>
                        <div className="space-y-2">
                            {(["spam", "harassment", "inappropriate", "other"] as ReportReason[]).map((r) => (
                                <button key={r} onClick={() => setReportReason(r)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-colors capitalize ${
                                            reportReason === r ? "border-white/30 bg-white/10 text-white" : "border-neutral-800 text-neutral-400 hover:border-neutral-600"
                                        }`}>{r}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleReport} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500">Submit</button>
                            <button onClick={() => setShowReport(false)} className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback modal */}
            {showFeedback && (
                <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-30 p-4" onClick={() => setShowFeedback(false)}>
                    <div className="bg-[#1c1c1c] border border-neutral-800 rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
                        {feedbackDone ? (
                            <div className="text-center py-4 space-y-2">
                                <p className="text-2xl">✅</p>
                                <p className="text-sm text-neutral-300">Thanks for your feedback!</p>
                            </div>
                        ) : (
                            <>
                                <h2 className="font-semibold text-sm">How did it go with {otherName}?</h2>
                                <p className="text-xs text-neutral-500">Your review will be visible on their profile.</p>
                                {/* Review text */}
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder={`Write 1–2 lines about ${otherName}… (optional)`}
                                    maxLength={160}
                                    rows={2}
                                    className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-600 outline-none focus:border-white/20 resize-none transition-colors"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleFeedback(true, true)}
                                            className="py-3 rounded-xl border border-emerald-800/50 bg-emerald-900/20 text-emerald-400 text-sm font-medium hover:bg-emerald-900/40 transition-colors">
                                        ✅ Met & great
                                    </button>
                                    <button onClick={() => handleFeedback(true, false)}
                                            className="py-3 rounded-xl border border-amber-800/50 bg-amber-900/20 text-amber-400 text-sm font-medium hover:bg-amber-900/40 transition-colors">
                                        ⚠️ Met, not great
                                    </button>
                                    <button onClick={() => handleFeedback(false, false)}
                                            className="col-span-2 py-3 rounded-xl border border-neutral-800 text-neutral-500 text-sm font-medium hover:border-neutral-600 transition-colors">
                                        Didn&apos;t meet
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}