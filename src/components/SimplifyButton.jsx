'use client';
import { ArrowRight, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SimplifyButton({ onClick, loading, text, label = 'Unjargon', className }) {
  const disabled = loading || !text?.trim();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading ? 'true' : 'false'}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6",
        "bg-gradient-brand font-display text-[0.975rem] font-semibold text-white",
        "shadow-[0_6px_20px_-8px_rgb(80_90_255/0.6)] transition-[filter,transform]",
        "hover:brightness-110 motion-safe:active:scale-[0.98]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:brightness-100",
        className
      )}
    >
      {loading ? (
        <>
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          <span>Unjargoning…</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </>
      )}
    </button>
  );
}
