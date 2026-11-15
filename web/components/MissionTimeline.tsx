"use client";

import React, { useState, useEffect, useRef } from "react";
import { HorizonMask, TargetEphemeris } from "../lib/types";
import { evaluateTargetVisibility } from "../lib/science/visibility";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sun,
  Radio,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

interface MissionTimelineProps {
  ephemeris: TargetEphemeris[];
  horizonMask: HorizonMask;
  useUpperLimb: boolean;
  minEarthEl: number;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

export function MissionTimeline({
  ephemeris,
  horizonMask,
  useUpperLimb,
  minEarthEl,
  selectedIndex,
  onSelectIndex
}: MissionTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 5 | 20>(5);
  const trackRef = useRef<HTMLDivElement>(null);
  const n = ephemeris.length;

  // Auto-play animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onSelectIndex((selectedIndex + 1) % n);
    }, 200 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, selectedIndex, playbackSpeed, n, onSelectIndex]);

  // Current inspected sample
  const currentSample = ephemeris[selectedIndex] || ephemeris[0];
  const limbOffset = useUpperLimb ? 0.267 : 0.0;

  const sunEval = evaluateTargetVisibility(
    currentSample.sun.azimuth_deg,
    currentSample.sun.elevation_deg,
    horizonMask,
    limbOffset
  );

  const earthEval = evaluateTargetVisibility(
    currentSample.earth.azimuth_deg,
    currentSample.earth.elevation_deg,
    horizonMask,
    0.0,
    minEarthEl
  );

  // Precompute visibility arrays for the dual-track render
  const sunFlags = ephemeris.map((ep) =>
    evaluateTargetVisibility(ep.sun.azimuth_deg, ep.sun.elevation_deg, horizonMask, limbOffset).visible
  );
  const earthFlags = ephemeris.map((ep) =>
    evaluateTargetVisibility(ep.earth.azimuth_deg, ep.earth.elevation_deg, horizonMask, 0.0, minEarthEl).visible
  );

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetIdx = Math.round(ratio * (n - 1));
    onSelectIndex(targetIdx);
  };

  const currentPercent = n > 1 ? (selectedIndex / (n - 1)) * 100 : 0;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col gap-6">
      {/* Header and Scrub Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Interactive Mission Timeline & Telemetry Scrubber
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
              15-Min Cadence
            </span>
          </div>
          <p className="text-xs text-stone-400 font-mono mt-0.5">
            Scrub across the 14-day mission window to evaluate solar illumination and Earth line-of-sight margins.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onSelectIndex(Math.max(0, selectedIndex - 4))}
            title="Step Back 1 Hour"
            className="p-1.5 rounded-lg bg-stone-900 border border-stone-700/80 hover:border-stone-500 text-stone-300 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause" : "Play Timeline"}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/20"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
          </button>

          <button
            onClick={() => onSelectIndex(Math.min(n - 1, selectedIndex + 4))}
            title="Step Forward 1 Hour"
            className="p-1.5 rounded-lg bg-stone-900 border border-stone-700/80 hover:border-stone-500 text-stone-300 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-stone-900 rounded-lg border border-stone-700/80 p-0.5 text-xs font-mono ml-1">
            {([1, 5, 20] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded ${
                  playbackSpeed === spd ? "bg-emerald-950 text-emerald-300 font-bold border border-emerald-800" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dual-Track Visual Timeline Bars */}
      <div className="flex flex-col gap-3">
        {/* Track 1: Sun Illumination Track */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono text-stone-300 mb-1">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Sun className="w-3.5 h-3.5" />
              Solar Illumination Track
            </span>
            <span className="text-[11px] text-stone-400">
              {sunFlags[selectedIndex] ? "ACTIVE SUNLIGHT" : "TERRAIN NIGHT"}
            </span>
          </div>
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            className="h-7 w-full bg-stone-950 rounded-lg overflow-hidden flex relative cursor-pointer border border-stone-800 hover:border-stone-600 transition-colors"
          >
            {/* Segments rendered as continuous SVG or div bars */}
            {ephemeris.map((_, i) => (
              <div
                key={i}
                style={{ width: `${100 / n}%` }}
                className={`h-full ${
                  sunFlags[i]
                    ? "bg-amber-500/85 hover:bg-amber-400"
                    : "bg-stone-900/90 hover:bg-stone-800"
                }`}
              />
            ))}

            {/* Scrubber Needle Cursor */}
            <div
              style={{ left: `${currentPercent}%` }}
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg shadow-white/50 -translate-x-1/2 pointer-events-none z-10"
            >
              <div className="w-2.5 h-2.5 bg-amber-400 rounded-full -ml-[3px] -mt-1 shadow-md shadow-amber-400/80 border border-stone-950" />
            </div>
          </div>
        </div>

        {/* Track 2: Earth Line-of-Sight Track */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono text-stone-300 mb-1">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Radio className="w-3.5 h-3.5" />
              Earth Line-of-Sight (DTE Proxy Track)
            </span>
            <span className="text-[11px] text-stone-400">
              {earthFlags[selectedIndex] ? "CLEAR LINE-OF-SIGHT" : "OCCULTED BY TERRAIN"}
            </span>
          </div>
          <div
            onClick={handleTrackClick}
            className="h-7 w-full bg-stone-950 rounded-lg overflow-hidden flex relative cursor-pointer border border-stone-800 hover:border-stone-600 transition-colors"
          >
            {ephemeris.map((_, i) => (
              <div
                key={i}
                style={{ width: `${100 / n}%` }}
                className={`h-full ${
                  earthFlags[i]
                    ? "bg-emerald-500/85 hover:bg-emerald-400"
                    : "bg-red-950/80 hover:bg-red-900"
                }`}
              />
            ))}

            {/* Scrubber Needle Cursor */}
            <div
              style={{ left: `${currentPercent}%` }}
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg shadow-white/50 -translate-x-1/2 pointer-events-none z-10"
            >
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full -ml-[3px] -mt-1 shadow-md shadow-amber-400/80 border border-stone-950" />
            </div>
          </div>
        </div>

        {/* Time Scale Axis Labels */}
        <div className="flex justify-between text-[11px] font-mono text-stone-500 px-0.5">
          <span>Day 0 ({ephemeris[0]?.timestamp_utc.slice(0, 10) ?? ""})</span>
          <span>Day 3.5</span>
          <span>Day 7 ({ephemeris[Math.floor(ephemeris.length / 2)]?.timestamp_utc.slice(0, 10) ?? ""})</span>
          <span>Day 10.5</span>
          <span>Day 14 ({ephemeris[ephemeris.length - 1]?.timestamp_utc.slice(0, 10) ?? ""})</span>
        </div>
      </div>

      {/* Real-Time Telemetry Readout Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-900/60 p-4 rounded-xl border border-stone-800/80">
        {/* Sun Telemetry Readout */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono font-bold text-amber-300 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-400" />
              Sun Topocentric Telemetry
            </span>
            <span
              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                sunEval.visible
                  ? "bg-amber-950 text-amber-300 border border-amber-700/80"
                  : "bg-stone-950 text-stone-400 border border-stone-800"
              }`}
            >
              {sunEval.visible ? "ACTIVE ILLUMINATION" : "TERRAIN BLOCKED"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
            <div className="bg-stone-950/80 p-2 rounded border border-stone-800/60">
              <span className="text-[10px] text-stone-400 block">Azimuth</span>
              <span className="text-stone-100 font-bold">{currentSample.sun.azimuth_deg.toFixed(2)}°</span>
            </div>
            <div className="bg-stone-950/80 p-2 rounded border border-stone-800/60">
              <span className="text-[10px] text-stone-400 block">Elevation</span>
              <span className="text-stone-100 font-bold">{currentSample.sun.elevation_deg.toFixed(2)}°</span>
            </div>
            <div className="bg-stone-950/80 p-2 rounded border border-stone-800/60">
              <span className="text-[10px] text-stone-400 block">Horizon Angle</span>
              <span className="text-stone-100 font-bold">{sunEval.horizon_deg.toFixed(2)}°</span>
            </div>
            <div className="bg-stone-950/80 p-2 rounded border border-stone-800/60">
              <span className="text-[10px] text-stone-400 block">Clearance Margin</span>
              <span
                className={`font-bold ${
                  sunEval.visibility_margin_deg > 0 ? "text-amber-400" : "text-stone-400"
                }`}
              >
                {sunEval.visibility_margin_deg > 0 ? `+${sunEval.visibility_margin_deg.toFixed(2)}` : sunEval.visibility_margin_deg.toFixed(2)}°
              </span>
            </div>
          </div>

          {/* Prominent Visibility Margin Formula Readout (Sun) */}
          <div className="mt-1 p-2 rounded-lg bg-stone-950/90 border border-amber-900/40 text-xs font-mono">
            <div className="text-[10px] text-amber-400/90 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Visibility Margin Readout</span>
              <span className="text-[10px] text-stone-400 font-normal">target el − horizon el = clearance</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1 text-stone-300">
              <span>
                <span className="text-amber-300 font-bold">{currentSample.sun.elevation_deg.toFixed(2)}°</span> (Sun el)
                {" − "}
                <span className="text-stone-300 font-bold">{sunEval.horizon_deg.toFixed(2)}°</span> (Terrain horizon)
              </span>
              <span className={`font-extrabold text-sm px-2 py-0.5 rounded ${
                sunEval.visibility_margin_deg > 0
                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                  : "bg-stone-900 text-stone-400 border border-stone-800"
              }`}>
                = {sunEval.visibility_margin_deg > 0 ? `+${sunEval.visibility_margin_deg.toFixed(2)}` : sunEval.visibility_margin_deg.toFixed(2)}° clearance
              </span>
            </div>
          </div>
        </div>

        {/* Earth Telemetry Readout */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono font-bold text-emerald-300 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              Earth Topocentric Telemetry
            </span>
            <span
              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                earthEval.visible
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-700/80"
                  : "bg-red-950 text-red-300 border border-red-800"
              }`}
            >
              {earthEval.visible ? "CLEAR LINE-OF-SIGHT" : "TERRAIN OCCULTED"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
            <div className="bg-stone-950/80 p-2 rounded border border-stone-800/60">
              <span className="text-[10px] text-stone-400 block">Azimuth</span>
              <span className="text-stone-100 font-bold">{currentSample.earth.azimuth_deg.toFixed(2)}°</span>
            </div>
            <div className="bg-stone-950/80 p-2 rounded border border-stone-800/60">
              <span className="text-[10px] text-stone-400 block">Elevation</span>
              <span className="text-stone-100 font-bold">{currentSample.earth.elevation_deg.toFixed(2)}°</span>
            </div>
            <div className="bg-stone-950/80 p-2 rounded border border-stone-800/60">
              <span className="text-[10px] text-stone-400 block">Horizon Angle</span>
              <span className="text-stone-100 font-bold">{earthEval.horizon_deg.toFixed(2)}°</span>
            </div>
            <div className="bg-stone-950/80 p-2 rounded border border-stone-800/60">
              <span className="text-[10px] text-stone-400 block">Clearance Margin</span>
              <span
                className={`font-bold ${
                  earthEval.visibility_margin_deg > 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {earthEval.visibility_margin_deg > 0 ? `+${earthEval.visibility_margin_deg.toFixed(2)}` : earthEval.visibility_margin_deg.toFixed(2)}°
              </span>
            </div>
          </div>

          {/* Prominent Visibility Margin Formula Readout (Earth) */}
          <div className="mt-1 p-2 rounded-lg bg-stone-950/90 border border-emerald-900/40 text-xs font-mono">
            <div className="text-[10px] text-emerald-400/90 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Visibility Margin Readout</span>
              <span className="text-[10px] text-stone-400 font-normal">target el − horizon el = clearance</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1 text-stone-300">
              <span>
                <span className="text-emerald-300 font-bold">{currentSample.earth.elevation_deg.toFixed(2)}°</span> (Earth el)
                {" − "}
                <span className="text-stone-300 font-bold">{earthEval.horizon_deg.toFixed(2)}°</span> (Terrain horizon)
              </span>
              <span className={`font-extrabold text-sm px-2 py-0.5 rounded ${
                earthEval.visibility_margin_deg > 0
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : "bg-red-950 text-red-300 border border-red-800"
              }`}>
                = {earthEval.visibility_margin_deg > 0 ? `+${earthEval.visibility_margin_deg.toFixed(2)}` : earthEval.visibility_margin_deg.toFixed(2)}° clearance
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Timestamp Banner */}
      <div className="flex items-center justify-between text-xs font-mono text-stone-400 bg-stone-950/50 px-3 py-1.5 rounded-lg border border-stone-800">
        <span>Inspected UTC Timestamp:</span>
        <span className="font-bold text-emerald-300 font-mono text-sm tracking-wide">
          {currentSample.timestamp_utc} (Step {selectedIndex + 1} of {n})
        </span>
      </div>
    </div>
  );
}
