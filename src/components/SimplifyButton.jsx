'use client';
import { Loader2 } from "lucide-react";

export default function SimplifyButton({ onClick, loading, text }) {
  const disabled = loading || !text?.trim();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading ? 'true' : 'false'}
      className="
        relative w-full h-12
        mt-4 inline-flex items-center justify-center gap-2
        rounded-xl px-10 py-2.5 font-bold
        bg-blue-600 text-white shadow-sm
        hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors border-blue-400
      "
    >
      {/* Spinner pinned left, vertically centered */}
      {loading && (
        <span
          className="
            absolute left-[1.2rem]
            top-1/2 -translate-y-1/2
            flex items-center justify-center
          "
        >
          <Loader2 className="w-5 h-5 animate-spin text-white opacity-90" />
        </span>
      )}

      {/* Text label */}
      <span
        className={`transition-opacity duration-200 ${
          loading ? 'opacity-90' : 'opacity-100'
        }`}
      >
        {loading ? 'Unjargoning...' : 'Unjargon'}
      </span>
    </button>
  );
}
