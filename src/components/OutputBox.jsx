'use client';

import React from "react";
import ReactMarkdown from "react-markdown";

export default function OutputBox({ text }) {
  if (!text) return null;

  // Split at 1. / 2. / 3.
  const raw = String(text);
  const sections = raw.split(/\d\.\s/).filter(Boolean).slice(0, 3);

  const labels = ['Summary', 'Main Points', 'Helpful Definitions'];

  // Remove inner headings like "**Summary**", "Main Points:", etc.
  const stripLeadingHeading = (s, label) => {
  let out = String(s);

  // 1) Drop the heading itself (Summary / Main Points / Helpful Definitions / Key Definitions)
  out = out.replace(
    new RegExp(
      String.raw`^(?:\*\*)?\s*(?:${label}|Key\s*Definitions)\s*:?\s*(?:\*\*)?\s*`,
      "i"
    ),
    ""
  );

  // 2) If the next line is just punctuation like ":" or "—", remove it
  //    (handles both same-line and next-line cases)
  out = out
    // colon/dash immediately after with optional spaces
    .replace(/^\s*[:\-–—]+\s*/, "")
    // or a colon/dash on its own line right after the header
    .replace(/^(?:\r?\n)?\s*[:\-–—]+\s*(\r?\n)?/, "");

  return out.trim();
};

  return (
    <div className="grid gap-6 mt-6">
      {sections.map((section, idx) => {
        const clean = stripLeadingHeading(section, labels[idx]);
        return (
          <div
            key={idx}
            className="relative p-[6px] rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-md"
          >
            <div className="bg-white rounded-[10px] p-5 h-full">
              <h2 className="text-lg font-semibold mb-2 text-blue-600">
                {labels[idx]}
              </h2>
              {/* ✅ Markdown renderer + blue text */}
              <div className="prose max-w-none text-blue-700 leading-relaxed">
                <ReactMarkdown>{clean || 'N/A'}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
