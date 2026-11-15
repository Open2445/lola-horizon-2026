"use client";

import React from "react";
import { DerivedMetrics, HorizonMask, SiteMetadata } from "../lib/types";
import { Sun, Radio, Eye, Mountain, Clock, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

interface KpiCardsProps {
  site: SiteMetadata;
  metrics: DerivedMetrics;
  horizonMask: HorizonMask;
  useUpperLimb: boolean;
  minEarthEl: number;
}

export function KpiCards({ site, metrics, horizonMask, useUpperLimb, minEarthEl }: KpiCardsProps) {
  // Find max and min obstruction from horizon mask
  const pts = horizonMask.points || [];
  const maxObs = pts.length > 0 ? Math.max(...pts.map((p) => p.obstruction_elevation_deg)) : 0;
  const minObs = pts.length > 0 ? Math.min(...pts.map((p) => p.obstruction_elevation_deg)) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Solar Illumination Card */}
      <div className="glass-panel-amber rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/15 transition-all" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-amber-300/80 font-semibold flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-400" />
              Solar Illumination
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-800/60">
              DERIVED
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight font-mono">
              {metrics.total_sunlight_hours.toFixed(1)}
              <span className="text-base font-normal text-amber-400 ml-1">h</span>
            </span>
            <span className="text-sm font-semibold text-amber-300/90 font-mono">
              ({metrics.sunlight_coverage_percent.toFixed(1)}%)
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1 font-mono">
            {useUpperLimb ? "Upper limb model (+0.27°)" : "Solar center obstruction model"}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">Longest Window:</span>
          <span className="font-semibold font-mono text-amber-200 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/40">
            {metrics.longest_sunlight_hours.toFixed(1)} hrs continuous
          </span>
        </div>
      </div>

      {/* 2. Geometric Earth Line-of-Sight Card */}
      <div className="glass-panel-cyan rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition-all">
        <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/15 transition-all" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-cyan-300/80 font-semibold flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-cyan-400" />
              Earth Line-of-Sight
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
              DTE PROXY
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight font-mono">
              {metrics.total_dte_hours.toFixed(1)}
              <span className="text-base font-normal text-cyan-400 ml-1">h</span>
            </span>
            <span className="text-sm font-semibold text-cyan-300/90 font-mono">
              ({metrics.dte_coverage_percent.toFixed(1)}%)
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1 font-mono">
            {minEarthEl > 0 ? `Operational elevation cutoff ≥ ${minEarthEl}°` : "Pure terrain horizon clearance"}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-cyan-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">Max Blackout:</span>
          <span
            className={`font-semibold font-mono px-2 py-0.5 rounded border ${
              metrics.longest_dte_blackout_hours > 0
                ? "text-red-300 bg-red-950/80 border-red-800/50"
                : "text-emerald-300 bg-emerald-950/80 border-emerald-800/50"
            }`}
          >
            {metrics.longest_dte_blackout_hours > 0
              ? `${metrics.longest_dte_blackout_hours.toFixed(1)} hrs`
              : "0.0 h (Continuous LOS)"}
          </span>
        </div>
      </div>

      {/* 3. Simultaneous Sun + Earth Science Window */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/40 transition-all">
        <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/15 transition-all" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-indigo-300/80 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Simultaneous Sun + LOS
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-950/70 text-indigo-300 border border-indigo-800/60">
              OPERATIONAL
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight font-mono">
              {metrics.total_simultaneous_hours.toFixed(1)}
              <span className="text-base font-normal text-indigo-400 ml-1">h</span>
            </span>
            <span className="text-sm font-semibold text-indigo-300/90 font-mono">
              ({metrics.simultaneous_coverage_percent.toFixed(1)}%)
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1 font-mono">
            Simultaneous geometric visibility
          </p>
        </div>


        <div className="mt-4 pt-3 border-t border-indigo-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">Longest Streak:</span>
          <span className="font-semibold font-mono text-indigo-200 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/40">
            {metrics.longest_simultaneous_hours.toFixed(1)} hrs
          </span>
        </div>
      </div>

      {/* 4. Local Topography & Mountain Obstruction */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-slate-500/40 transition-all">
        <div className="absolute top-0 right-0 w-28 h-28 bg-slate-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-slate-500/15 transition-all" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-300/80 font-semibold flex items-center gap-1.5">
              <Mountain className="w-4 h-4 text-slate-400" />
              Terrain Topography
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700">
              LOLA DEM
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight font-mono">
              {site.elevation_m >= 0 ? `+${(site.elevation_m / 1000).toFixed(2)}` : (site.elevation_m / 1000).toFixed(2)}
              <span className="text-base font-normal text-slate-400 ml-1">km</span>
            </span>
            <span className="text-xs font-mono text-slate-400">
              datum 1737.4 km
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1 font-mono">
            {site.name} ({site.latitude_deg.toFixed(2)}°S, {site.longitude_deg.toFixed(2)}°E)
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Max Mountain Rim:</span>
          <span className="font-semibold font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-700/60">
            {maxObs.toFixed(1)}° obstruction
          </span>
        </div>
      </div>
    </div>
  );
}
