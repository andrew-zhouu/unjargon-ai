import { Geist, Geist_Mono } from "next/font/google";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import SiteFooter from "@/components/SiteFooter";
import TopNav from "@/components/TopNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata = {
  title: "unjargon.ai",
  description: "AI that simplifies the complex.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-slate-900 min-h-screen flex flex-col text-white">
        <TopNav />
        {/* Main page content */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>

        {/* Footer (always at bottom) */}
        <SiteFooter />

        {/* Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
