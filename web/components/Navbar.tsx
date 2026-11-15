"use client";

import React from "react";
import { MissionWindowItem, SiteCatalogItem } from "../lib/types";
import { Compass, Moon, Orbit, ShieldCheck, Sun, Radio, FileText, ChevronDown } from "lucide-react";

interface NavbarProps {
  catalog: SiteCatalogItem[];
  currentSiteId: string;
  onSelectSite: (siteId: string) => void;
  windowsCatalog: MissionWindowItem[];
  currentWindowId: string;
  onSelectWindow: (windowId: string) => void;
  useUpperLimb: boolean;
  onToggleUpperLimb: (val: boolean) => void;
  minEarthEl: number;
  onChangeMinEarthEl: (val: number) => void;
  onOpenProvenance: () => void;
}

export function Navbar({
  catalog,
  currentSiteId,
  onSelectSite,
  windowsCatalog,
  currentWindowId,
  onSelectWindow,
  useUpperLimb,
  onToggleUpperLimb,
  minEarthEl,
  onChangeMinEarthEl,
  onOpenProvenance
}: NavbarProps) {
  const currentSite = catalog.find((s) => s.site_id === currentSiteId) || catalog[0];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo and Challenge Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <Moon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-wider text-slate-100 flex items-center gap-1.5">
                LOLA <span className="text-cyan-400">HORIZON</span>
              </span>
              <span className="hidden xl:inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                Lunar Landing Site Navigator
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Team LOLA Horizon • NASA Space Apps 2026
            </p>
          </div>
        </div>

        {/* Controls: Site Selector, Mission Window, Operational Filters, Provenance Button */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Site Selector Dropdown */}
          <div className="relative">
            <label className="text-[10px] text-slate-400 font-mono block -mb-0.5 ml-1">Landing Target</label>
            <div className="relative">
              <select
                id="site-selector"
                value={currentSiteId}
                onChange={(e) => onSelectSite(e.target.value)}
                className="appearance-none bg-slate-900/90 text-slate-200 text-xs sm:text-sm font-medium py-1.5 pl-2.5 pr-7 rounded-lg border border-slate-700/80 hover:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
              >
                {catalog.map((site) => (
                  <option key={site.site_id} value={site.site_id}>
                    {site.name} ({site.latitude_deg.toFixed(1)}°S)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Mission Date Window Selector */}
          <div className="relative">
            <label className="text-[10px] text-cyan-400 font-mono block -mb-0.5 ml-1">Mission Window</label>
            <div className="relative">
              <select
                id="window-selector"
                value={currentWindowId}
                onChange={(e) => onSelectWindow(e.target.value)}
                className="appearance-none bg-slate-900/90 text-cyan-200 text-xs sm:text-sm font-medium py-1.5 pl-2.5 pr-7 rounded-lg border border-cyan-800/70 hover:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
              >
                {windowsCatalog.map((win) => (
                  <option key={win.window_id} value={win.window_id}>
                    {win.short_label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Operational Solar Model Toggle */}
          <div className="hidden lg:flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono">Solar Model</span>
            <button
              onClick={() => onToggleUpperLimb(!useUpperLimb)}
              title="Toggle between Solar Center (conservative photovoltaic) and Upper Limb (+0.267° penumbral grazing)"
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                useUpperLimb
                  ? "bg-amber-950/60 border-amber-600/70 text-amber-300"
                  : "bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-600"
              }`}
            >
              <Sun className={`w-3.5 h-3.5 ${useUpperLimb ? "text-amber-400" : "text-slate-400"}`} />
              <span>{useUpperLimb ? "Upper Limb (+0.27°)" : "Solar Center"}</span>
            </button>
          </div>

          {/* LOS Model — Terrain Horizon Selector */}
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono">LOS Model — Terrain Horizon</span>
            <select
              value={minEarthEl}
              onChange={(e) => onChangeMinEarthEl(Number(e.target.value))}
              title="Geometric line-of-sight elevation clearance above local terrain horizon"
              className="bg-slate-900/90 text-slate-300 text-xs py-1.5 px-2 rounded-lg border border-slate-700/80 hover:border-cyan-500/60 focus:outline-none cursor-pointer"
            >
              <option value={0}>0° (Terrain Horizon Clearance)</option>
              <option value={3}>+3° Elevation Filter</option>
              <option value={5}>+5° Elevation Filter</option>
            </select>
          </div>


          {/* Provenance & Scientific QA Button */}
          <button
            onClick={onOpenProvenance}
            className="flex items-center gap-1.5 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/80 hover:border-cyan-400/80 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">NASA Provenance & QA</span>
          </button>
        </div>
      </div>
    </header>
  );
}
