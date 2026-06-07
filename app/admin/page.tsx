"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { banUser, unbanUser, adminDeletePost, resolveReport } from "@/lib/requests";

// ⚠️ PUT YOUR FIREBASE UID HERE. Find it: log into the app, open the
// browser console, and run:  firebase.auth().currentUser.uid
// — or just check the Users tab once and copy your own uid.
// Until you add it, the dashboard stays OPEN (so you can find your uid),
// but it will warn you. Add it and only you can access /admin.
const ADMIN_UIDS: string[] = ["879P4czSTUatdIdLYIFtMvYt2qE2"];

interface UserRow {
    uid: string; displayName: string; email: string; photoURL: string | null;
    bio?: string; banned?: boolean; bannedReason?: string;
    createdAt?: Timestamp | null; updatedAt?: Timestamp | null;
}
interface PostRow {
    id: string; text: string; userName: string; userId: string;
    city: string; intent: string; expiresAt?: Timestamp | null; createdAt?: Timestamp | null;
}
interface ReportRow {
    id: string; reportedBy: string; reportedUserId: string; reportedUserName?: string;
    reason: string; postId?: string; status?: string; createdAt?: Timestamp | null;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [allowed, setAllowed] = useState(false);
    const [gateMsg, setGateMsg] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [tab, setTab] = useState<"overview" | "reports" | "users" | "posts">("overview");

    const [users, setUsers] = useState<UserRow[]>([]);
    const [posts, setPosts] = useState<PostRow[]>([]);
    const [reports, setReports] = useState<ReportRow[]>([]);
    const [userSearch, setUserSearch] = useState("");

    useEffect(() => {
        auth.authStateReady().then(async () => {
            const u = auth.currentUser;
            if (!u) { router.push("/app"); return; }
            const isPlaceholder = ADMIN_UIDS.length === 0 || ADMIN_UIDS[0] === "YOUR_UID_HERE";
            if (!isPlaceholder && !ADMIN_UIDS.includes(u.uid)) { router.push("/app"); return; }
            if (isPlaceholder) setGateMsg(`Dashboard is unprotected. Your UID is ${u.uid} — add it to ADMIN_UIDS in app/admin/page.tsx.`);
            setAllowed(true);
            await loadData();
            setLoading(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        try {
            const [usersSnap, postsSnap, reportsSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "posts")),
                getDocs(collection(db, "reports")),
            ]);
            setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserRow))
                .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0)));
            setPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PostRow))
                .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
            setReports(reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ReportRow))
                .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
        } catch (e) {
            console.error("Admin load error:", e);
        }
    };

    const fmt = (ts?: Timestamp | null) => {
        if (!ts) return "—";
        return new Date(ts.seconds * 1000).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    // ── Actions ──
    const doBan = async (uid: string, name: string) => {
        const reason = prompt(`Ban ${name}? This deletes all their posts. Optional reason:`);
        if (reason === null) return;
        setBusy(uid);
        try { await banUser(uid, reason); await loadData(); } catch (e) { console.error(e); alert("Ban failed."); }
        setBusy(null);
    };
    const doUnban = async (uid: string) => {
        setBusy(uid);
        try { await unbanUser(uid); await loadData(); } catch (e) { console.error(e); alert("Unban failed."); }
        setBusy(null);
    };
    const doDeletePost = async (id: string) => {
        if (!confirm("Delete this post?")) return;
        setBusy(id);
        try { await adminDeletePost(id); await loadData(); } catch (e) { console.error(e); alert("Delete failed."); }
        setBusy(null);
    };
    const doResolve = async (id: string) => {
        setBusy(id);
        try { await resolveReport(id); await loadData(); } catch (e) { console.error(e); alert("Failed."); }
        setBusy(null);
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

    const openReports = reports.filter((r) => r.status !== "resolved");
    const activePosts = posts.filter((p) => p.expiresAt && p.expiresAt.toMillis() > Date.now());
    const bannedCount = users.filter((u) => u.banned).length;
    const filteredUsers = users.filter((u) =>
        !userSearch ||
        u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.uid.includes(userSearch)
    );

    return (
        <main className="min-h-screen bg-[#0B0B0F] text-white pb-20">
            <header className="sticky top-0 z-20 flex items-center justify-between px-5 py-4 bg-[#0B0B0F]/90 backdrop-blur-md border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/app")} className="text-sm text-[#A1A1AA] hover:text-white transition-colors">← App</button>
                    <div className="w-px h-4 bg-white/10" />
                    <h1 className="text-base font-bold">SwayNow Admin</h1>
                </div>
                <button onClick={loadData} className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl transition-colors">↻ Refresh</button>
            </header>

            {gateMsg && (
                <div className="mx-5 mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-300 break-all">
                    ⚠️ {gateMsg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 px-5 py-3 overflow-x-auto">
                {([["overview","Overview"],["reports",`Reports${openReports.length?` (${openReports.length})`:""}`],["users","Users"],["posts","Posts"]] as const).map(([k,label]) => (
                    <button key={k} onClick={() => setTab(k)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab===k ? "bg-blue-500 text-white" : "bg-[#111118] text-[#A1A1AA] hover:text-white"}`}>
                        {label}
                    </button>
                ))}
            </div>

            <div className="px-5">
                {/* OVERVIEW */}
                {tab === "overview" && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        {[
                            ["Total users", users.length],
                            ["Banned", bannedCount],
                            ["Total posts", posts.length],
                            ["Active now", activePosts.length],
                            ["Open reports", openReports.length],
                            ["Total reports", reports.length],
                        ].map(([label, val]) => (
                            <div key={label as string} className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4">
                                <p className="text-2xl font-bold">{val as number}</p>
                                <p className="text-xs text-[#A1A1AA] mt-1">{label as string}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* REPORTS */}
                {tab === "reports" && (
                    <div className="space-y-3 mt-2">
                        {reports.length === 0 && <p className="text-sm text-[#A1A1AA] text-center py-10">No reports. 🎉</p>}
                        {reports.map((rep) => (
                            <div key={rep.id} className={`rounded-2xl p-4 border ${rep.status==="resolved" ? "bg-[#0d0d12] border-white/[0.04] opacity-60" : "bg-[#111118] border-amber-500/20"}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold">
                                            Reported: {rep.reportedUserName || rep.reportedUserId?.slice(0,8) || "Unknown"}
                                        </p>
                                        <p className="text-xs text-amber-400 mt-0.5 capitalize">Reason: {rep.reason}</p>
                                        <p className="text-xs text-[#52525B] mt-1 break-all">User ID: {rep.reportedUserId}</p>
                                        <p className="text-xs text-[#52525B]">{fmt(rep.createdAt)} {rep.status==="resolved" && "· ✓ resolved"}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button disabled={busy===rep.reportedUserId}
                                            onClick={() => doBan(rep.reportedUserId, rep.reportedUserName || "this user")}
                                            className="flex-1 text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25 rounded-lg py-2 hover:bg-red-500/25 transition-colors disabled:opacity-40">
                                        🔨 Ban user
                                    </button>
                                    <button onClick={() => { setUserSearch(rep.reportedUserId); setTab("users"); }}
                                            className="flex-1 text-xs font-semibold bg-white/5 text-white border border-white/10 rounded-lg py-2 hover:bg-white/10 transition-colors">
                                        View user
                                    </button>
                                    {rep.status !== "resolved" && (
                                        <button disabled={busy===rep.id} onClick={() => doResolve(rep.id)}
                                                className="flex-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg py-2 hover:bg-emerald-500/20 transition-colors disabled:opacity-40">
                                            ✓ Resolve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* USERS */}
                {tab === "users" && (
                    <div className="space-y-3 mt-2">
                        <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                               placeholder="Search name, email, or user ID…"
                               className="w-full rounded-xl bg-[#111118] border border-white/[0.08] px-4 py-2.5 text-sm text-white placeholder-[#52525B] focus:border-blue-500/50 focus:outline-none" />
                        <p className="text-xs text-[#52525B]">{filteredUsers.length} user{filteredUsers.length!==1?"s":""}</p>
                        {filteredUsers.map((u) => (
                            <div key={u.uid} className={`rounded-2xl p-4 border ${u.banned ? "bg-red-500/5 border-red-500/20" : "bg-[#111118] border-white/[0.06]"}`}>
                                <div className="flex items-center gap-3">
                                    {u.photoURL
                                        ? <img src={u.photoURL} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
                                        : <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold">{(u.displayName||"?")[0]}</div>}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold flex items-center gap-2">
                                            {u.displayName || "Anonymous"}
                                            {u.banned && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">BANNED</span>}
                                        </p>
                                        <p className="text-xs text-[#52525B] truncate">{u.email}</p>
                                    </div>
                                </div>
                                {u.bio && <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">{u.bio}</p>}
                                <p className="text-[10px] text-[#52525B] mt-2 break-all">UID: {u.uid}</p>
                                <p className="text-[10px] text-[#52525B]">Joined {fmt(u.createdAt)}</p>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => router.push(`/profile/${u.uid}`)}
                                            className="flex-1 text-xs font-semibold bg-white/5 text-white border border-white/10 rounded-lg py-2 hover:bg-white/10 transition-colors">
                                        View profile
                                    </button>
                                    {u.banned ? (
                                        <button disabled={busy===u.uid} onClick={() => doUnban(u.uid)}
                                                className="flex-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg py-2 hover:bg-emerald-500/20 transition-colors disabled:opacity-40">
                                            Unban
                                        </button>
                                    ) : (
                                        <button disabled={busy===u.uid} onClick={() => doBan(u.uid, u.displayName || "this user")}
                                                className="flex-1 text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25 rounded-lg py-2 hover:bg-red-500/25 transition-colors disabled:opacity-40">
                                            🔨 Ban
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* POSTS */}
                {tab === "posts" && (
                    <div className="space-y-3 mt-2">
                        <p className="text-xs text-[#52525B]">{posts.length} posts total · {activePosts.length} active</p>
                        {posts.map((p) => {
                            const active = p.expiresAt && p.expiresAt.toMillis() > Date.now();
                            return (
                                <div key={p.id} className="rounded-2xl p-4 border bg-[#111118] border-white/[0.06]">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold">{p.userName || "Anonymous"}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-[#52525B]"}`}>
                      {active ? "active" : "expired"}
                    </span>
                                    </div>
                                    <p className="text-xs text-[#A1A1AA] mt-1">{p.intent} · {p.city}</p>
                                    <p className="text-sm text-white mt-2 leading-relaxed">{p.text}</p>
                                    <p className="text-[10px] text-[#52525B] mt-2">{fmt(p.createdAt)}</p>
                                    <button disabled={busy===p.id} onClick={() => doDeletePost(p.id)}
                                            className="w-full mt-3 text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25 rounded-lg py-2 hover:bg-red-500/25 transition-colors disabled:opacity-40">
                                        🗑️ Delete post
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}