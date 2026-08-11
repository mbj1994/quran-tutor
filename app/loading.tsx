export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[45vh] max-w-lg items-center justify-center p-4 sm:p-6">
      <div
        role="status"
        className="rounded-2xl border border-emerald-100 bg-white px-6 py-5 text-center shadow-sm shadow-emerald-950/5"
      >
        <div className="mx-auto size-8 animate-pulse rounded-full bg-emerald-100" />
        <p className="mt-3 font-medium text-gray-950">Preparing your page…</p>
        <p className="mt-1 text-sm text-gray-600">This should only take a moment.</p>
      </div>
    </main>
  );
}
