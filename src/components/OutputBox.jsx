'use client';

import React from "react";
import ReactMarkdown from "react-markdown";

export default function OutputBox({ text }) {
  if (!text) return null;

  const raw = String(text);
  const sections = raw.split(/\d\.\s/).filter(Boolean).slice(0, 3);
  const labels = ['Summary', 'Main Points', 'Helpful Definitions'];

  const stripLeadingHeading = (s, label) => {
    let out = String(s);
    // remove "Summary", "Main Points", "Helpful Definitions" or "Key Definitions" headings if present
    out = out.replace(
      new RegExp(
        String.raw`^(?:\*\*)?\s*(?:${label}|Key\s*Definitions)\s*:?\s*(?:\*\*)?\s*`,
        "i"
      ),
      ""
    );
    // remove lonely punctuation right after the header
    out = out
      .replace(/^\s*[:\-–—]+\s*/, "")
      .replace(/^(?:\r?\n)?\s*[:\-–—]+\s*(\r?\n)?/, "");
    return out.trim();
  };

  // Parse "Main Points" body into an array of items
  function parseMainPoints(body) {
    const lines = String(body || '').split(/\r?\n/);
    const items = [];

    for (let line of lines) {
      const t = line.trim();
      if (!t || /^N\/A$/i.test(t)) continue;
      // normalize different leading bullets to a clean text
      const normalized = t.replace(/^\s*[-•–—]\s+/, '').trim();
      items.push(normalized);
    }

    // If no explicit lines found but body has text, try sentence-splitting as a fallback
    if (items.length === 0 && body && body.trim()) {
      const parts = body
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+(?=[A-Z(0-9])/)
        .map(s => s.trim())
        .filter(Boolean);
      return parts;
    }

    return items;
  }

  return (
    <div className="grid gap-6 mt-6">
      {sections.map((section, idx) => {
        const clean = stripLeadingHeading(section, labels[idx]);

        // For Summary + Helpful Definitions, keep your pretty Markdown rendering
        if (idx !== 1) {
          return (
            <div
              key={idx}
              className="relative p-[6px] rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-md"
            >
              <div className="bg-white rounded-[10px] p-5 h-full">
                <h2 className="text-lg font-semibold mb-2 text-blue-600">
                  {labels[idx]}
                </h2>
                <div className="prose max-w-none text-blue-700 leading-relaxed">
                  <ReactMarkdown>{clean || 'N/A'}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        }

        // SPECIAL CASE: Main Points — render bullets ourselves so dashes always show
        const items = parseMainPoints(clean);

        return (
          <div
            key={idx}
            className="relative p-[6px] rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-md"
          >
            <div className="bg-white rounded-[10px] p-5 h-full">
              <h2 className="text-lg font-semibold mb-2 text-blue-600">
                {labels[idx]}
              </h2>

              {items.length === 0 ? (
                <div className="text-blue-700">N/A</div>
              ) : (
                <ul className="list-disc pl-6 text-blue-700 leading-relaxed">
                  {items.map((it, i) => (
                    <li key={i}>
                      {/* If the model already prefixed "- Example:", keep it */}
                      {it}
                    </li>
                  ))}
                </ul>
              )}

              {/* Also show the raw text quietly (optional, for debugging) */}
              {/* <pre className="mt-3 text-xs text-blue-500/70 whitespace-pre-wrap">{clean}</pre> */}
            </div>
          </div>
        );
      })}
    </div>
  );
}
