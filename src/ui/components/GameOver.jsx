// GameOver.jsx — Full-screen death screen. Shown when hero.alive is false.
// Blocks all game interaction; the only way out is starting a new life.

export default function GameOver({ hero, onNewLife }) {
  const livedYears = hero.age || 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/95 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl p-8 text-center">
        <span className="block text-6xl select-none mb-3">🪦</span>
        <h2 className="text-xl font-extrabold text-white">Rest In Peace</h2>
        <p className="mt-1 text-sm font-bold text-slate-200">
          {hero.fullName}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          Lived {livedYears} year{livedYears === 1 ? '' : 's'} in {hero.city}, {hero.country}
        </p>
        {hero.deathCause && (
          <p className="mt-3 rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-xs text-slate-300">
            Cause of death: <span className="font-bold text-slate-100">{hero.deathCause}</span>
          </p>
        )}
        <button
          type="button"
          onClick={onNewLife}
          className="mt-6 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer transition-colors"
        >
          🌱 Start New Life
        </button>
      </div>
    </div>
  );
}
