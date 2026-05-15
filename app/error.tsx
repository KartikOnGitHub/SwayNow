"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console — can replace with Sentry/error monitoring later
    console.error("Sway error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-900/40 flex items-center justify-center mx-auto text-2xl">
          ⚠️
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Something went sideways</h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            An unexpected error happened. Try again, or head back to the feed.
          </p>
        </div>

        {/* Error details — collapsible, only useful for dev */}
        {process.env.NODE_ENV === "development" && (
          <details className="text-left bg-[#111] border border-white/5 rounded-xl p-3 text-xs">
            <summary className="text-neutral-500 cursor-pointer hover:text-white transition-colors">
              Error details
            </summary>
            <pre className="mt-2 text-red-300 whitespace-pre-wrap break-all leading-relaxed">
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-2xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-all"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 rounded-2xl border border-white/10 text-neutral-400 text-sm font-medium hover:border-white/20 hover:text-white transition-all"
          >
            Back to feed
          </button>
        </div>

        <p className="text-xs text-neutral-700 pt-4">
          If this keeps happening, contact{" "}
          <a href="mailto:hello@sway.app" className="text-neutral-500 hover:text-white underline">
            hello@sway.app
          </a>
        </p>
      </div>
    </main>
  );
}
