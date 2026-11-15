import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "LOLA Horizon — Lunar Landing Site Navigator | NASA Space Apps 2026",
  description:
    "Team LOLA Horizon: Scientifically defensible lunar mission decision-support browser. Compare landing sites, mission windows, terrain horizon obstruction, solar illumination, and Earth line-of-sight.",
  keywords: [
    "NASA",
    "Space Apps Challenge 2026",
    "LOLA Horizon",
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
    <html
      lang="en"
      className={`dark h-full ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
    >
      <body className="min-h-full flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
