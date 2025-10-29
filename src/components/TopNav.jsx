'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TopNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative w-full bg-transparent text-white">
      {/* Wrapper positions menu in top-right */}
      <div className="absolute top-5 right-6 z-50">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-md border border-white/15 px-2.5 py-1.5 hover:bg-white/5 transition"
          title="Menu"
        >
          <span className="sr-only">Open menu</span>
          <span className="block w-5 space-y-1.5">
            <span className="block h-0.5 w-full bg-gray-200" />
            <span className="block h-0.5 w-full bg-gray-200" />
            <span className="block h-0.5 w-3/4 bg-gray-200" />
          </span>
        </button>

        {/* Dropdown */}
        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-48 rounded-lg border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur-sm"
          >
            <div className="px-3 py-2 text-[11px] font-semibold text-white/70">
              unjargon.ai
            </div>
            <nav className="flex flex-col text-sm">
              <Link
                href="/"
                className="px-4 py-2 hover:bg-white/5"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                Use the App
              </Link>
              <Link
                href="/about-us"
                className="px-4 py-2 hover:bg-white/5"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                About Us
              </Link>
              <Link
                href="/contact"
                className="px-4 py-2 hover:bg-white/5"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                Contact
              </Link>
              <Link
                href="/terms"
                className="px-4 py-2 hover:bg-white/5"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                Terms of Use
              </Link>
            </nav>
          </div>
        )}
      </div>
    </nav>
  );
}
