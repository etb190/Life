import { useState } from 'react';

// App.jsx — root React component.
// Right now this is only a placeholder screen that proves the setup works:
// Vite is serving the app and Tailwind utility classes are being applied.
// The real game UI will replace this later.

export default function App() {
  const [message, setMessage] = useState('');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-slate-100">
      <h1 className="mb-8 text-5xl font-bold tracking-tight">Life Sim</h1>
      <button
        type="button"
        onClick={() => setMessage('Setup works!')}
        className="cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-500 active:bg-blue-700"
      >
        Test Button
      </button>
      {message && (
        <p className="mt-6 rounded-lg border border-emerald-700 bg-emerald-950 px-4 py-2 text-emerald-400">
          {message}
        </p>
      )}
    </div>
  );
}
