'use client';
import { Loader2 } from "lucide-react"; // already using lucide-react in your project

export default function SimplifyButton({ text = '', loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!text.trim() || loading}
      aria-busy={loading}
      className="
        mt-4 inline-flex items-center justify-center gap-2
        rounded-xl px-10 py-2.5 font-bold
        bg-blue-600 text-white shadow-sm
        hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
      "
    >
      {loading && <Loader2 className="animate-spin h-4 w-4" />}
      {loading ? 'Simplifying...' : 'Simplify'}
    </button>
  );
}


