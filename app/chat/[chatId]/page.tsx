"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
	collection, addDoc, query, where, orderBy,
	onSnapshot, serverTimestamp, Timestamp, getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { blockUser, reportUser, saveInteraction, ReportReason, isUserBlocked } from "@/lib/requests";
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
	const params = useParams<{ chatId: string }>();
	const router = useRouter();
	const chatId = params?.chatId ?? "";

	const underscoreIdx = chatId.lastIndexOf("_");
	const postId       = chatId.slice(0, underscoreIdx);
	const senderUserId = chatId.slice(underscoreIdx + 1);

	const [user, setUser]               = useState<User | null>(null);
	const [ready, setReady]             = useState(false); // true when auth + verify both done
	const [otherUserId, setOtherUserId] = useState("");
	const [otherName, setOtherName]     = useState("");
	const [messages, setMessages]       = useState<Message[]>([]);
	const [text, setText]               = useState("");
	const [sending, setSending]         = useState(false);
	const [isBlocked, setIsBlocked]     = useState(false);
	const [showMenu, setShowMenu]       = useState(false);
	const [showReport, setShowReport]   = useState(false);
	const [reportReason, setReportReason] = useState<ReportReason>("spam");
	const [actionMsg, setActionMsg]     = useState("");
	const [showFeedback, setShowFeedback] = useState(false);
	const [feedbackDone, setFeedbackDone] = useState(false);
	const [reviewText, setReviewText]   = useState("");
	const bottomRef = useRef<HTMLDivElement>(null);

	// Single effect — uses authStateReady so mobile session is fully loaded first
	useEffect(() => {
		auth.authStateReady().then(async () => {
			const u = auth.currentUser;
			if (!u) { router.push("/app"); return; }
			setUser(u);

			// Now verify immediately while we have the user
			try {
				const snap = await getDocs(query(
					collection(db, "requests"),
					where("postId",       "==", postId),
					where("senderUserId", "==", senderUserId),
				));

				if (!snap.empty) {
					const req = snap.docs[0].data();
					if (u.uid === senderUserId) {
						// I sent the request — other person is post creator
						setOtherUserId(req.receiverUserId ?? "");
						setOtherName(req.receiverUserName || req.receiverUserId?.slice(0,6) || "");
					} else {
						// I am the post creator — other person is the sender
						setOtherUserId(senderUserId);
						setOtherName(req.senderUserName || senderUserId.slice(0,6) || "");
					}
				} else {
					// No request found — set other user based on URL
					if (u.uid === senderUserId) {
						setOtherUserId(""); // receiver unknown without request doc
					} else {
						setOtherUserId(senderUserId);
					}
				}
			} catch (e) {
				console.error("Verify error:", e);
			}

			// Check if either party has blocked the other
			if (u && auth.currentUser) {
				const blocked = await isUserBlocked(u.uid, otherUserId || senderUserId).catch(() => false);
				setIsBlocked(blocked as boolean);
			}

			setReady(true);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [postId, senderUserId]);

	// Messages listener — starts once chatId is available
	useEffect(() => {
		if (!chatId || !ready) return;

		const q = query(
			collection(db, "messages"),
			where("chatId", "==", chatId),
			orderBy("createdAt", "asc")
		);

		const unsub = onSnapshot(q, (snap) => {
			const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
			setMessages(msgs);

			// Fill in other name from messages if still missing
			const other = msgs.find((m) => m.senderId !== user?.uid);
			if (other?.senderName && !otherName) setOtherName(other.senderName);

			setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
		}, (err) => {
			console.error("Messages error:", err);
			if (err.message?.includes("index")) {
				setActionMsg("Index missing — check Firebase Console");
			}
		});

		return () => unsub();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [chatId, ready]);

	const handleSend = async () => {
		if (!user || !text.trim() || sending || isBlocked) return;
		setSending(true);
		const msgText = text.trim();
		setText("");
		try {
			await addDoc(collection(db, "messages"), {
				chatId,
				senderId:   user.uid,
				senderName: user.displayName ?? "Anonymous",
				text:       msgText,
				createdAt:  serverTimestamp(),
			});
			const notifyId = otherUserId;
			if (notifyId && notifyId !== user.uid) {
				buildMessageNotif(notifyId, user.uid, user.displayName ?? "Someone", msgText, chatId)
					.catch(console.warn);
			}
		} catch (e) {
			console.error(e);
			setText(msgText);
		} finally {
			setSending(false);
		}
	};

	const handleBlock = async () => {
		if (!user || !otherUserId) return;
		await blockUser(user.uid, otherUserId, otherName || "User");
		setIsBlocked(true);
		setActionMsg("User blocked. They can no longer message you.");
		setShowMenu(false);
	};

	const handleReport = async () => {
		if (!user) return;
		try {
			await reportUser(user.uid, otherUserId, otherName || "User", postId, reportReason);
			setActionMsg("✓ Report submitted. Our team will review this.");
			setShowReport(false);
			setTimeout(() => setActionMsg(""), 4000);
		} catch (e) {
			console.error(e);
			setActionMsg("Report failed — please try again.");
		}
	};

	const handleFeedback = async (met: boolean, positive: boolean) => {
		if (!user || !otherUserId) return;
		await saveInteraction(user.uid, otherUserId, postId, met, positive,
			reviewText.trim() || undefined, user.displayName ?? "Anonymous");
		setFeedbackDone(true);
		setTimeout(() => setShowFeedback(false), 1500);
	};

	if (!ready) return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-[#0B0B0F] gap-3">
			<div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
			<p className="text-xs text-[#52525B]">Loading chat…</p>
		</main>
	);

	const displayName = otherName || "Chat";

	return (
		<main className="flex flex-col h-[100dvh] bg-[#0B0B0F] text-white">
			{/* Header */}
			<header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0B0B0F]/95 backdrop-blur shrink-0">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()}
					        style={{ minHeight: 36, minWidth: 36 }}
					        className="flex items-center justify-center text-[#A1A1AA] hover:text-white text-lg">
						←
					</button>
					<div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
						{displayName[0]?.toUpperCase() || "?"}
					</div>
					<button onClick={() => otherUserId && router.push(`/profile/${otherUserId}`)}
					        className="font-semibold text-[15px] text-white hover:text-[#A1A1AA] transition-colors">
						{displayName}
					</button>
				</div>
				<div className="flex items-center gap-1">
					<button onClick={() => setShowFeedback(true)}
					        style={{ minHeight: 36 }}
					        className="text-xs text-[#A1A1AA] hover:text-white border border-white/10 rounded-xl px-3 py-1.5 transition-colors">
						⭐ Review
					</button>
					<div className="relative">
						<button onClick={() => setShowMenu(v => !v)}
						        style={{ minHeight: 36, minWidth: 36 }}
						        className="flex items-center justify-center text-[#A1A1AA] hover:text-white text-xl">⋯</button>
						{showMenu && (
							<div className="absolute right-0 top-10 bg-[#1a1a22] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-20 min-w-[140px]">
								<button onClick={() => { setShowReport(true); setShowMenu(false); }}
								        className="w-full text-left px-4 py-3 text-sm text-amber-400 hover:bg-white/5">🚩 Report</button>
								<button onClick={handleBlock}
								        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 border-t border-white/5">🚫 Block</button>
							</div>
						)}
					</div>
				</div>
			</header>

			{actionMsg && (
				<div className="bg-blue-500/10 border-b border-blue-500/20 text-blue-300 text-xs text-center py-2 px-4 shrink-0">
					{actionMsg}
				</div>
			)}

			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
				{messages.length === 0 && (
					<div className="text-center py-16 space-y-3">
						<div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl">💬</div>
						<p className="text-white font-semibold">You&apos;re connected!</p>
						<p className="text-sm text-[#A1A1AA]">Say hi to {displayName} 👋</p>
					</div>
				)}
				{messages.map((msg) => {
					const isMe = msg.senderId === user?.uid;
					const time = msg.createdAt
						? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
						: "";
					return (
						<div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
							<div className="max-w-[78%] space-y-1">
								<div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed break-words ${
									isMe ? "bg-blue-500 text-white rounded-br-sm"
										: "bg-[#111118] border border-white/[0.06] text-white rounded-bl-sm"
								}`}>{msg.text}</div>
								<p className={`text-xs text-[#52525B] px-1 ${isMe ? "text-right" : "text-left"}`}>
									{isMe ? "You" : (msg.senderName || displayName)} · {time}
								</p>
							</div>
						</div>
					);
				})}
				<div ref={bottomRef} />
			</div>

			{/* Input — disabled if blocked */}
			{isBlocked ? (
				<div className="shrink-0 border-t border-white/[0.06] px-4 py-4 bg-[#0B0B0F] text-center"
				     style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
					<p className="text-sm text-[#52525B]">🚫 You have blocked this user</p>
					<button
						onClick={async () => {
							if (!user || !otherUserId) return;
							const { unblockUser } = await import("@/lib/requests");
							await unblockUser(user.uid, otherUserId);
							setIsBlocked(false);
							setActionMsg("User unblocked.");
						}}
						className="mt-2 text-xs text-blue-400 underline hover:text-blue-300 transition-colors"
					>
						Unblock to send messages
					</button>
				</div>
			) : (
				<div className="shrink-0 border-t border-white/[0.06] px-4 py-3 bg-[#0B0B0F] flex gap-3 items-end"
				     style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <textarea
			  value={text}
	          onChange={(e) => setText(e.target.value)}
	          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
	          placeholder={`Message ${displayName}…`}
	          rows={1} maxLength={500}
	          style={{ minHeight: 44 }}
	          className="flex-1 bg-[#111118] border border-white/8 rounded-2xl px-4 py-3 text-[15px] text-white placeholder-[#52525B] outline-none focus:border-blue-500 resize-none transition-colors leading-relaxed"
		  />
					<button onClick={handleSend} disabled={sending || !text.trim()}
					        style={{ minHeight: 44, minWidth: 44 }}
					        className="rounded-2xl bg-blue-500 text-white px-4 font-semibold hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 shrink-0 flex items-center justify-center">
						{sending
							? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
							: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
						}
					</button>
				</div>
			)}

			{/* Report sheet */}
			{showReport && (
				<div className="fixed inset-0 bg-black/80 flex items-end z-40 p-4" onClick={() => setShowReport(false)}>
					<div className="w-full max-w-md mx-auto bg-[#111118] border border-white/10 rounded-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
						<h2 className="font-semibold text-base text-white">Report this user</h2>
						<div className="grid grid-cols-2 gap-2">
							{(["spam","harassment","inappropriate","other"] as ReportReason[]).map((r) => (
								<button key={r} onClick={() => setReportReason(r)}
								        style={{ minHeight: 44 }}
								        className={`rounded-xl text-sm font-medium border capitalize transition-all ${
											reportReason === r ? "border-blue-500 bg-blue-500/10 text-white" : "border-white/8 text-[#A1A1AA]"
										}`}>{r}</button>
							))}
						</div>
						<div className="flex gap-2">
							<button onClick={handleReport} style={{ minHeight: 48 }}
							        className="flex-1 rounded-xl bg-red-500 text-white text-sm font-semibold">Submit</button>
							<button onClick={() => setShowReport(false)} style={{ minHeight: 48 }}
							        className="flex-1 rounded-xl border border-white/10 text-[#A1A1AA] text-sm">Cancel</button>
						</div>
					</div>
				</div>
			)}

			{/* Feedback sheet */}
			{showFeedback && (
				<div className="fixed inset-0 bg-black/80 flex items-end z-40 p-4" onClick={() => setShowFeedback(false)}>
					<div className="w-full max-w-md mx-auto bg-[#111118] border border-white/10 rounded-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
						{feedbackDone ? (
							<div className="text-center py-4 space-y-2">
								<p className="text-3xl">✅</p>
								<p className="text-sm text-white font-semibold">Thanks for the review!</p>
							</div>
						) : (
							<>
								<div className="space-y-1">
									<h2 className="font-semibold text-base text-white">How did it go?</h2>
									<p className="text-xs text-[#A1A1AA]">Your review shows on their public profile.</p>
								</div>
								<textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
								          placeholder="Say something… (optional)" maxLength={160} rows={2}
								          className="w-full bg-[#0B0B0F] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-[#52525B] outline-none focus:border-blue-500 resize-none transition-colors" />
								<div className="grid grid-cols-2 gap-2">
									<button onClick={() => handleFeedback(true, true)} style={{ minHeight: 52 }}
									        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-semibold">
										✅ Met & great
									</button>
									<button onClick={() => handleFeedback(true, false)} style={{ minHeight: 52 }}
									        className="rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-semibold">
										⚠️ Met, mixed
									</button>
									<button onClick={() => handleFeedback(false, false)} style={{ minHeight: 48 }}
									        className="col-span-2 rounded-2xl border border-white/8 text-[#A1A1AA] text-sm font-medium">
										Didn&apos;t meet up
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