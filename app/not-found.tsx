"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
      <main className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-sm">
          {/* Big 404 with subtle shadow */}
          <div className="space-y-2">
            <p className="text-7xl font-black tracking-tight" style={{ letterSpacing: "-0.05em" }}>
              404
            </p>
            <div className="h-px w-12 bg-white/20 mx-auto" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold">This page got lost</h1>
            <p className="text-sm text-neutral-500 leading-relaxed">
              The page you&apos;re looking for doesn&apos;t exist or has expired — like a SwayNow post.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
                onClick={() => router.push("/")}
                className="px-6 py-3 rounded-2xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-all"
            >
              Back to feed
            </button>
            <button
                onClick={() => router.back()}
                className="px-6 py-3 rounded-2xl border border-white/10 text-neutral-400 text-sm font-medium hover:border-white/20 hover:text-white transition-all"
            >
              Go back
            </button>
          </div>

          <p className="text-xs text-neutral-700 pt-4">SwayNow</p>
        </div>
      </main>
  );
}