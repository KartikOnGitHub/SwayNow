"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    GoogleAuthProvider, signInWithPopup, signOut,
    onAuthStateChanged, User,
} from "firebase/auth";
import {
    collection, addDoc, query, orderBy, where,
    onSnapshot, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { getDistanceKm, formatDistance } from "../../lib/distance";
import {
    sendJoinRequest, getAcceptedRequest, getPendingRequestId,
    blockUser, unblockUser, reportUser, getTrustScore, TrustScore, ReportReason, JoinRequest, getBlockedUserIds,
} from "../../lib/requests";
import { Duration, DURATIONS, getExpiresAt, isActive, timeRemaining, lifeFraction } from "../../lib/expiry";
import { requestNotificationPermission, onForegroundMessage } from "../../lib/notifications";
import { shareApp } from "../../lib/share";


// ── Types ──────────────────────────────────────────────────
type Intent = "Explore" | "Party" | "Chill" | "Study" | "Sports";
type NavTab = "feed" | "explore" | "post" | "chats" | "profile";

interface Post {
    id: string; text: string; intent: Intent;
    userId: string; userName: string;
    createdAt: Timestamp | null; expiresAt: Timestamp;
    latitude: number; longitude: number; city: string;
}
interface NearbyPost extends Post { distanceKm: number; }

// ── Constants ──────────────────────────────────────────────
const RADIUS_KM = 5;

const LOCATIONS: Record<string, string[]> = {
    "🇩🇪 Germany":["Berlin","Munich","Hamburg","Frankfurt","Cologne","Stuttgart","Düsseldorf"],
    "🇬🇧 UK":["London","Manchester","Edinburgh","Birmingham","Bristol","Glasgow","Liverpool"],
    "🇫🇷 France":["Paris","Lyon","Nice","Marseille","Bordeaux","Toulouse"],
    "🇳🇱 Netherlands":["Amsterdam","Rotterdam","The Hague","Utrecht","Eindhoven"],
    "🇪🇸 Spain":["Barcelona","Madrid","Ibiza","Valencia","Seville","Malaga"],
    "🇮🇹 Italy":["Rome","Milan","Florence","Venice","Naples","Turin"],
    "🇵🇹 Portugal":["Lisbon","Porto","Faro","Madeira"],
    "🇬🇷 Greece":["Athens","Mykonos","Santorini","Crete"],
    "🇨🇭 Switzerland":["Zurich","Geneva","Basel","Lausanne"],
    "🇦🇹 Austria":["Vienna","Salzburg","Innsbruck"],
    "🇸🇪 Sweden":["Stockholm","Gothenburg","Malmö"],
    "🇳🇴 Norway":["Oslo","Bergen","Tromsø"],
    "🇩🇰 Denmark":["Copenhagen","Aarhus"],
    "🇵🇱 Poland":["Warsaw","Kraków","Wrocław","Gdańsk"],
    "🇨🇿 Czechia":["Prague","Brno"],
    "🇭🇺 Hungary":["Budapest"],
    "🇹🇷 Turkey":["Istanbul","Antalya","Bodrum"],
    "🇺🇸 USA":["New York","Los Angeles","Miami","San Francisco","Chicago","Las Vegas","Austin","Seattle","Boston"],
    "🇨🇦 Canada":["Toronto","Vancouver","Montreal","Calgary"],
    "🇲🇽 Mexico":["Mexico City","Cancún","Tulum","Oaxaca"],
    "🇧🇷 Brazil":["São Paulo","Rio de Janeiro","Florianópolis"],
    "🇦🇷 Argentina":["Buenos Aires","Mendoza"],
    "🇨🇴 Colombia":["Bogotá","Medellín","Cartagena"],
    "🇯🇵 Japan":["Tokyo","Osaka","Kyoto","Sapporo"],
    "🇰🇷 South Korea":["Seoul","Busan","Jeju"],
    "🇨🇳 China":["Shanghai","Beijing","Chengdu"],
    "🇸🇬 Singapore":["Singapore"],
    "🇻🇳 Vietnam":["Hanoi","Ho Chi Minh City","Da Nang","Hoi An"],
    "🇹🇭 Thailand":["Bangkok","Chiang Mai","Phuket","Koh Samui"],
    "🇲🇾 Malaysia":["Kuala Lumpur","Penang"],
    "🇮🇩 Indonesia":["Bali","Jakarta","Yogyakarta","Lombok"],
    "🇵🇭 Philippines":["Manila","Cebu","Boracay","Palawan"],
    "🇮🇳 India":["Delhi","Mumbai","Bangalore","Goa","Jaipur","Chennai","Hyderabad","Kolkata","Pune"],
    "🇦🇪 UAE":["Dubai","Abu Dhabi"],
    "🇿🇦 South Africa":["Cape Town","Johannesburg"],
    "🇪🇬 Egypt":["Cairo","Hurghada","Sharm El-Sheikh"],
    "🇲🇦 Morocco":["Marrakech","Casablanca","Fes"],
    "🇦🇺 Australia":["Sydney","Melbourne","Brisbane","Perth"],
    "🇳🇿 New Zealand":["Auckland","Wellington","Queenstown"],
};

// Brand colour tokens (Primary blue #3B82F6)
const INTENTS: { value: Intent; emoji: string; label: string; tint: string; text: string }[] = [
    { value:"Explore", emoji:"🧭", label:"Explore", tint:"bg-sky-500/12 border-sky-500/25",       text:"text-sky-400" },
    { value:"Party",   emoji:"🎉", label:"Party",   tint:"bg-pink-500/12 border-pink-500/25",     text:"text-pink-400" },
    { value:"Chill",   emoji:"🌿", label:"Chill",   tint:"bg-emerald-500/12 border-emerald-500/25", text:"text-emerald-400" },
    { value:"Study",   emoji:"📚", label:"Study",   tint:"bg-amber-500/12 border-amber-500/25",   text:"text-amber-400" },
    { value:"Sports",  emoji:"⚡", label:"Sports",  tint:"bg-orange-500/12 border-orange-500/25", text:"text-orange-400" },
];
function getIntentStyle(v: Intent) { return INTENTS.find((i) => i.value === v) ?? INTENTS[0]; }

// ── Nav Icons ──────────────────────────────────────────────
const NavIcons = {
    feed: (filled?: boolean) => (
        <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="currentColor" strokeWidth={1.8}/>
        </svg>
    ),
    explore: (filled?: boolean) => (
        <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <circle cx="12" cy="12" r="10" fill="none"/>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
    ),
    post: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
    ),
    chats: (filled?: boolean) => (
        <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    ),
    profile: (filled?: boolean) => (
        <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4" fill={filled ? "currentColor" : "none"}/>
        </svg>
    ),
};

// ════════════════════════════════════════════════════════════
//  POST CARD — outside Home for stable identity
// ════════════════════════════════════════════════════════════

interface PostCardProps {
    post: NearbyPost;
    currentUserId: string;
    joinedPosts: Set<string>;
    actingPost: string | null;
    trustScores: Record<string, TrustScore>;
    reportingPost: string | null;
    reportReason: ReportReason;
    postActionMsg: Record<string, string>;
    acceptedPostIds: Set<string>;
    onJoin: (post: NearbyPost) => void;
    onBlock: (uid: string, name: string) => void;
    onReport: (postId: string, uid: string, name: string) => void;
    onSetReporting: (id: string | null) => void;
    onSetReportReason: (r: ReportReason) => void;
    onSetTrustScores: (fn: (prev: Record<string, TrustScore>) => Record<string, TrustScore>) => void;
    onNavigate: (path: string) => void;
}

function PostCard({
                      post, currentUserId, joinedPosts, actingPost, trustScores,
                      reportingPost, reportReason, postActionMsg, acceptedPostIds,
                      onJoin, onBlock, onReport, onSetReporting, onSetReportReason,
                      onSetTrustScores, onNavigate,
                  }: PostCardProps) {
    const style    = getIntentStyle(post.intent);
    const timeLeft = timeRemaining(post.expiresAt);
    const fraction = post.createdAt ? lifeFraction(post.createdAt, post.expiresAt) : 1;
    const isUrgent = fraction < 0.25;
    const isOwn    = currentUserId === post.userId;
    const hasJoined  = joinedPosts.has(post.id);
    const isAccepted = acceptedPostIds.has(post.id);
    const isActing  = actingPost === post.id;
    const trust     = trustScores[post.userId];

    // Profile photo (loaded once per user)
    const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
    const [authorAge, setAuthorAge]     = useState<number | null>(null);

    // "🔥 Happening now" if posted in last 30 minutes
    const ageMs       = post.createdAt ? Date.now() - post.createdAt.toMillis() : 0;
    const isHotNew    = ageMs > 0 && ageMs < 30 * 60 * 1000;

    useEffect(() => {
        if (trustScores[post.userId] !== undefined) return;
        getTrustScore(post.userId).then((s) =>
            onSetTrustScores((prev) => ({ ...prev, [post.userId]: s }))
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [post.userId]);

    // Load author profile photo + age once
    useEffect(() => {
        let cancelled = false;
        import("../../lib/profile").then(({ getUserProfile }) => {
            getUserProfile(post.userId).then((p) => {
                if (cancelled || !p) return;
                if (p.photoURL) setAuthorPhoto(p.photoURL);
                if (p.age) setAuthorAge(p.age);
            });
        });
        return () => { cancelled = true; };
    }, [post.userId]);

    return (
        <article className="bg-[#111118] rounded-2xl border border-white/[0.06] overflow-hidden transition-all active:scale-[0.99]">
            <div className="p-4 space-y-4">
                {/* Header — avatar, name, trust */}
                <header className="flex items-start justify-between gap-3">
                    <button
                        onClick={() => onNavigate(`/profile/${post.userId}`)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left -m-1 p-1 rounded-lg active:bg-white/5 transition-colors"
                    >
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-base font-semibold text-white shrink-0 overflow-hidden relative">
                            {authorPhoto ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={authorPhoto} alt={post.userName} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                post.userName[0]?.toUpperCase()
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[15px] font-medium text-white truncate">{post.userName}{authorAge ? `, ${authorAge}` : ""}</span>
                                {trust && trust.metCount > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                                        {trust.metCount}
                  </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[13px] text-[#A1A1AA]">
                                <span className={`font-medium ${style.text}`}>{style.emoji} {style.label}</span>
                                {post.city && <span className="text-[#52525B]">·</span>}
                                {post.city && <span className="truncate">{post.city}</span>}
                                {post.distanceKm >= 0 && <span className="text-[#52525B]">·</span>}
                                {post.distanceKm >= 0 && <span>{formatDistance(post.distanceKm)}</span>}
                            </div>
                        </div>
                    </button>

                    {!isOwn && (
                        <details className="relative shrink-0">
                            <summary className="list-none cursor-pointer w-9 h-9 flex items-center justify-center text-[#52525B] hover:text-[#A1A1AA] active:bg-white/5 rounded-full transition-colors">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                            </summary>
                            <div className="absolute right-0 top-10 bg-[#1a1a22] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-30 min-w-[140px]">
                                <button onClick={() => onSetReporting(post.id)}
                                        className="w-full text-left px-4 py-3 text-sm text-amber-400 hover:bg-white/5 transition-colors flex items-center gap-2">
                                    <span>🚩</span> Report
                                </button>
                                <button onClick={() => onBlock(post.userId, post.userName)}
                                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors border-t border-white/5 flex items-center gap-2">
                                    <span>🚫</span> Block
                                </button>
                            </div>
                        </details>
                    )}
                </header>

                {/* Hot badge */}
                {isHotNew && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 bg-orange-500/12 border border-orange-500/25 px-2.5 py-1 rounded-full">
                        🔥 Happening now
                    </div>
                )}

                {/* Body */}
                <p className="text-[15px] text-white leading-relaxed">{post.text}</p>

                {/* Meta row — time left + bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${isUrgent ? "text-red-400" : "text-[#A1A1AA]"}`}>
              {isUrgent ? "⚠ " : "⏳ "}{timeLeft}
            </span>
                        {trust && trust.positiveCount > 0 && (
                            <span className="text-[#A1A1AA] flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-400"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
                                {trust.positiveCount} positive
              </span>
                        )}
                    </div>
                    <div className="h-0.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? "bg-red-500/70" : "bg-blue-500/50"}`} style={{ width: `${fraction * 100}%` }} />
                    </div>
                </div>

                {/* CTA — Request to join */}
                {!isOwn && (
                    <>
                        {postActionMsg[post.id] ? (
                            <div className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-sm font-semibold text-emerald-400">
                                {postActionMsg[post.id]}
                            </div>
                        ) : isAccepted ? (
                            /* Accepted — big green button, hard to miss */
                            <button
                                onClick={() => onJoin(post)}
                                style={{ minHeight: 52 }}
                                className="w-full py-3 rounded-2xl bg-emerald-500 text-white text-base font-bold hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 animate-pulse"
                            >
                                💬 Open chat →
                            </button>
                        ) : (
                            <button
                                onClick={() => onJoin(post)}
                                disabled={isActing}
                                style={{ minHeight: 44 }}
                                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                                    hasJoined
                                        ? "bg-white/5 text-[#A1A1AA] cursor-default border border-white/5"
                                        : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20"
                                }`}
                            >
                                {isActing
                                    ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    : hasJoined ? "⏳ Waiting for reply…" : "Request to join →"}
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Report sheet */}
            {reportingPost === post.id && (
                <div className="fixed inset-0 bg-black/80 flex items-end z-50 p-4 animate-in fade-in duration-200" onClick={() => onSetReporting(null)}>
                    <div className="w-full max-w-md mx-auto bg-[#111118] border border-white/10 rounded-3xl p-6 space-y-5 animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-white">Report this post</h2>
                            <p className="text-sm text-[#A1A1AA]">Help us keep SwayNow safe. Reports are anonymous.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {(["spam","harassment","inappropriate","other"] as ReportReason[]).map((r) => (
                                <button key={r} onClick={() => onSetReportReason(r)}
                                        style={{ minHeight: 44 }}
                                        className={`py-3 rounded-xl text-sm font-medium border capitalize transition-all active:scale-[0.98] ${reportReason === r ? "border-blue-500 bg-blue-500/10 text-white" : "border-white/8 text-[#A1A1AA] hover:border-white/20"}`}>
                                    {r}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onReport(post.id, post.userId, post.userName)}
                                    style={{ minHeight: 44 }}
                                    className="flex-1 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 active:scale-[0.98] transition-all">
                                Submit
                            </button>
                            <button onClick={() => onSetReporting(null)}
                                    style={{ minHeight: 44 }}
                                    className="flex-1 rounded-xl border border-white/10 text-[#A1A1AA] text-sm font-medium active:scale-[0.98] transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}

// ════════════════════════════════════════════════════════════
//  POST TAB — outside Home for stable input identity
// ════════════════════════════════════════════════════════════

interface PostTabProps {
    text: string;
    setText: (v: string) => void;
    intent: Intent;
    setIntent: (v: Intent) => void;
    duration: Duration;
    setDuration: (v: Duration) => void;
    city: string;
    setCity: (v: string) => void;
    posting: boolean;
    postError: string | null;
    postSuccess: boolean;
    onPost: () => void;
}

function PostTabComponent({
                              text, setText, intent, setIntent, duration, setDuration,
                              city, setCity, posting, postError, postSuccess, onPost,
                          }: PostTabProps) {
    return (
        <div className="space-y-6 max-w-lg mx-auto">
            <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">What are you up to?</h1>
                <p className="text-[15px] text-[#A1A1AA]">Share what you&apos;re doing right now</p>
            </div>

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="I'm at Alexanderplatz looking for someone to explore Berlin with for the next few hours…"
                maxLength={280}
                rows={5}
                className="w-full bg-[#111118] border border-white/8 rounded-2xl px-4 py-4 text-[15px] text-white placeholder-[#52525B] outline-none focus:border-blue-500 resize-none transition-colors leading-relaxed"
            />

            <div className="space-y-3">
                <p className="text-sm font-medium text-[#A1A1AA]">Vibe</p>
                <div className="grid grid-cols-5 gap-2">
                    {INTENTS.map((i) => (
                        <button key={i.value} onClick={() => setIntent(i.value)}
                                style={{ minHeight: 44 }}
                                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-center transition-all active:scale-[0.96] ${intent === i.value ? `${i.tint} border-current ${i.text}` : "bg-white/[0.02] border-white/5 text-[#52525B]"}`}>
                            <span className="text-xl">{i.emoji}</span>
                            <span className="text-[11px] font-semibold">{i.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-sm font-medium text-[#A1A1AA]">City</p>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Berlin"
                       style={{ minHeight: 44 }}
                       className="w-full bg-[#111118] border border-white/8 rounded-xl px-4 py-3 text-[15px] text-white placeholder-[#52525B] outline-none focus:border-blue-500 transition-colors" />
            </div>

            <div className="space-y-3">
                <p className="text-sm font-medium text-[#A1A1AA]">Available for</p>
                <div className="grid grid-cols-4 gap-2">
                    {DURATIONS.map((d) => (
                        <button key={d.value} onClick={() => setDuration(d.value)}
                                style={{ minHeight: 44 }}
                                className={`py-3 rounded-xl text-sm font-semibold border transition-all active:scale-[0.96] ${duration === d.value ? "bg-blue-500/15 text-blue-400 border-blue-500/40" : "bg-white/[0.02] border-white/5 text-[#A1A1AA]"}`}>
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            {postError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{postError}</div>
            )}
            {postSuccess && (
                <div className="text-center py-6 space-y-2">
                    <p className="text-3xl">✅</p>
                    <p className="text-sm text-emerald-400 font-semibold">Posted! Redirecting…</p>
                </div>
            )}

            {!postSuccess && (
                <button onClick={onPost} disabled={posting || !text.trim()}
                        style={{ minHeight: 52 }}
                        className="w-full rounded-2xl bg-blue-500 text-white text-base font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                    {posting && <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                    {posting ? "Posting…" : "Create post"}
                </button>
            )}

            <p className="text-right text-xs text-[#52525B]">{text.length}/280</p>
        </div>
    );
}

// ════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export default function Home() {
    const router = useRouter();
    const [user, setUser]               = useState<User | null>(null);
    const [loading, setLoading]         = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError]     = useState<string | null>(null);
    const [navTab, setNavTab]           = useState<NavTab>("feed");
    const [userProfile, setUserProfile] = useState<import("../../lib/profile").UserProfile | null>(null);
    const [editingProfile, setEditingProfile] = useState(false);

    const [allPosts, setAllPosts]               = useState<Post[]>([]);
    const [feedLoading, setFeedLoading]         = useState(true);
    const [userCoords, setUserCoords]           = useState<{ lat: number; lng: number } | null>(null);
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationError, setLocationError]     = useState<string | null>(null);

    const [text, setText]               = useState("");
    const [intent, setIntent]           = useState<Intent>("Explore");
    const [duration, setDuration]       = useState<Duration>(60);
    const [city, setCity]               = useState("Berlin");
    const [posting, setPosting]         = useState(false);
    const [postError, setPostError]     = useState<string | null>(null);
    const [postSuccess, setPostSuccess] = useState(false);

    const [filterCountry, setFilterCountry] = useState("🇩🇪 Germany");
    const [filterCity, setFilterCity]       = useState("Berlin");

    const [acceptedChats, setAcceptedChats] = useState<JoinRequest[]>([]);
    const [pendingCount, setPendingCount]   = useState(0);

    const [toast, setToast]             = useState<{ title: string; body: string; chatId?: string; route?: string } | null>(null);
    const [notifGranted, setNotifGranted] = useState(false);

    const [joinedPosts, setJoinedPosts]     = useState<Set<string>>(new Set());
    const [actingPost, setActingPost]       = useState<string | null>(null);
    const [trustScores, setTrustScores]     = useState<Record<string, TrustScore>>({});
    const [reportingPost, setReportingPost] = useState<string | null>(null);
    const [blockedIds, setBlockedIds]       = useState<Set<string>>(new Set());
    const [reportReason, setReportReason]   = useState<ReportReason>("spam");
    const [postActionMsg, setPostActionMsg] = useState<Record<string, string>>({});

    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                // Auto-create user doc on first login so they show in admin
                try {
                    const { doc, setDoc, getDoc, serverTimestamp: st } = await import("firebase/firestore");
                    const ref = doc(db, "users", u.uid);
                    const snap = await getDoc(ref);
                    if (!snap.exists()) {
                        await setDoc(ref, {
                            uid: u.uid,
                            displayName: u.displayName ?? "Anonymous",
                            email: u.email ?? "",
                            photoURL: u.photoURL ?? null,
                            age: null,
                            gender: null,
                            languages: [],
                            bio: "",
                            createdAt: st(),
                            updatedAt: st(),
                        });
                    }
                } catch (e) { console.warn("User doc create error:", e); }
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Load blocked users
    useEffect(() => {
        if (!user) return;
        getBlockedUserIds(user.uid).then((ids) => setBlockedIds(new Set(ids))).catch(console.warn);
    }, [user]);

    // Request notification permission after login
    useEffect(() => {
        if (!user) return;
        requestNotificationPermission(user.uid).then(setNotifGranted).catch(console.warn);
        // Listen for foreground push messages → show toast
        const unsub = onForegroundMessage((msg) => {
            const isJoinRequest = msg.type === "join_request";
            const isAccepted    = msg.type === "request_accepted";
            setToast({
                title: msg.title,
                body: msg.body,
                chatId: isAccepted ? msg.data?.chatId : undefined,
                route: isJoinRequest ? "/requests" : undefined,
            });
            setTimeout(() => setToast(null), 6000);
        });
        return () => { if (typeof unsub === "function") unsub(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]);

    useEffect(() => {
        if (!navigator.geolocation) { setLocationLoading(false); return; }
        const bail = setTimeout(() => setLocationLoading(false), 5000);
        navigator.geolocation.getCurrentPosition(
            (pos) => { clearTimeout(bail); setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationLoading(false); },
            () => { clearTimeout(bail); setLocationError("Location off"); setLocationLoading(false); },
            { timeout: 5000, maximumAge: 60000 }
        );
        return () => clearTimeout(bail);
    }, []);

    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        return onSnapshot(q, (snap) => {
            setAllPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
            setFeedLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!user) return;
        const q1 = query(collection(db, "requests"), where("receiverUserId","==",user.uid), where("status","==","accepted"));
        const q2 = query(collection(db, "requests"), where("senderUserId","==",user.uid),   where("status","==","accepted"));
        const q3 = query(collection(db, "requests"), where("receiverUserId","==",user.uid), where("status","==","pending"));
        const unsub1 = onSnapshot(q1, (s) => {
            setAcceptedChats((prev) => {
                const mine = prev.filter((r) => r.senderUserId === user.uid);
                return [...mine, ...s.docs.map((d) => ({ id: d.id, ...d.data() } as JoinRequest))];
            });
        });
        const unsub2 = onSnapshot(q2, (s) => {
            const newChats = s.docs.map((d) => ({ id: d.id, ...d.data() } as JoinRequest));
            setAcceptedChats((prev) => {
                // Show toast for newly accepted requests (not on initial load)
                const prevIds = new Set(prev.map((r) => r.id));
                const brandNew = newChats.filter((r) => !prevIds.has(r.id));
                if (brandNew.length > 0 && prev.length > 0) {
                    const req = brandNew[0];
                    const chatId = `${req.postId}_${user.uid}`;
                    setToast({
                        title: "Your request was accepted!",
                        body: `Tap to open chat now`,
                        chatId,
                    });
                    setTimeout(() => setToast(null), 6000);
                }
                const mine = prev.filter((r) => r.receiverUserId === user.uid);
                return [...mine, ...newChats];
            });
        });
        const unsub3 = onSnapshot(q3, (s) => {
            const newCount = s.size;
            setPendingCount((prev) => {
                // Show toast when a new request arrives
                if (newCount > prev && prev >= 0) {
                    setToast({
                        title: "👋 New join request!",
                        body: "Someone wants to join your post. Tap to review.",
                        route: "/requests",
                    });
                    setTimeout(() => setToast(null), 6000);
                }
                return newCount;
            });
        });
        return () => { unsub1(); unsub2(); unsub3(); };
    }, [user]);

    // ── Derived ────────────────────────────────────────────
    const nearbyPosts: NearbyPost[] = allPosts
        .filter((p) => p.expiresAt && isActive(p.expiresAt))
        .filter((p) => !blockedIds.has(p.userId))
        .map((p) => ({ ...p, distanceKm: userCoords ? getDistanceKm(userCoords.lat, userCoords.lng, p.latitude, p.longitude) : -1 }))
        .filter((p) => !userCoords || p.distanceKm <= RADIUS_KM)
        .sort((a, b) => (a.distanceKm < 0 ? 0 : a.distanceKm - b.distanceKm));

    const explorePosts: NearbyPost[] = allPosts
        .filter((p) => p.expiresAt && isActive(p.expiresAt))
        .filter((p) => !blockedIds.has(p.userId))
        .filter((p) => p.city?.toLowerCase() === filterCity.toLowerCase())
        .map((p) => ({ ...p, distanceKm: -1 }));

    // ── Handlers ───────────────────────────────────────────
    const handleLogin = async () => {
        setAuthLoading(true); setAuthError(null);
        try { await signInWithPopup(auth, new GoogleAuthProvider()); }
        catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? "";
            if (code === "auth/popup-closed-by-user") setAuthError("Login cancelled.");
            else if (code === "auth/unauthorized-domain") setAuthError("Domain not authorised.");
            else if (code === "auth/popup-blocked") setAuthError("Popup blocked.");
            else setAuthError("Login failed.");
        } finally { setAuthLoading(false); }
    };

    const handleLogout = async () => { await signOut(auth).catch(console.error); };

    const handleShareApp = async () => {
        const result = await shareApp();
        if (result === "copied") {
            setToast({ title: "Link copied!", body: "Share it with friends to grow your local scene." });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handlePost = async () => {
        if (!user || !text.trim()) return;
        setPosting(true); setPostError(null); setPostSuccess(false);
        let lat = userCoords?.lat ?? 0, lng = userCoords?.lng ?? 0;
        if (!userCoords) {
            try {
                const pos = await new Promise<GeolocationPosition>((res, rej) =>
                    navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }));
                lat = pos.coords.latitude; lng = pos.coords.longitude;
                setUserCoords({ lat, lng });
            } catch { setPostError("Location required to post."); setPosting(false); return; }
        }
        try {
            await addDoc(collection(db, "posts"), {
                text: text.trim(), intent,
                userId: user.uid, userName: user.displayName ?? "Anonymous",
                createdAt: serverTimestamp(), expiresAt: getExpiresAt(duration),
                latitude: lat, longitude: lng, city: city.trim() || "Unknown",
            });
            setText(""); setPostSuccess(true);
            setTimeout(() => { setPostSuccess(false); setNavTab("feed"); }, 1500);
        } catch { setPostError("Failed to post."); }
        finally { setPosting(false); }
    };

    const handleJoin = async (post: NearbyPost) => {
        if (!user || post.userId === user.uid) return;

        // Already accepted → open chat directly (instant, no Firestore call needed)
        if (acceptedPostIds.has(post.id)) {
            router.push(`/chat/${post.id}_${user.uid}`);
            return;
        }

        setActingPost(post.id);
        try {
            // Already pending → let them know
            const pendingId = await getPendingRequestId(post.id, user.uid);
            if (pendingId) {
                setJoinedPosts((prev) => new Set(prev).add(post.id));
                setPostActionMsg((prev) => ({ ...prev, [post.id]: "⏳ Waiting for reply…" }));
                return;
            }

            // Send request
            await sendJoinRequest(post.id, post.text, user.uid, user.displayName ?? "Anonymous", post.userId, post.userName);
            setJoinedPosts((prev) => new Set(prev).add(post.id));
            setPostActionMsg((prev) => ({ ...prev, [post.id]: "✓ Request sent! They'll be notified." }));
            setTimeout(() => setPostActionMsg((prev) => { const n = { ...prev }; delete n[post.id]; return n; }), 4000);
        } catch (e) { console.error(e); }
        finally { setActingPost(null); }
    };

    const handleBlock = async (uid: string, name: string) => {
        if (!user) return;
        await blockUser(user.uid, uid, name);
        setBlockedIds((prev) => new Set([...prev, uid]));
        setToast({ title: `${name} blocked`, body: "Their posts are hidden. You can unblock from their profile." });
        setTimeout(() => setToast(null), 4000);
    };

    const handleReport = async (postId: string, uid: string, name: string) => {
        if (!user) return;
        await reportUser(user.uid, uid, name, postId, reportReason);
        setReportingPost(null);
        setPostActionMsg((prev) => ({ ...prev, [postId]: "✓ Reported. Thank you." }));
        setTimeout(() => setPostActionMsg((prev) => { const n = { ...prev }; delete n[postId]; return n; }), 3000);
    };

    // Posts where the current user's request was accepted
    const acceptedPostIds = new Set(
        acceptedChats
            .filter((r) => r.senderUserId === user?.uid)
            .map((r) => r.postId)
    );

    const cardProps = (post: NearbyPost) => ({
        post,
        currentUserId: user?.uid ?? "",
        joinedPosts, actingPost, trustScores, reportingPost, reportReason, postActionMsg,
        acceptedPostIds,
        onJoin: handleJoin, onBlock: handleBlock, onReport: handleReport,
        onSetReporting: setReportingPost, onSetReportReason: setReportReason,
        onSetTrustScores: setTrustScores, onNavigate: router.push,
    });

    // ── Loading ─────────────────────────────────────────────
    if (loading) return (
        <main className="flex min-h-screen items-center justify-center bg-[#0B0B0F]">
            <div className="space-y-4 text-center">
                <p className="text-4xl font-bold tracking-tight text-white" style={{letterSpacing:"-0.04em"}}>SwayNow</p>
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
            </div>
        </main>
    );

    // ── Not logged in → show login screen (accessed via /login) ──
    if (!user) return (
        <main className="flex min-h-screen flex-col bg-[#0B0B0F] text-white">
            <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
                <div className="mb-10 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3" fill="white"/>
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-white" style={{letterSpacing:"-0.03em"}}>Welcome back</h1>
                    <p className="text-[15px] text-[#A1A1AA]">Sign in to find people near you</p>
                </div>
                <div className="w-full space-y-4">
                    {authError && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 text-center">{authError}</div>
                    )}
                    <button onClick={handleLogin} disabled={authLoading}
                            style={{ minHeight: 52 }}
                            className="flex items-center justify-center gap-3 w-full rounded-2xl bg-white text-black text-base font-semibold hover:bg-neutral-100 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg">
                        {authLoading ? <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" /> : <GoogleIcon />}
                        {authLoading ? "Signing in…" : "Continue with Google"}
                    </button>
                    <p className="text-center text-xs text-[#52525B]">
                        New here?{" "}
                        <a href="/" className="text-blue-400 hover:text-blue-300 underline transition-colors">Learn about SwayNow →</a>
                    </p>
                </div>
            </div>
            <p className="text-center text-xs text-[#52525B] py-6 px-6">
                By signing in you agree to our{" "}
                <a href="/legal/terms" className="underline hover:text-white transition-colors">Terms</a>
                {" "}and{" "}
                <a href="/legal/privacy" className="underline hover:text-white transition-colors">Privacy Policy</a>
            </p>
        </main>
    );

    // ════════════════════════════════════════════════════════
    //  Tab content components (defined here to access state)
    // ════════════════════════════════════════════════════════

    const FeedTab = () => (
        <div className="space-y-4">
            {/* Status row */}
            <div className="flex items-center gap-2 px-1 text-xs">
                {locationLoading && <><div className="w-2 h-2 rounded-full bg-[#A1A1AA] animate-pulse" /><span className="text-[#A1A1AA]">Locating…</span></>}
                {!locationLoading && userCoords && (
                    <>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[#A1A1AA] font-medium">Within {RADIUS_KM} km</span>
                        <span className="text-[#52525B] ml-auto">{nearbyPosts.length} active</span>
                    </>
                )}
                {!locationLoading && locationError && <><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-amber-500/80">Location off — showing all</span></>}
            </div>

            {feedLoading && (
                <div className="flex justify-center py-20">
                    <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                </div>
            )}

            {!feedLoading && nearbyPosts.length === 0 && (
                <div className="text-center py-16 px-6 space-y-5">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl">📍</div>
                    <div className="space-y-1.5 max-w-xs mx-auto">
                        <h3 className="text-lg font-semibold text-white">No one nearby right now</h3>
                        <p className="text-[15px] text-[#A1A1AA] leading-relaxed">Be the first to set the vibe in your area.</p>
                    </div>
                    <button onClick={() => setNavTab("post")}
                            style={{ minHeight: 48 }}
                            className="px-6 rounded-2xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20">
                        Create the first post →
                    </button>
                    <div className="pt-2">
                        <button onClick={handleShareApp}
                                className="text-sm text-[#A1A1AA] hover:text-white transition-colors underline underline-offset-4">
                            or invite friends to join you →
                        </button>
                    </div>
                </div>
            )}

            {nearbyPosts.map((p) => <PostCard key={p.id} {...cardProps(p)} />)}
        </div>
    );

    const ExploreTab = () => (
        <div className="space-y-5">
            <div className="space-y-2">
                <p className="text-sm font-medium text-[#A1A1AA]">Country</p>
                <div className="flex gap-2 flex-wrap">
                    {Object.keys(LOCATIONS).map((c) => (
                        <button key={c} onClick={() => { setFilterCountry(c); setFilterCity(LOCATIONS[c][0]); }}
                                style={{ minHeight: 36 }}
                                className={`px-3 rounded-xl text-xs font-semibold border transition-all active:scale-[0.96] ${filterCountry === c ? "bg-blue-500 text-white border-blue-500" : "border-white/8 text-[#A1A1AA] bg-white/[0.02]"}`}>
                            {c}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <p className="text-sm font-medium text-[#A1A1AA]">City</p>
                <div className="flex gap-2 flex-wrap">
                    {(LOCATIONS[filterCountry] ?? []).map((c) => (
                        <button key={c} onClick={() => setFilterCity(c)}
                                style={{ minHeight: 36 }}
                                className={`px-3 rounded-xl text-xs font-semibold border transition-all active:scale-[0.96] ${filterCity === c ? "bg-white text-black border-white" : "border-white/8 text-[#A1A1AA] bg-white/[0.02]"}`}>
                            {c}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">{filterCity}</h2>
                    <span className="text-xs text-[#52525B]">{explorePosts.length} active</span>
                </div>
                {feedLoading && (
                    <div className="flex justify-center py-12"><div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>
                )}
                {!feedLoading && explorePosts.length === 0 && (
                    <div className="text-center py-12 space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-2xl">🌍</div>
                        <p className="text-sm text-[#A1A1AA]">Nothing happening in {filterCity} yet</p>
                    </div>
                )}
                {explorePosts.map((p) => <PostCard key={p.id} {...cardProps(p)} />)}
            </div>
        </div>
    );

    const ChatsTab = () => (
        <div className="space-y-4">
            {pendingCount > 0 && (
                <button onClick={() => router.push("/requests")}
                        style={{ minHeight: 60 }}
                        className="w-full flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-2xl px-4 py-4 active:scale-[0.99] transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-lg">📬</div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-white">{pendingCount} pending request{pendingCount > 1 ? "s" : ""}</p>
                            <p className="text-xs text-[#A1A1AA]">People want to join your posts</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
                    </div>
                </button>
            )}
            <div className="space-y-2">
                <p className="text-sm font-medium text-[#A1A1AA] px-1">Active chats</p>
                {acceptedChats.length === 0 && (
                    <div className="text-center py-16 space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-2xl">💬</div>
                        <div className="space-y-1">
                            <h3 className="text-base font-semibold text-white">No chats yet</h3>
                            <p className="text-sm text-[#A1A1AA]">Join a post to start chatting</p>
                        </div>
                        <button onClick={() => setNavTab("feed")}
                                style={{ minHeight: 44 }}
                                className="px-5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all">
                            Browse feed
                        </button>
                    </div>
                )}
                {acceptedChats.map((req) => {
                    // Show the OTHER person's name — not always the sender
                    const otherName = user?.uid === req.senderUserId
                        ? (req.receiverUserName || "User")
                        : req.senderUserName;
                    // Chat URL always uses senderUserId (that's the key)
                    const chatUrl = `/chat/${req.postId}_${req.senderUserId}`;
                    return (
                        <button key={req.id} onClick={() => router.push(chatUrl)}
                                style={{ minHeight: 72 }}
                                className="w-full flex items-center gap-3 bg-[#111118] border border-white/[0.06] rounded-2xl p-4 active:scale-[0.99] transition-all text-left">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-base font-semibold text-white shrink-0">
                                {otherName[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-medium text-white truncate">{otherName}</p>
                                <p className="text-xs text-[#A1A1AA] truncate mt-0.5">Re: {req.postText}</p>
                            </div>
                            <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full font-semibold">Active</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const ProfileTab = () => {
        const myPosts  = allPosts.filter((p) => p.userId === user.uid);
        const myActive = myPosts.filter((p) => isActive(p.expiresAt));

        // Local edit state
        const [editing, setEditing]       = useState(false);
        const [editAge, setEditAge]       = useState(userProfile?.age?.toString() ?? "");
        const [editBio, setEditBio]       = useState(userProfile?.bio ?? "");
        const [editLangs, setEditLangs]   = useState<string[]>(userProfile?.languages ?? []);
        const [saving, setSaving]         = useState(false);

        const toggleLang = (lang: string) =>
            setEditLangs((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]);

        const handleSave = async () => {
            setSaving(true);
            try {
                const { saveUserProfile, LANGUAGE_OPTIONS: _ } = await import("../../lib/profile");
                await saveUserProfile({
                    uid: user.uid,
                    displayName: user.displayName ?? "Anonymous",
                    email: user.email ?? "",
                    photoURL: user.photoURL,
                    age: editAge ? parseInt(editAge) : null,
                    bio: editBio.trim(),
                    languages: editLangs,
                });
                // Refresh local profile
                const { getUserProfile } = await import("../../lib/profile");
                const updated = await getUserProfile(user.uid);
                setUserProfile(updated);
                setEditing(false);
            } catch (e) {
                console.error(e);
            } finally {
                setSaving(false);
            }
        };

        // Sync edit fields when userProfile loads
        useEffect(() => {
            if (userProfile) {
                setEditAge(userProfile.age?.toString() ?? "");
                setEditBio(userProfile.bio ?? "");
                setEditLangs(userProfile.languages ?? []);
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [userProfile?.uid]);

        return (
            <div className="space-y-6 max-w-md mx-auto">

                {/* Avatar + name */}
                <div className="flex flex-col items-center gap-3 pt-2">
                    {user.photoURL
                        ? <Image src={user.photoURL} alt={user.displayName ?? "User"} width={80} height={80} className="rounded-full ring-4 ring-blue-500/20" />
                        : <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-3xl font-bold text-white">{user.displayName?.[0]}</div>
                    }
                    <div className="text-center">
                        <p className="text-xl font-bold text-white">{user.displayName}</p>
                        <p className="text-sm text-[#A1A1AA]">{user.email}</p>
                    </div>
                </div>

                {/* Profile completeness nudge — only if empty */}
                {!userProfile?.bio && !userProfile?.age && !editing && (
                    <button onClick={() => setEditing(true)}
                            className="w-full bg-blue-500/10 border border-blue-500/25 border-dashed rounded-2xl px-4 py-4 flex items-center gap-3 active:scale-[0.99] transition-all text-left">
                        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-base shrink-0">✏️</div>
                        <div>
                            <p className="text-sm font-semibold text-white">Complete your profile</p>
                            <p className="text-xs text-[#A1A1AA]">Add age, bio and languages — builds trust with others</p>
                        </div>
                        <span className="ml-auto text-blue-400 text-sm shrink-0">→</span>
                    </button>
                )}

                {/* Profile info (view mode) */}
                {!editing && (userProfile?.bio || userProfile?.age || (userProfile?.languages?.length ?? 0) > 0) && (
                    <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Your profile</p>
                            <button onClick={() => setEditing(true)} className="text-xs text-blue-400 font-medium hover:text-blue-300 transition-colors">Edit</button>
                        </div>
                        {userProfile?.age && (
                            <div className="flex items-center gap-2 text-sm text-white">
                                <span className="text-[#A1A1AA] w-16 text-xs">Age</span>
                                <span className="font-medium">{userProfile.age}</span>
                            </div>
                        )}
                        {userProfile?.bio && (
                            <div className="flex items-start gap-2 text-sm text-white">
                                <span className="text-[#A1A1AA] w-16 text-xs shrink-0 mt-0.5">Bio</span>
                                <span className="leading-relaxed">{userProfile.bio}</span>
                            </div>
                        )}
                        {(userProfile?.languages?.length ?? 0) > 0 && (
                            <div className="flex items-start gap-2">
                                <span className="text-[#A1A1AA] w-16 text-xs shrink-0 mt-1">Speaks</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {userProfile!.languages.map((l) => (
                                        <span key={l} className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-2 py-0.5 rounded-full">{l}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Profile edit form */}
                {editing && (
                    <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 space-y-5">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-white">Edit profile</p>
                            <button onClick={() => setEditing(false)} className="text-xs text-[#A1A1AA] hover:text-white transition-colors">Cancel</button>
                        </div>

                        {/* Age */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[#A1A1AA]">Age <span className="text-[#52525B]">(optional)</span></label>
                            <input type="number" inputMode="numeric" value={editAge}
                                   onChange={(e) => setEditAge(e.target.value.replace(/\D/g, ""))}
                                   placeholder="e.g. 24" min={16} max={100}
                                   style={{ minHeight: 44 }}
                                   className="w-full bg-[#0B0B0F] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-[#52525B] outline-none focus:border-blue-500 transition-colors" />
                        </div>

                        {/* Bio */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[#A1A1AA]">Bio <span className="text-[#52525B]">(optional)</span></label>
                            <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)}
                                      placeholder="A quick line about yourself…" maxLength={140} rows={2}
                                      className="w-full bg-[#0B0B0F] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-[#52525B] outline-none focus:border-blue-500 transition-colors resize-none" />
                            <p className="text-right text-xs text-[#52525B]">{editBio.length}/140</p>
                        </div>

                        {/* Languages */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#A1A1AA]">Languages <span className="text-[#52525B]">(optional)</span></label>
                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                                {(["English","German","French","Spanish","Italian","Portuguese","Dutch","Russian","Polish","Turkish","Arabic","Hindi","Mandarin","Japanese","Korean","Vietnamese","Thai","Indonesian","Hindi","Punjabi","Urdu","Bengali","Tamil","Telugu","Filipino","Swahili","Greek","Czech","Swedish","Norwegian","Danish","Finnish","Romanian","Hungarian","Ukrainian","Hebrew","Cantonese"]).map((lang) => (
                                    <button key={lang} onClick={() => toggleLang(lang)}
                                            style={{ minHeight: 32 }}
                                            className={`px-3 rounded-full text-xs font-medium border transition-all active:scale-[0.96] ${editLangs.includes(lang) ? "bg-blue-500 border-blue-500 text-white" : "bg-[#0B0B0F] border-white/8 text-[#A1A1AA]"}`}>
                                        {editLangs.includes(lang) && "✓ "}{lang}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save */}
                        <button onClick={handleSave} disabled={saving}
                                style={{ minHeight: 48 }}
                                className="w-full rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                            {saving ? "Saving…" : "Save profile"}
                        </button>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: "Posts", value: myPosts.length, icon: "✍️" },
                        { label: "Active now", value: myActive.length, icon: "🟢" },
                        { label: "Open chats", value: acceptedChats.length, icon: "💬" },
                        { label: "Requests", value: pendingCount, icon: "📬" },
                    ].map((s) => (
                        <div key={s.label} className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 space-y-1">
                            <p className="text-base">{s.icon}</p>
                            <p className="text-2xl font-bold text-white">{s.value}</p>
                            <p className="text-xs text-[#A1A1AA]">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    <button onClick={() => router.push(`/profile/${user.uid}`)}
                            style={{ minHeight: 52 }}
                            className="w-full flex items-center justify-between bg-[#111118] border border-white/[0.06] rounded-2xl px-4 py-3 active:scale-[0.99] transition-all">
                        <span className="text-sm text-white font-medium">👤 View public profile</span>
                        <span className="text-[#52525B]">→</span>
                    </button>
                    <button onClick={() => router.push("/requests")}
                            style={{ minHeight: 52 }}
                            className="w-full flex items-center justify-between bg-[#111118] border border-white/[0.06] rounded-2xl px-4 py-3 active:scale-[0.99] transition-all">
                        <span className="text-sm text-white font-medium">📬 Manage requests</span>
                        {pendingCount > 0 && <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>}
                    </button>
                    <button onClick={handleLogout}
                            style={{ minHeight: 52 }}
                            className="w-full flex items-center justify-between bg-[#111118] border border-white/[0.06] rounded-2xl px-4 py-3 active:scale-[0.99] transition-all hover:border-red-500/30">
                        <span className="text-sm text-red-400 font-medium">Sign out</span>
                    </button>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-4 text-xs text-[#52525B]">
                    <a href="/legal/terms" className="hover:text-[#A1A1AA] transition-colors">Terms</a>
                    <span>·</span>
                    <a href="/legal/privacy" className="hover:text-[#A1A1AA] transition-colors">Privacy</a>
                </div>
            </div>
        );
    };

    // ════════════════════════════════════════════════════════
    //  APP SHELL
    // ════════════════════════════════════════════════════════

    return (
        <main className="min-h-screen bg-[#0B0B0F] text-white flex flex-col">
            {/* Toast notification */}
            {toast && (
                <div
                    className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto"
                    onClick={() => { if (toast.chatId) router.push(`/chat/${toast.chatId}`); else if (toast.route) router.push(toast.route); setToast(null); }}
                >
                    <div className="bg-[#1a1a2e] border border-blue-500/30 rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3 cursor-pointer active:scale-[0.98] transition-all">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 text-base mt-0.5">🔔</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{toast.title}</p>
                            <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">{toast.body}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setToast(null); }} className="text-[#52525B] hover:text-white transition-colors shrink-0 mt-0.5">✕</button>
                    </div>
                </div>
            )}

            {/* Sticky header */}
            <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[#0B0B0F]/90 backdrop-blur-md border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        </svg>
                    </div>
                    <span className="text-lg font-bold tracking-tight" style={{letterSpacing:"-0.03em"}}>SwayNow</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Share / invite */}
                    <button
                        onClick={handleShareApp}
                        style={{ minHeight: 36, minWidth: 36 }}
                        className="rounded-full flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors active:scale-95"
                        aria-label="Invite friends"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                    </button>

                    {/* Notification bell */}
                    <button
                        onClick={() => setNavTab("chats")}
                        style={{ minHeight: 36, minWidth: 36 }}
                        className="relative rounded-full flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors active:scale-95"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        {pendingCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white border-2 border-[#0B0B0F]">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
                        )}
                    </button>
                    {user.photoURL && (
                        <button onClick={() => setNavTab("profile")} style={{ minHeight: 36, minWidth: 36 }} className="rounded-full transition-all active:scale-95">
                            <Image src={user.photoURL} alt="You" width={32} height={32} className="rounded-full ring-2 ring-white/10" />
                        </button>
                    )}
                </div>
            </header>

            {/* Page content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-32 max-w-2xl w-full mx-auto">
                {navTab === "feed"    && <FeedTab />}
                {navTab === "explore" && <ExploreTab />}
                {navTab === "post"    && (
                    <PostTabComponent
                        text={text} setText={setText}
                        intent={intent} setIntent={setIntent}
                        duration={duration} setDuration={setDuration}
                        city={city} setCity={setCity}
                        posting={posting} postError={postError} postSuccess={postSuccess}
                        onPost={handlePost}
                    />
                )}
                {navTab === "chats"   && <ChatsTab />}
                {navTab === "profile" && <ProfileTab />}
            </div>

            {/* Bottom navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-md border-t border-white/[0.06]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
                <div className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto">
                    {(["feed","explore","post","chats","profile"] as NavTab[]).map((t) => {
                        const isActive = navTab === t;
                        const isPost   = t === "post";
                        const hasBadge = t === "chats" && pendingCount > 0;
                        const label = t === "feed" ? "Nearby" : t === "explore" ? "Explore" : t === "post" ? "Post" : t === "chats" ? "Chats" : "Profile";
                        return (
                            <button key={t} onClick={() => setNavTab(t)}
                                    style={{ minHeight: 56, minWidth: 56 }}
                                    className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl transition-all active:scale-95 relative ${
                                        isPost ? "bg-blue-500 text-white -mt-5 shadow-xl shadow-blue-500/30 w-14 h-14"
                                            : isActive ? "text-white" : "text-[#52525B]"
                                    }`}>
                                {hasBadge && (
                                    <span className="absolute top-0 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white border-2 border-[#0B0B0F]">{pendingCount}</span>
                                )}
                                {t === "post" ? NavIcons.post() :
                                    t === "feed" ? NavIcons.feed(isActive) :
                                        t === "explore" ? NavIcons.explore(isActive) :
                                            t === "chats" ? NavIcons.chats(isActive) :
                                                NavIcons.profile(isActive)}
                                {!isPost && (
                                    <span className="text-[10px] font-semibold tracking-tight">{label}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </main>
    );
}

function GoogleIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
            <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
            <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
            <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
            <path d="M43.611 20.083H42V20H24v8h11.303a11.96 11.96 0 01-4.087 5.571l6.19 5.237C42.012 35.245 44 30 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
        </svg>
    );
}