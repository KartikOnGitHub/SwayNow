export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808]">
      <div className="space-y-3 text-center">
        <p
          className="text-3xl font-black tracking-tight text-white"
          style={{ letterSpacing: "-0.04em" }}
        >
          Sway
        </p>
        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto opacity-40" />
      </div>
    </main>
  );
}
