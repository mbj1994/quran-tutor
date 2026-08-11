export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-emerald-100 bg-white/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-emerald-950">Qur’an Tutor</p>
          <p className="mt-1 text-gray-600">Built for live Qur’an learning</p>
        </div>
        <div className="sm:text-right">
          <p className="text-gray-600">
            For support, contact the Quran Tutor team.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            <span className="font-medium text-emerald-700">Pilot version</span>
            {' · '}For testing with selected families and scholars
          </p>
        </div>
      </div>
    </footer>
  );
}
