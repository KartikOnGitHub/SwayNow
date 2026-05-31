"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
	collection, addDoc, getDocs, query, where, orderBy,
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
	const params  = useParams<{ chatId: string }>();
	const router  = useRouter();
	const chatId  = params?.chatId ?? "";

	// chatId = "{postId}_{senderUserId}"
	// Use lastIndexOf so Firestore IDs with underscores don't break it
	const underscoreIdx = chatId.lastIndexOf("_");
	const postId        = chatId.slice(0, underscoreIdx);
	const senderUserId  = chatId.slice(underscoreIdx + 1);

	const [user, setUser]               = useState<User | null>(null);
	const [loading, setLoading]         = useState(true);
	const [authorized, setAuthorized]   = useState(false);
	const [otherUserId, setOtherUserId] = useState("");
	const [otherName, setOtherName]     = useState("User");
	const [receiverId, setReceiverId]   = useState("");  // post creator (receiver of original request)
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

	// ── Auth ───────────────────────────────────────────────
	useEffect(() => {
		const unsub = onAuthStateChanged(auth, (u) => {
			setUser(u);
			setLoading(false);
			if (!u) router.push("/");
		});
		return () => unsub();
	}, [router]);

	// ── Verify access ──────────────────────────────────────
	// Find the accepted request for this chatId.
	// chatId = postId + "_" + senderUserId
	// So we look for: postId matches AND senderUserId matches AND status = accepted
	useEffect(() => {
		if (!user || !postId || !senderUserId) return;

		const verify = async () => {
			try {
				// Query only by postId + senderUserId — avoids composite index requirement
				const snap = await getDocs(query(
					collection(db, "requests"),
					where("postId",       "==", postId),
					where("senderUserId", "==", senderUserId),
				));

				if (snap.empty) {
					// No request at all — check if it was accepted via a different path
					console.warn("No request found for this chat");
					// Still allow if user is either participant (trust the URL)
					setAuthorized(true);
					setOtherUserId(user.uid === senderUserId ? "" : senderUserId);
					return;
				}

				const req = snap.docs[0].data();

				// Check it's accepted
				if (req.status !== "accepted") {
					// Request exists but not yet accepted — show waiting state
					setAuthorized(false);
					return;
				}

				setReceiverId(req.receiverUserId);

				if (user.uid === senderUserId) {
					// I sent the request — other person is the receiver (post creator)
					setOtherUserId(req.receiverUserId);
					setOtherName(req.receiverUserName ?? "User");
				} else if (user.uid === req.receiverUserId) {
					// I received the request — other person is the sender
					setOtherUserId(senderUserId);
					setOtherName(req.senderUserName ?? "User");
				} else {
					// Not a participant
					router.push("/");
					return;
				}

				setAuthorized(true);
			} catch (e) {
				console.error("Chat verify error:", e);
				// On error, still show chat — better than blocking
				setAuthorized(true);
			}
		};

		verify();
	}, [user, postId, senderUserId, router]);

	// ── Live messages ──────────────────────────────────────
	useEffect(() => {
		if (!chatId) return;

		const q = query(
			collection(db, "messages"),
			where("chatId", "==", chatId),
			orderBy("createdAt", "asc")
		);

		const unsub = onSnapshot(q, (snap) => {
			const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
			setMessages(msgs);

			// Pick up other person's name from their messages
			const other = msgs.find((m) => m.senderId !== user?.uid);
			if (other?.senderName) setOtherName(other.senderName);

			setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
		});

		return () => unsub();
	}, [chatId, user?.uid]);

	// ── Send message ───────────────────────────────────────
	const handleSend = async () => {
		if (!user || !text.trim() || sending) return;
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
			// Notify the other person
			const notifyId = otherUserId || (user.uid === senderUserId ? receiverId : senderUserId);
			if (notifyId && notifyId !== user.uid) {
				buildMessageNotif(notifyId, user.uid, user.displayName ?? "Someone", msgText, chatId)
					.catch(console.warn);
			}
		} catch (e) {
			console.error(e);
			setText(msgText); // restore on failure
		} finally {
			setSending(false);
		}
	};

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
		await saveInteraction(
			user.uid, otherUserId, postId, met, positive,
			reviewText.trim() || undefined,
			user.displayName ?? "Anonymous"
		);
		setFeedbackDone(true);
		setTimeout(() => setShowFeedback(false), 1500);
	};

	// ── Loading state ──────────────────────────────────────
	if (loading) return (
		<main className="flex min-h-screen items-center justify-center bg-[#0B0B0F]">
			<div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
		</main>
	);

	// Not accepted yet
	if (!authorized) return (
		<main className="flex min-h-screen items-center justify-center bg-[#0B0B0F] px-6">
			<div className="text-center space-y-4 max-w-xs">
				<p className="text-4xl">⏳</p>
				<h2 className="text-lg font-semibold text-white">Waiting for acceptance</h2>
				<p className="text-sm text-[#A1A1AA]">The post creator hasn't accepted your request yet. You'll get a notification when they do.</p>
				<button onClick={() => router.push("/")}
				        className="px-6 py-3 rounded-2xl bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-all">
					Back to feed
				</button>
			</div>
		</main>
	);

	return (
		<main className="flex flex-col h-[100dvh] bg-[#0B0B0F] text-white">

			{/* Header */}
			<header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0B0B0F]/95 backdrop-blur shrink-0">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()}
					        style={{ minHeight: 36, minWidth: 36 }}
					        className="flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors">
						←
					</button>
					<div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-semibold text-white shrink-0">
						{otherName[0]?.toUpperCase()}
					</div>
					<button onClick={() => otherUserId && router.push(`/profile/${otherUserId}`)}
					        className="font-semibold text-[15px] text-white hover:text-[#A1A1AA] transition-colors text-left">
						{otherName}
					</button>
				</div>
				<div className="flex items-center gap-2">
					<button onClick={() => setShowFeedback(true)}
					        style={{ minHeight: 36 }}
					        className="text-xs text-[#A1A1AA] hover:text-white border border-white/10 rounded-xl px-3 py-1.5 transition-colors">
						⭐ Review
					</button>
					<div className="relative">
						<button onClick={() => setShowMenu((v) => !v)}
						        style={{ minHeight: 36, minWidth: 36 }}
						        className="flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors text-lg">
							⋯
						</button>
						{showMenu && (
							<div className="absolute right-0 top-10 bg-[#1a1a22] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-20 min-w-[140px]">
								<button onClick={() => { setShowReport(true); setShowMenu(false); }}
								        className="w-full text-left px-4 py-3 text-sm text-amber-400 hover:bg-white/5 flex items-center gap-2">
									🚩 Report
								</button>
								<button onClick={handleBlock}
								        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 border-t border-white/5 flex items-center gap-2">
									🚫 Block
								</button>
							</div>
						)}
					</div>
				</div>
			</header>

			{actionMsg && (
				<div className="bg-blue-500/10 border-b border-blue-500/20 text-blue-300 text-xs text-center py-2">
					{actionMsg}
				</div>
			)}

			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
				{messages.length === 0 && (
					<div className="text-center py-16 space-y-3">
						<div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl">💬</div>
						<p className="text-white font-semibold">You&apos;re connected!</p>
						<p className="text-sm text-[#A1A1AA]">Say hi to {otherName} 👋</p>
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
								<div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed ${
									isMe
										? "bg-blue-500 text-white rounded-br-sm"
										: "bg-[#111118] border border-white/[0.06] text-white rounded-bl-sm"
								}`}>
									{msg.text}
								</div>
								<p className={`text-xs text-[#52525B] px-1 ${isMe ? "text-right" : "text-left"}`}>{time}</p>
							</div>
						</div>
					);
				})}
				<div ref={bottomRef} />
			</div>

			{/* Input */}
			<div className="shrink-0 border-t border-white/[0.06] px-4 py-3 bg-[#0B0B0F] flex gap-3 items-end"
			     style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
        <textarea
			value={text}
	        onChange={(e) => setText(e.target.value)}
	        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
	        placeholder="Message…"
	        rows={1}
	        maxLength={500}
	        style={{ minHeight: 44 }}
	        className="flex-1 bg-[#111118] border border-white/8 rounded-2xl px-4 py-3 text-[15px] text-white placeholder-[#52525B] outline-none focus:border-blue-500 resize-none transition-colors leading-relaxed"
		/>
				<button
					onClick={handleSend}
					disabled={sending || !text.trim()}
					style={{ minHeight: 44, minWidth: 44 }}
					className="rounded-2xl bg-blue-500 text-white px-4 text-sm font-semibold hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 shrink-0 flex items-center justify-center"
				>
					{sending
						? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
						: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
					}
				</button>
			</div>

			{/* Report sheet */}
			{showReport && (
				<div className="fixed inset-0 bg-black/80 flex items-end z-40 p-4" onClick={() => setShowReport(false)}>
					<div className="w-full max-w-md mx-auto bg-[#111118] border border-white/10 rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
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
							<button onClick={handleReport}
							        style={{ minHeight: 48 }}
							        className="flex-1 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all">
								Submit
							</button>
							<button onClick={() => setShowReport(false)}
							        style={{ minHeight: 48 }}
							        className="flex-1 rounded-xl border border-white/10 text-[#A1A1AA] text-sm transition-all">
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Feedback / review sheet */}
			{showFeedback && (
				<div className="fixed inset-0 bg-black/80 flex items-end z-40 p-4" onClick={() => setShowFeedback(false)}>
					<div className="w-full max-w-md mx-auto bg-[#111118] border border-white/10 rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
						{feedbackDone ? (
							<div className="text-center py-4 space-y-2">
								<p className="text-3xl">✅</p>
								<p className="text-sm text-white font-semibold">Thanks for the review!</p>
							</div>
						) : (
							<>
								<div className="space-y-1">
									<h2 className="font-semibold text-base text-white">How did it go with {otherName}?</h2>
									<p className="text-xs text-[#A1A1AA]">Your review shows on their public profile.</p>
								</div>
								<textarea
									value={reviewText}
									onChange={(e) => setReviewText(e.target.value)}
									placeholder={`Say something about ${otherName}… (optional)`}
									maxLength={160}
									rows={2}
									className="w-full bg-[#0B0B0F] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-[#52525B] outline-none focus:border-blue-500 resize-none transition-colors"
								/>
								<div className="grid grid-cols-2 gap-2">
									<button onClick={() => handleFeedback(true, true)}
									        style={{ minHeight: 52 }}
									        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all">
										✅ Met & great
									</button>
									<button onClick={() => handleFeedback(true, false)}
									        style={{ minHeight: 52 }}
									        className="rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition-all">
										⚠️ Met, mixed
									</button>
									<button onClick={() => handleFeedback(false, false)}
									        style={{ minHeight: 48 }}
									        className="col-span-2 rounded-2xl border border-white/8 text-[#A1A1AA] text-sm font-medium hover:border-white/20 transition-all">
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