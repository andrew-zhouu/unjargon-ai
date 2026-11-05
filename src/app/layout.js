import { Geist, Geist_Mono, Inter, Source_Serif_4 } from "next/font/google";
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

// Used only for original source documents in the side-by-side view.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  style: ["normal"],
});

export const metadata = {
  title: "unjargon.ai",
  description: "AI that simplifies the complex.",
};

export const viewport = {
  themeColor: "#0a0f21",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${inter.variable} ${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        {/* TopNav and SiteFooter hide themselves on the app route, which has its own navigation */}
        <TopNav />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
