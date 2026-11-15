import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLPS Lunar Mission Browser — NASA Space Apps 2026",
  description:
    "Scientifically defensible lunar mission decision-support tool. Compare landing sites, terrain horizon obstruction, solar illumination windows, and Earth line-of-sight.",
  keywords: [
    "NASA",
    "Space Apps Challenge 2026",
    "CLPS",
    "Lunar South Pole",
    "Malapert A",
    "LOLA DEM",
    "JPL Horizons",
    "Ephemeris",
    "Mission Planning"
  ]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
