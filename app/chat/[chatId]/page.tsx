"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
	collection, query, where, orderBy,
	onSnapshot, updateDoc, doc, Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface Notif {
	id: string;
	type: string;
	title: string;
	body: string;
	read: boolean;
	data?: Record<string, string>;
	createdAt: Timestamp | null;
}

export default function NotificationsPage() {
	const router = useRouter();
	const [user, setUser]       = useState<User | null>(null);
	const [notifs, setNotifs]   = useState<Notif[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, (u) => {
			setUser(u);
			if (!u) router.push("/");
		});
		return () => unsub();
	}, [router]);

	useEffect(() => {
		if (!user) return;
		const q = query(
			collection(db, "notifications"),
			where("toUserId", "==", user.uid),
			orderBy("createdAt", "desc")
		);
		const unsub = onSnapshot(q, (snap) => {
			setNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notif)));
			setLoading(false);
		});
		return () => unsub();
	}, [user]);

	const markRead = async (id: string) => {
		await updateDoc(doc(db, "notifications", id), { read: true });
	};

	const handleTap = (notif: Notif) => {
		markRead(notif.id);
		if (notif.type === "join_request") router.push("/requests");
		else if (notif.data?.chatId) router.push(`/chat/${notif.data.chatId}`);
	};

	const fmt = (ts: Timestamp | null) => {
		if (!ts) return "";
		const diff = Date.now() - ts.toMillis();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return "just now";
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	};

	const iconForType = (type: string) => {
		if (type === "join_request") return "👋";
		if (type === "request_accepted") return "🎉";
		if (type === "new_message") return "💬";
		return "🔔";
	};

	const unreadCount = notifs.filter((n) => !n.read).length;

	return (
		<main className="min-h-screen bg-[#0B0B0F] text-white">
			<header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0B0B0F]/90 backdrop-blur-md">
				<button onClick={() => router.back()} className="text-sm text-[#A1A1AA] hover:text-white transition-colors px-2">← Back</button>
				<h1 className="text-base font-semibold">Notifications</h1>
				{unreadCount > 0 && (
					<span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
				)}
			</header>

			<div className="max-w-md mx-auto px-4 py-4 space-y-2">
				{loading && (
					<div className="flex justify-center py-16">
						<div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
					</div>
				)}

				{!loading && notifs.length === 0 && (
					<div className="text-center py-20 space-y-3">
						<div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-2xl">🔔</div>
						<p className="text-white font-semibold">No notifications yet</p>
						<p className="text-sm text-[#A1A1AA]">You'll get notified when someone joins your post or sends you a message</p>
					</div>
				)}

				{notifs.map((notif) => (
					<button key={notif.id} onClick={() => handleTap(notif)}
					        style={{ minHeight: 72 }}
					        className={`w-full flex items-start gap-3 rounded-2xl p-4 text-left active:scale-[0.99] transition-all border ${
								notif.read
									? "bg-[#111118] border-white/[0.04]"
									: "bg-blue-500/8 border-blue-500/20"
							}`}>
						<div className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center text-lg shrink-0 mt-0.5">
							{iconForType(notif.type)}
						</div>
						<div className="flex-1 min-w-0 space-y-0.5">
							<div className="flex items-start justify-between gap-2">
								<p className={`text-sm font-semibold ${notif.read ? "text-white" : "text-white"}`}>{notif.title}</p>
								<span className="text-xs text-[#52525B] shrink-0 mt-0.5">{fmt(notif.createdAt)}</span>
							</div>
							<p className="text-sm text-[#A1A1AA] leading-relaxed">{notif.body}</p>
						</div>
						{!notif.read && (
							<div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
						)}
					</button>
				))}
			</div>
		</main>
	);
}