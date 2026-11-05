'use client';

import { Fragment, useEffect, useId, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { parseOutput, linkTerms, tokenizeInline } from "@/lib/parseOutput";
import { LEVELS, levelLabel } from "@/components/LevelSelect";
import { domainLabel } from "@/components/DomainSelect";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                       */
/* -------------------------------------------------------------------------- */

const mdComponents = {
  // No decorative italics on the reading surface.
  em: ({ children }) => <>{children}</>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

function SectionLabel({ id, children }) {
  return (
    <h2
      id={id}
      className="flex items-center gap-3 font-sans text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-paper-muted"
    >
      <span aria-hidden="true" className="h-[2px] w-6 rounded-full bg-gradient-brand" />
      {children}
    </h2>
  );
}

function Inline({ text }) {
  return tokenizeInline(text).map((t, i) => {
    if (t.type === 'strong') return <strong key={i} className="font-semibold text-paper-ink">{t.text}</strong>;
    if (t.type === 'code') return <code key={i} className="rounded bg-paper-tint px-1 py-0.5 font-mono text-[0.9em]">{t.text}</code>;
    return <Fragment key={i}>{t.text}</Fragment>;
  });
}

/* -------------------------------------------------------------------------- */
/* Reading view                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Renders Unjargon's output as one continuous reading surface.
 *
 * Wide containers (≥ 48rem) show definitions as margin notes beside the main
 * point where the term first appears. Narrow containers show tappable terms
 * that expand inline. Definitions that don't literally appear in a main point
 * are never force-linked; every definition is always listed in the glossary.
 */
export default function OutputBox({
  text,
  meta,
  loading = false,
  embedded = false,
  onChangeLevel,
  canChangeLevel = true,
}) {
  const uid = useId();
  const parsed = useMemo(() => parseOutput(text), [text]);
  const linked = useMemo(
    () => (parsed.structured ? linkTerms(parsed.points, parsed.definitions) : null),
    [parsed]
  );

  const [openTerms, setOpenTerms] = useState(() => new Set());
  const [hoverDef, setHoverDef] = useState(null);

  // Collapse any expanded definitions when a new result arrives.
  useEffect(() => {
    setOpenTerms(new Set());
    setHoverDef(null);
  }, [parsed.raw]);

  if (!text && !loading) return null;

  const toggleTerm = (defId) =>
    setOpenTerms((prev) => {
      const next = new Set(prev);
      if (next.has(defId)) next.delete(defId);
      else next.add(defId);
      return next;
    });

  const defById = new Map((parsed.definitions || []).map((d) => [d.id, d]));
  const hasMargin = Boolean(linked && linked.noteFor.size > 0);
  const domain = meta?.domain;
  const level = meta?.level;

  const renderPointTokens = (tokens) =>
    tokens.map((t, i) => {
      if (t.type === 'term') {
        const def = defById.get(t.defId);
        const open = openTerms.has(t.defId);
        const active = open || hoverDef === t.defId;
        const inner = (
          <>
            {t.text}
            <sup className="ml-[1px] font-sans text-[0.68em] font-semibold text-brand-violet-ink">{t.note}</sup>
          </>
        );
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggleTerm(t.defId)}
            onMouseEnter={() => setHoverDef(t.defId)}
            onMouseLeave={() => setHoverDef(null)}
            onFocus={() => setHoverDef(t.defId)}
            onBlur={() => setHoverDef(null)}
            aria-expanded={open}
            aria-controls={`${uid}-def-${t.defId}`}
            data-term={def?.term}
            className={cn(
              "inline cursor-help rounded-[3px] px-[1px] text-left underline decoration-dotted decoration-[1.5px] underline-offset-[5px]",
              "decoration-brand-violet/70 transition-colors hover:bg-brand-violet/10",
              active && "bg-brand-violet/10",
              t.strong && "font-semibold text-paper-ink"
            )}
          >
            {inner}
          </button>
        );
      }
      if (t.type === 'strong') return <strong key={i} className="font-semibold text-paper-ink">{t.text}</strong>;
      if (t.type === 'code') return <code key={i} className="rounded bg-paper-tint px-1 py-0.5 font-mono text-[0.9em]">{t.text}</code>;
      return <Fragment key={i}>{t.text}</Fragment>;
    });

  const statusText = loading ? 'Unjargoning…' : '';

  return (
    <article
      aria-busy={loading}
      aria-label="Unjargoned explanation"
      className={cn(
        "@container relative text-paper-body",
        embedded
          ? "bg-paper"
          : "overflow-hidden rounded-2xl bg-paper shadow-[0_40px_80px_-48px_rgb(0_0_0/0.8)]"
      )}
    >
      {!embedded && (
        <div aria-hidden="true" className="h-[3px] bg-[linear-gradient(90deg,#3ccbea,#4a7bff_40%,#8b5cf6)]" />
      )}

      <div
        className={cn(
          embedded ? "px-5 py-6 sm:px-8 sm:py-8" : "px-5 pt-7 pb-8 sm:px-10 sm:pt-10 sm:pb-10 @3xl:px-14 @3xl:pt-12"
        )}
      >
        {/* Meta row */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em]">
            {embedded && <span className="text-paper-ink">Unjargoned</span>}
            {embedded && <span className="mx-1.5 text-paper-muted" aria-hidden="true">·</span>}
            <span className="text-brand-blue-ink">{domainLabel(domain)}</span>
            <span className="mx-1.5 text-paper-muted" aria-hidden="true">·</span>
            <span className="text-brand-violet-ink">{levelLabel(level)}</span>
          </p>
          <p role="status" aria-live="polite" className="flex items-center gap-2 text-[0.8125rem] text-paper-muted">
            {loading && (
              <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-blue motion-safe:animate-pulse" />
            )}
            {statusText}
          </p>
        </div>

        {/* Waiting for the first tokens */}
        {loading && !text && (
          <div className="mt-8 space-y-3" aria-hidden="true">
            {[92, 84, 88, 60].map((w, i) => (
              <div
                key={i}
                className="h-3.5 rounded bg-paper-tint motion-safe:animate-pulse"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        )}

        {/* Unstructured fallback: render exactly what came back */}
        {text && !parsed.structured && (
          <div className="reading-md mt-6 max-w-[68ch] text-[1.0625rem] leading-[1.7]">
            <ReactMarkdown components={mdComponents}>{parsed.raw}</ReactMarkdown>
          </div>
        )}

        {parsed.structured && (
          <>
            {parsed.preamble && (
              <div className="reading-md mt-6 max-w-[68ch] text-[0.975rem] leading-relaxed text-paper-muted">
                <ReactMarkdown components={mdComponents}>{parsed.preamble}</ReactMarkdown>
              </div>
            )}

            {/* Summary */}
            {(parsed.summary || loading) && (
              <section aria-labelledby={`${uid}-summary`} className="mt-7 @3xl:mt-9">
                <SectionLabel id={`${uid}-summary`}>Summary</SectionLabel>
                <div className="reading-md mt-4 max-w-[62ch] text-[1.125rem] leading-[1.7] text-paper-ink @lg:text-[1.1875rem]">
                  <ReactMarkdown components={mdComponents}>{parsed.summary || ' '}</ReactMarkdown>
                </div>
              </section>
            )}

            {/* Main points */}
            {parsed.points.length > 0 && (
              <section aria-labelledby={`${uid}-points`} className="mt-10 @3xl:mt-12">
                <div
                  className={cn(
                    "grid items-end",
                    hasMargin && "@3xl:grid-cols-[minmax(0,1fr)_13.5rem] @3xl:gap-x-8"
                  )}
                >
                  <SectionLabel id={`${uid}-points`}>Main points</SectionLabel>
                  {hasMargin && (
                    <p
                      aria-hidden="true"
                      className="hidden text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-brand-violet-ink @3xl:block"
                    >
                      Definitions
                    </p>
                  )}
                </div>

                <ol role="list" className="mt-4 border-t border-paper-line">
                  {parsed.points.map((_, i) => {
                    const notes = linked.notesByPoint[i] || [];
                    return (
                      <li
                        key={i}
                        className={cn(
                          "grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 border-b border-paper-line py-5 @lg:grid-cols-[2.75rem_minmax(0,1fr)] @lg:py-6",
                          hasMargin && "@3xl:grid-cols-[2.75rem_minmax(0,1fr)_13.5rem] @3xl:gap-x-8"
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="font-display text-[1.25rem] font-semibold leading-[1.806rem] tabular-nums text-gradient-brand @lg:text-[1.375rem]"
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>

                        <div className="min-w-0">
                          <p className="max-w-[64ch] text-[1.0625rem] leading-[1.7] text-paper-body">
                            {renderPointTokens(linked.pointTokens[i])}
                          </p>

                          {/* Inline definitions (narrow layouts) */}
                          {notes.map(({ defId }) => {
                            const def = defById.get(defId);
                            return (
                              <div
                                key={defId}
                                id={`${uid}-def-${defId}`}
                                hidden={!openTerms.has(defId)}
                                className={cn(
                                  "mt-3 max-w-[64ch] rounded-lg bg-brand-violet/[0.07] px-4 py-3",
                                  hasMargin && "@3xl:hidden"
                                )}
                              >
                                <p className="text-[0.9375rem] font-semibold text-paper-ink">{def?.term}</p>
                                <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-paper-body">
                                  <Inline text={def?.definition} />
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Margin notes (wide layouts) */}
                        {hasMargin && (
                          <aside aria-hidden="true" className="hidden space-y-2 @3xl:block">
                            {notes.map(({ defId, note }) => {
                              const def = defById.get(defId);
                              const active = openTerms.has(defId) || hoverDef === defId;
                              return (
                                <div
                                  key={defId}
                                  className={cn(
                                    "-mx-3 rounded-lg px-3 py-2 transition-colors",
                                    active && "bg-brand-violet/[0.08]"
                                  )}
                                >
                                  <p className="text-[0.8125rem] font-semibold leading-snug text-paper-ink">
                                    <sup className="mr-1 text-[0.7rem] text-brand-violet-ink">{note}</sup>
                                    {def?.term}
                                  </p>
                                  <p className="mt-0.5 text-[0.8125rem] leading-snug text-paper-muted">
                                    <Inline text={def?.definition} />
                                  </p>
                                </div>
                              );
                            })}
                          </aside>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {/* Examples — only when the model actually provided one */}
            {parsed.examples.length > 0 && (
              <section aria-labelledby={`${uid}-example`} className="mt-10">
                <SectionLabel id={`${uid}-example`}>
                  {parsed.examples.length > 1 ? 'Examples' : 'Example'}
                </SectionLabel>
                <div className="mt-4 space-y-3">
                  {parsed.examples.map((ex, i) => (
                    <p
                      key={i}
                      className="max-w-[68ch] rounded-r-lg border-l-2 border-brand-cyan bg-paper-tint px-5 py-4 text-[1.0625rem] leading-[1.7] text-paper-body"
                    >
                      <Inline text={ex} />
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Full glossary */}
            {(parsed.definitions.length > 0 || parsed.definitionNotes.length > 0) && (
              <section aria-labelledby={`${uid}-defs`} className="mt-12">
                <SectionLabel id={`${uid}-defs`}>Helpful definitions</SectionLabel>
                {parsed.definitions.length > 0 && (
                  <dl className="mt-5 grid gap-x-10 @xl:grid-cols-2">
                    {parsed.definitions.map((d) => (
                      <div key={d.id} className="border-t border-paper-line py-4">
                        <dt className="text-[0.975rem] font-semibold text-paper-ink">{d.term}</dt>
                        <dd className="mt-1 text-[0.9375rem] leading-relaxed text-paper-muted">
                          <Inline text={d.definition} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {parsed.definitionNotes.map((n, i) => (
                  <p key={i} className="mt-3 max-w-[68ch] text-[0.9375rem] leading-relaxed text-paper-muted">
                    <Inline text={n} />
                  </p>
                ))}
              </section>
            )}
          </>
        )}

        {/* Change complexity without leaving the reading view */}
        {onChangeLevel && text && !loading && (
          <div className="mt-12 rounded-xl bg-paper-tint p-4 @2xl:flex @2xl:items-center @2xl:justify-between @2xl:gap-6 @2xl:px-5">
            <div>
              <p id={`${uid}-level`} className="text-[0.9375rem] font-medium text-paper-ink">
                Want it simpler, or more precise?
              </p>
              {!canChangeLevel && (
                <p className="mt-1 text-[0.8125rem] text-paper-muted">
                  Paste the text or re-upload the file to explain it at another level.
                </p>
              )}
            </div>
            <div
              role="group"
              aria-labelledby={`${uid}-level`}
              className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-white p-1 ring-1 ring-paper-line @md:grid-cols-4 @2xl:mt-0 @2xl:shrink-0"
            >
              {LEVELS.map((l) => {
                const active = l.value === level;
                return (
                  <button
                    key={l.value}
                    type="button"
                    aria-pressed={active}
                    disabled={!canChangeLevel && !active}
                    title={l.hint}
                    onClick={() => !active && onChangeLevel(l.value)}
                    className={cn(
                      "h-9 rounded-md px-3 text-[0.875rem] font-medium transition-colors",
                      active
                        ? "bg-gradient-brand text-white"
                        : "text-paper-muted hover:bg-paper-tint hover:text-paper-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                    )}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
