"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getReviews, getTrustScore, Review, TrustScore } from "@/lib/requests";
import { getUserProfile, UserProfile } from "@/lib/profile";
import { isActive } from "@/lib/expiry";

interface Post {
    id: string; text: string; intent: string; city: string;
    createdAt: Timestamp | null; expiresAt: Timestamp;
    userId: string; userName: string;
}

export default function ProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const router     = useRouter();

    const [loading, setLoading]   = useState(true);
    const [reviews, setReviews]   = useState<Review[]>([]);
    const [trust, setTrust]       = useState<TrustScore | null>(null);
    const [posts, setPosts]       = useState<Post[]>([]);
    const [profile, setProfile]   = useState<UserProfile | null>(null);
    const [isMe, setIsMe]         = useState(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (u && u.uid === userId) setIsMe(true);
        });
        return () => unsub();
    }, [userId]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [p, r, t, postsSnap] = await Promise.all([
                    getUserProfile(userId),
                    getReviews(userId),
                    getTrustScore(userId),
                    getDocs(query(collection(db, "posts"), where("userId", "==", userId), orderBy("createdAt", "desc"))),
                ]);
                setProfile(p);
                setReviews(r);
                setTrust(t);
                setPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    const fmt = (ts: Timestamp | null) =>
        ts ? new Date(ts.seconds * 1000).toLocaleDateString([], { month: "short", day: "numeric" }) : "";

    const intentEmoji: Record<string, string> = {
        Explore:"🧭", Party:"🎉", Chill:"🌿", Study:"📚", Sports:"⚡",
    };

    if (loading) return (
        <main className="flex min-h-screen items-center justify-center bg-[#0B0B0F]">
            <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </main>
    );

    const userName = profile?.displayName ?? "User";
    const photoURL = profile?.photoURL;

    return (
        <main className="min-h-screen bg-[#0B0B0F] text-white">
            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#0B0B0F]/90 backdrop-blur-md">
                <button onClick={() => router.back()} style={{ minHeight: 36 }}
                        className="text-sm text-[#A1A1AA] hover:text-white transition-colors px-2">← Back</button>
                <h1 className="text-base font-semibold">{isMe ? "My Profile" : userName}</h1>
            </header>

            <div className="max-w-md mx-auto pb-12">

                {/* ── Hero ── */}
                <div className="px-5 pt-8 pb-2 flex flex-col items-center gap-4">
                    <div className="relative">
                        {photoURL ? (
                            <Image
                                src={photoURL}
                                alt={userName}
                                width={120}
                                height={120}
                                className="rounded-full ring-4 ring-blue-500/20"
                                priority
                            />
                        ) : (
                            <div className="w-30 h-30 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-4xl font-bold text-white" style={{ width: 120, height: 120 }}>
                                {userName[0]?.toUpperCase()}
                            </div>
                        )}
                        {trust && trust.metCount > 0 && (
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white w-9 h-9 rounded-full flex items-center justify-center border-4 border-[#0B0B0F] shadow-lg">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            </div>
                        )}
                    </div>

                    <div className="text-center space-y-0.5">
                        <h2 className="text-2xl font-bold text-white tracking-tight" style={{letterSpacing:"-0.02em"}}>
                            {userName}{profile?.age ? `, ${profile.age}` : ""}
                        </h2>
                        {profile?.gender && (
                            <p className="text-sm text-[#A1A1AA] capitalize">{profile.gender}</p>
                        )}
                    </div>

                    {/* Trust pill */}
                    {trust && trust.metCount > 0 && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                            Trusted · met {trust.metCount} {trust.metCount === 1 ? "person" : "people"}
                        </div>
                    )}
                </div>

                <div className="px-5 py-6 space-y-6">

                    {/* Bio */}
                    {profile?.bio && (
                        <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4">
                            <p className="text-[15px] text-white leading-relaxed">{profile.bio}</p>
                        </div>
                    )}

                    {/* Languages */}
                    {profile?.languages && profile.languages.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Speaks</p>
                            <div className="flex flex-wrap gap-2">
                                {profile.languages.map((lang) => (
                                    <span key={lang} className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full">
                    {lang}
                  </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trust stats */}
                    {trust && (trust.metCount > 0 || trust.positiveCount > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-base">🤝</span>
                                    <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Met</span>
                                </div>
                                <p className="text-2xl font-bold">{trust.metCount}</p>
                                <p className="text-xs text-[#52525B]">people in person</p>
                            </div>
                            <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-base">⭐</span>
                                    <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Positive</span>
                                </div>
                                <p className="text-2xl font-bold">{trust.positiveCount}</p>
                                <p className="text-xs text-[#52525B]">good experiences</p>
                            </div>
                        </div>
                    )}

                    {/* Reviews */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">What people say</h3>
                            <span className="text-xs text-[#52525B]">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
                        </div>
                        {reviews.length === 0 && (
                            <div className="text-center py-8 space-y-1">
                                <p className="text-2xl">✍️</p>
                                <p className="text-sm text-[#A1A1AA]">No reviews yet</p>
                                <p className="text-xs text-[#52525B]">Reviews appear after meeting</p>
                            </div>
                        )}
                        {reviews.map((rev) => (
                            <div key={rev.id} className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-xs font-bold">
                                            {rev.authorName[0]?.toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium">{rev.authorName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${rev.positive ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}>
                      {rev.positive ? "👍 Positive" : "👎 Mixed"}
                    </span>
                                        <span className="text-xs text-[#52525B]">{fmt(rev.createdAt)}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-white leading-relaxed pl-9">&quot;{rev.text}&quot;</p>
                            </div>
                        ))}
                    </section>

                    {/* Recent posts */}
                    {posts.length > 0 && (
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Recent posts</h3>
                                <span className="text-xs text-[#52525B]">{posts.length} total</span>
                            </div>
                            {posts.slice(0, 8).map((post) => {
                                const active = isActive(post.expiresAt);
                                return (
                                    <div key={post.id} className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 space-y-1.5">
                                        <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A1A1AA] font-medium">
                        {intentEmoji[post.intent] ?? "📌"} {post.intent} · {post.city}
                      </span>
                                            <div className="flex items-center gap-2">
                                                {active && <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">Active</span>}
                                                <span className="text-xs text-[#52525B]">{fmt(post.createdAt)}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-white leading-relaxed">{post.text}</p>
                                    </div>
                                );
                            })}
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}