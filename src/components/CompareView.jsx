'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { RotateCw } from 'lucide-react';
import OutputBox from '@/components/OutputBox';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function AutoGrowTextarea({ value, onChange, ...props }) {
  const ref = useRef(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useIsoLayoutEffect(resize, [value, resize]);

  useEffect(() => {
    // Re-measure when the width changes or the serif web font finishes loading
    // (glyph widths change line wrapping).
    const el = ref.current;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro && el?.parentElement) ro.observe(el.parentElement);
    let cancelled = false;
    document.fonts?.ready?.then(() => !cancelled && resize());
    window.addEventListener('resize', resize);
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [resize]);

  return <textarea ref={ref} value={value} onChange={onChange} rows={6} {...props} />;
}

/**
 * Original document (dark, editable) beside the simplified explanation (light).
 * The backend doesn't return paragraph-level mappings, so the two sides are
 * shown as whole documents rather than paired passages.
 */
export default function CompareView({
  text,
  onTextChange,
  resultText,
  meta,
  loading,
  dirty,
  onRerun,
  onChangeLevel,
  canChangeLevel,
}) {
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-line md:grid md:grid-cols-2">
      {/* Original */}
      <section aria-labelledby="compare-original" className="flex flex-col bg-ink-800">
        <div className="flex min-h-14 items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-7">
          <h2
            id="compare-original"
            className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-text-soft"
          >
            Original
          </h2>
          {dirty && !loading ? (
            <button
              type="button"
              onClick={onRerun}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/[0.07] px-3 text-xs font-semibold text-text hover:bg-white/[0.12]"
            >
              <RotateCw className="size-3.5" aria-hidden="true" />
              Unjargon again
            </button>
          ) : (
            <span className="text-xs text-text-muted">Editable</span>
          )}
        </div>
        <label htmlFor="compare-original-text" className="sr-only">
          Original text
        </label>
        <AutoGrowTextarea
          id="compare-original-text"
          value={text}
          onChange={onTextChange}
          spellCheck={false}
          className="block w-full flex-auto resize-none overflow-hidden bg-transparent px-5 pb-8 pt-4 font-serif text-[1.0625rem] leading-[1.75] text-[#d6dcf0] placeholder:text-text-muted focus:outline-none sm:px-8"
          placeholder="Type or paste text here…"
        />
      </section>

      {/* Simplified */}
      <div className="relative bg-paper md:shadow-[inset_14px_0_18px_-16px_rgb(10_15_33/0.45)]">
        <div aria-hidden="true" className="h-[2px] bg-[linear-gradient(90deg,#3ccbea,#4a7bff_40%,#8b5cf6)] md:hidden" />
        <OutputBox
          text={resultText}
          meta={meta}
          loading={loading}
          embedded
          onChangeLevel={onChangeLevel}
          canChangeLevel={canChangeLevel}
        />
      </div>
    </div>
  );
}
