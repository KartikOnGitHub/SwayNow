"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection, getDocs, query, orderBy,
    where, Timestamp, limit,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// 🔧 Add your Firebase UID here to protect the dashboard
const ADMIN_UIDS = ["879P4czSTUatdIdLYIFtMvYt2qE2"];

interface Stats {
    totalUsers: number;
    totalPosts: number;
    activePosts: number;
    totalRequests: number;
    acceptedRequests: number;
    totalMessages: number;
    totalMeetups: number;
    positiveMeetups: number;
    totalReports: number;
    last24hUsers: number;
    last24hPosts: number;
    last24hRequests: number;
}

interface RecentUser {
    uid: string;
    displayName: string;
    email: string;
    createdAt: Timestamp | null;
}

interface RecentPost {
    id: string;
    text: string;
    userName: string;
    city: string;
    intent: string;
    createdAt: Timestamp | null;
}

interface CityCount {
    city: string;
    count: number;
}

export default function AdminDashboard() {
    const router  = useRouter();
    const [allowed, setAllowed]     = useState(false);
    const [loading, setLoading]     = useState(true);
    const [stats, setStats]         = useState<Stats | null>(null);
    const [recentUsers, setRecentUsers]   = useState<RecentUser[]>([]);
    const [recentPosts, setRecentPosts]   = useState<RecentPost[]>([]);
    const [topCities, setTopCities]       = useState<CityCount[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | "users" | "posts" | "cities">("overview");

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u) { router.push("/"); return; }
            // Check if admin
            if (!ADMIN_UIDS.includes(u.uid) && ADMIN_UIDS[0] !== "YOUR_UID_HERE") {
                router.push("/");
                return;
            }
            setAllowed(true);
            await loadData();
            setLoading(false);
        });
        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        const now = Date.now();
        const yesterday = new Date(now - 24 * 60 * 60 * 1000);

        try {
            const [
                usersSnap, postsSnap, requestsSnap,
                messagesSnap, interactionsSnap, reportsSnap,
            ] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "posts")),
                getDocs(collection(db, "requests")),
                getDocs(collection(db, "messages")),
                getDocs(collection(db, "interactions")),
                getDocs(collection(db, "reports")),
            ]);

            const posts      = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as RecentPost[];
            const requests   = requestsSnap.docs.map((d) => d.data());
            const interactions = interactionsSnap.docs.map((d) => d.data());

            // Active posts (not expired)
            const activePosts = posts.filter((p: any) => {
                if (!p.expiresAt) return false;
                return p.expiresAt.toMillis() > now;
            }).length;

            // Last 24h
            const last24hPosts = posts.filter((p: any) =>
                p.createdAt?.toMillis() > yesterday.getTime()
            ).length;

            const last24hRequests = requests.filter((r: any) =>
                r.createdAt?.toMillis() > yesterday.getTime()
            ).length;

            const usersData = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as RecentUser[];
            const last24hUsers = usersData.filter((u: any) =>
                u.createdAt?.toMillis() > yesterday.getTime() ||
                u.updatedAt?.toMillis() > yesterday.getTime()
            ).length;

            setStats({
                totalUsers:       usersSnap.size,
                totalPosts:       postsSnap.size,
                activePosts,
                totalRequests:    requestsSnap.size,
                acceptedRequests: requests.filter((r: any) => r.status === "accepted").length,
                totalMessages:    messagesSnap.size,
                totalMeetups:     interactions.filter((i: any) => i.met === true).length,
                positiveMeetups:  interactions.filter((i: any) => i.positive === true).length,
                totalReports:     reportsSnap.size,
                last24hUsers,
                last24hPosts,
                last24hRequests,
            });

            // Recent users
            setRecentUsers(
                usersData
                    .sort((a: any, b: any) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0))
                    .slice(0, 20)
            );

            // Recent posts
            setRecentPosts(
                posts
                    .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
                    .slice(0, 20)
            );

            // Top cities
            const cityMap: Record<string, number> = {};
            posts.forEach((p: any) => {
                if (p.city) cityMap[p.city] = (cityMap[p.city] ?? 0) + 1;
            });
            setTopCities(
                Object.entries(cityMap)
                    .map(([city, count]) => ({ city, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
            );
        } catch (e) {
            console.error("Admin load error:", e);
        }
    };

    const fmt = (ts: Timestamp | null | undefined) => {
        if (!ts) return "—";
        return new Date((ts as Timestamp).seconds * 1000).toLocaleDateString([], {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        });
    };

    if (loading) return (
        <main className="flex min-h-screen items-center justify-center bg-[#0B0B0F]">
            <div className="space-y-3 text-center">
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-[#A1A1AA]">Loading dashboard…</p>
            </div>
        </main>
    );

    if (!allowed) return null;

    const conversionRate = stats && stats.totalRequests > 0
        ? Math.round((stats.acceptedRequests / stats.totalRequests) * 100)
        : 0;

    const meetupRate = stats && stats.acceptedRequests > 0
        ? Math.round((stats.totalMeetups / stats.acceptedRequests) * 100)
        : 0;

    return (
        <main className="min-h-screen bg-[#0B0B0F] text-white">
            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center justify-between px-5 py-4 bg-[#0B0B0F]/90 backdrop-blur-md border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/")} className="text-sm text-[#A1A1AA] hover:text-white transition-colors">← App</button>
                    <div className="w-px h-4 bg-white/10" />
                    <h1 className="text-base font-bold">SwayNow Admin</h1>
                </div>
                <button onClick={loadData} className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl transition-colors">
                    ↻ Refresh
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-4 border-b border-white/[0.04] overflow-x-auto">
                {(["overview", "users", "posts", "cities"] as const).map((t) => (
                    <button key={t} onClick={() => setActiveTab(t)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 capitalize transition-colors whitespace-nowrap ${
                                activeTab === t ? "border-blue-500 text-white" : "border-transparent text-[#52525B] hover:text-[#A1A1AA]"
                            }`}>
                        {t}
                    </button>
                ))}
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* ── Overview tab ── */}
                {activeTab === "overview" && stats && (
                    <>
                        {/* Key health metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: "Total Users",    value: stats.totalUsers,       sub: `+${stats.last24hUsers} today`,    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
                                { label: "Total Posts",    value: stats.totalPosts,       sub: `+${stats.last24hPosts} today`,    color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
                                { label: "Active Posts",   value: stats.activePosts,      sub: "right now",                       color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                                { label: "Real Meetups",   value: stats.totalMeetups,     sub: `${stats.positiveMeetups} positive`, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                            ].map((s) => (
                                <div key={s.label} className={`${s.bg} border rounded-2xl p-4 space-y-1`}>
                                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                    <p className="text-xs font-semibold text-white">{s.label}</p>
                                    <p className="text-xs text-[#52525B]">{s.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Funnel */}
                        <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <h2 className="text-sm font-semibold text-white">Conversion Funnel</h2>
                            <div className="space-y-3">
                                {[
                                    { label: "Posts created",   value: stats.totalPosts,       pct: 100,          color: "bg-blue-500" },
                                    { label: "Join requests",   value: stats.totalRequests,    pct: stats.totalPosts > 0 ? Math.round((stats.totalRequests / stats.totalPosts) * 100) : 0, color: "bg-purple-500" },
                                    { label: "Accepted chats",  value: stats.acceptedRequests, pct: conversionRate, color: "bg-emerald-500" },
                                    { label: "Real meetups",    value: stats.totalMeetups,     pct: meetupRate,    color: "bg-amber-500" },
                                ].map((row) => (
                                    <div key={row.label} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-[#A1A1AA]">{row.label}</span>
                                            <span className="text-white font-semibold">{row.value} <span className="text-[#52525B] font-normal">({row.pct}%)</span></span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${Math.min(row.pct, 100)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Secondary stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                                { label: "Total Messages",    value: stats.totalMessages },
                                { label: "Accept Rate",        value: `${conversionRate}%` },
                                { label: "Meetup Rate",        value: `${meetupRate}%` },
                                { label: "Requests today",    value: stats.last24hRequests },
                                { label: "Total Reports",     value: stats.totalReports },
                                { label: "Positive Meetups",  value: stats.positiveMeetups },
                            ].map((s) => (
                                <div key={s.label} className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 space-y-1">
                                    <p className="text-xl font-bold text-white">{s.value}</p>
                                    <p className="text-xs text-[#A1A1AA]">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* ── Users tab ── */}
                {activeTab === "users" && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-white">Recent Users ({recentUsers.length})</p>
                        </div>
                        {recentUsers.map((u) => (
                            <div key={u.uid} className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                                    {u.displayName?.[0]?.toUpperCase() ?? "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{u.displayName || "No name"}</p>
                                    <p className="text-xs text-[#A1A1AA] truncate">{u.email}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs text-[#52525B]">{fmt(u.createdAt)}</p>
                                    <p className="text-xs font-mono text-[#52525B] mt-0.5">{u.uid.slice(0, 8)}…</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Posts tab ── */}
                {activeTab === "posts" && (
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-white">Recent Posts ({recentPosts.length})</p>
                        {recentPosts.map((p) => (
                            <div key={p.id} className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{p.intent}</span>
                                        <span className="text-xs text-[#A1A1AA]">{p.city}</span>
                                    </div>
                                    <span className="text-xs text-[#52525B]">{fmt(p.createdAt)}</span>
                                </div>
                                <p className="text-sm text-white leading-relaxed">{p.text}</p>
                                <p className="text-xs text-[#52525B]">by {p.userName}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Cities tab ── */}
                {activeTab === "cities" && (
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-white">Top Cities by Posts</p>
                        {topCities.map((c, i) => (
                            <div key={c.city} className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4">
                                <span className="text-lg font-bold text-[#52525B] w-8">#{i + 1}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">{c.city}</p>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.count / topCities[0].count) * 100}%` }} />
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-white shrink-0">{c.count} posts</span>
                            </div>
                        ))}
                        {topCities.length === 0 && (
                            <div className="text-center py-12 text-[#A1A1AA] text-sm">No posts yet</div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}