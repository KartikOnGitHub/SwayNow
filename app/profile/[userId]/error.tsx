"use client";

import { useRouter } from "next/navigation";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-14 h-14 rounded-full bg-red-950/50 border border-red-900/40 flex items-center justify-center mx-auto text-xl">
          👤
        </div>
        <div className="space-y-1.5">
          <h1 className="text-base font-bold">Profile not found</h1>
          <p className="text-sm text-neutral-500">
            This user&apos;s profile couldn&apos;t be loaded.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-2xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-all"
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-5 py-2.5 rounded-2xl border border-white/10 text-neutral-400 text-sm font-medium hover:border-white/20 hover:text-white transition-all"
          >
            Back to feed
          </button>
        </div>
      </div>
    </main>
  );
}
