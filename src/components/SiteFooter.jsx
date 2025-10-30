'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SiteFooter() {
  const [open, setOpen] = useState(false);

  return (
    <footer className="relative w-full border-t border-white/10 bg-slate-900/60 backdrop-blur text-gray-300">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          {/* Left: tiny Terms link */}
          <div className="text-[11px] leading-none">
            <Link
              href="/terms"
              className="underline underline-offset-2 hover:text-white/90"
            >
              Terms of Use
            </Link>
            
          </div>
          <div className="text-[11px]">
            <Link
              href="/privacy"
              className="underline underline-offset-2 hover:text-white/90"
            >
              Privacy Policy
            </Link>
          </div>

          {/* Right: hamburger */}
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-md border border-white/15 px-2.5 py-1.5 hover:bg-white/5"
              title="Open menu"
            >
              {/* simple hamburger icon */}
              <span className="sr-only">Open menu</span>
              <span className="block w-5 space-y-1.5">
                <span className="block h-0.5 w-full bg-gray-300" />
                <span className="block h-0.5 w-full bg-gray-300" />
                <span className="block h-0.5 w-3/4 bg-gray-300" />
              </span>
            </button>

            {/* Dropdown */}
            {open && (
              <div
                role="menu"
                className="absolute right-0 bottom-10 z-50 w-48 overflow-hidden
                           rounded-lg border border-white/10 bg-slate-900 shadow-xl"
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
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
