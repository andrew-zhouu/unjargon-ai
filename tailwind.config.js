/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',        // for pages and layouts using App Router
    './src/components/**/*.{js,ts,jsx,tsx}', // if you plan to use a components folder
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)"],
        geist: ["var(--font-geist-sans)"],
        geistMono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
};