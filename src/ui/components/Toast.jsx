import { useEffect } from 'react';

// Toast.jsx — Minimal "you can't do that" popup.
// No buttons: it disappears when you click it or click anywhere else, and
// also fades away on its own after a few seconds.

export default function Toast({ toast, onClose }) {
  return toast ? <ToastPopup toast={toast} onClose={onClose} /> : null;
}

function ToastPopup({ toast, onClose }) {
  // Auto-dismiss after a moment (in case the player never clicks)
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [toast.id]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-transparent cursor-pointer animate-in fade-in duration-150"
    >
      <div
        className={`pointer-events-none max-w-xs rounded-2xl bg-slate-900/95 border shadow-2xl px-5 py-4 text-center animate-in zoom-in-95 fade-in duration-200
          ${toast.blocked ? 'border-red-500/40' : 'border-slate-700'}`}
      >
        <span className="block text-3xl select-none mb-1.5">{toast.icon}</span>
        <p className="text-sm font-bold text-slate-100 leading-snug break-words">{toast.text}</p>
      </div>
    </div>
  );
}
