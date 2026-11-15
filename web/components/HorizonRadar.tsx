"use client";

import React from "react";
import { HorizonMask, TargetEphemeris } from "../lib/types";
import { Compass, Eye, Sun, Radio, Mountain } from "lucide-react";

interface HorizonRadarProps {
  horizonMask: HorizonMask;
  ephemeris: TargetEphemeris[];
  selectedIndex: number;
  useUpperLimb: boolean;
  minEarthEl: number;
}

export function HorizonRadar({
  horizonMask,
  ephemeris,
  selectedIndex,
  useUpperLimb,
  minEarthEl
}: HorizonRadarProps) {
  const currentSample = ephemeris[selectedIndex] || ephemeris[0];

  // SVG dimensions
  const size = 440;
  const center = size / 2;
  const maxRadius = center - 35; // outer circle radius

  // Map elevation [0°, 20°] to radius from center:
  // In this radial radar view:
  // Center = 0° elevation (local ground horizon level)
  // Outer ring = +20° elevation (high sky above mountains)
  // Terrain obstruction is shaded from center (0°) up to the mountain rim.
  // Any celestial object at radius > terrain obstruction radius is physically CLEAR and above the mountain!
  const maxDisplayEl = 20.0;
  const elToRadius = (elDeg: number) => {
    const clamped = Math.max(0, Math.min(maxDisplayEl, elDeg));
    return (clamped / maxDisplayEl) * maxRadius;
  };

  // Convert (Azimuth, Elevation) to SVG (x, y) coordinates
  // Azimuth: 0°=North (-Y), 90°=East (+X), 180°=South (+Y), 270°=West (-X)
  const polarToSvg = (azDeg: number, elDeg: number) => {
    const r = elToRadius(elDeg);
    const angleRad = (azDeg - 90) * (Math.PI / 180); // 0° is North (top)
    const x = center + r * Math.cos(angleRad);
    const y = center + r * Math.sin(angleRad);
    return { x, y, r };
  };

  // Build Terrain Obstruction Polygon path
  const maskPoints = horizonMask.points || [];
  let terrainPathD = "";
  if (maskPoints.length > 0) {
    const coords = maskPoints.map((p) => polarToSvg(p.azimuth_deg, p.obstruction_elevation_deg));
    terrainPathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "") + " Z";
  }

  // Build full 14-day Sun trajectory path
  const sunPathD = ephemeris.reduce((acc, ep, i) => {
    const pt = polarToSvg(ep.sun.azimuth_deg, ep.sun.elevation_deg);
    return `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`;
  }, "");

  // Build full 14-day Earth libration trajectory path
  const earthPathD = ephemeris.reduce((acc, ep, i) => {
    const pt = polarToSvg(ep.earth.azimuth_deg, ep.earth.elevation_deg);
    return `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`;
  }, "");

  // Current Sun and Earth positions
  const currentSunPos = polarToSvg(currentSample.sun.azimuth_deg, currentSample.sun.elevation_deg);
  const currentEarthPos = polarToSvg(currentSample.earth.azimuth_deg, currentSample.earth.elevation_deg);

  // Terrain height at Sun and Earth current azimuth
  const sunHorizonPt = polarToSvg(
    currentSample.sun.azimuth_deg,
    (horizonMask.points.find((p) => Math.round(p.azimuth_deg) === Math.round(currentSample.sun.azimuth_deg))?.obstruction_elevation_deg || 0)
  );
  const earthHorizonPt = polarToSvg(
    currentSample.earth.azimuth_deg,
    (horizonMask.points.find((p) => Math.round(p.azimuth_deg) === Math.round(currentSample.earth.azimuth_deg))?.obstruction_elevation_deg || 0)
  );

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col items-center gap-4 relative overflow-hidden">
      <div className="w-full flex items-center justify-between border-b border-stone-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            Polar Horizon Obstruction Radar
          </h2>
          <p className="text-xs text-stone-400 font-mono">
            360° Topocentric Horizon Silhouette vs Sun / Earth Trajectories
          </p>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-stone-900 text-stone-300 border border-stone-700">
          Scale: 0° to +20° El
        </span>
      </div>

      {/* SVG Polar Radar */}
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="overflow-visible select-none">
          <defs>
            {/* Shaded mountain pattern */}
            <radialGradient id="mountainGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#334155" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.4" />
            </radialGradient>

            {/* Glowing filter */}
            <filter id="glowSun" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowEarth" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background concentric elevation rings */}
          {[5, 10, 15, 20].map((el) => {
            const r = elToRadius(el);
            return (
              <g key={el}>
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray={el === 20 ? "none" : "2,4"}
                  opacity={el === 20 ? 0.6 : 0.35}
                />
                <text
                  x={center + 4}
                  y={center - r + 12}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  +{el}°
                </text>
              </g>
            );
          })}

          {/* Crosshair Cardinal Rays */}
          <line x1={center} y1={center - maxRadius} x2={center} y2={center + maxRadius} stroke="#334155" strokeWidth="1" opacity="0.4" />
          <line x1={center - maxRadius} y1={center} x2={center + maxRadius} y2={center} stroke="#334155" strokeWidth="1" opacity="0.4" />

          {/* Cardinal Directions Labels */}
          <text x={center} y={center - maxRadius - 10} textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="bold" fontFamily="monospace">N (0°)</text>
          <text x={center + maxRadius + 18} y={center + 4} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">E (90°)</text>
          <text x={center} y={center + maxRadius + 18} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">S (180°)</text>
          <text x={center - maxRadius - 18} y={center + 4} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">W (270°)</text>

          {/* Terrain Obstruction Polygon (Filled Mountains) */}
          {terrainPathD && (
            <path
              d={terrainPathD}
              fill="url(#mountainGrad)"
              stroke="#64748b"
              strokeWidth="2"
              className="transition-all duration-300"
            />
          )}

          {/* Sun Trajectory Arc (Full 14 Days) */}
          <path
            d={sunPathD}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="3,3"
            opacity="0.45"
          />

          {/* Earth Libration Loop (Full 14 Days) */}
          <path
            d={earthPathD}
            fill="none"
            stroke="#34d399"
            strokeWidth="1.5"
            strokeDasharray="2,3"
            opacity="0.55"
          />

          {/* Sightline ray from center to current Sun */}
          <line
            x1={center}
            y1={center}
            x2={currentSunPos.x}
            y2={currentSunPos.y}
            stroke="#f59e0b"
            strokeWidth="1.2"
            opacity="0.6"
          />

          {/* Sightline ray from center to current Earth */}
          <line
            x1={center}
            y1={center}
            x2={currentEarthPos.x}
            y2={currentEarthPos.y}
            stroke="#34d399"
            strokeWidth="1.2"
            opacity="0.6"
          />

          {/* Current Sun Position Marker */}
          <g filter="url(#glowSun)">
            <circle
              cx={currentSunPos.x}
              cy={currentSunPos.y}
              r="7"
              fill="#fbbf24"
              stroke="#fff"
              strokeWidth="2"
              className="animate-pulse"
            />
            <circle
              cx={currentSunPos.x}
              cy={currentSunPos.y}
              r="12"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1"
              opacity="0.7"
            />
          </g>

          {/* Current Earth Position Marker */}
          <g filter="url(#glowEarth)">
            <circle
              cx={currentEarthPos.x}
              cy={currentEarthPos.y}
              r="6.5"
              fill="#f59e0b"
              stroke="#fff"
              strokeWidth="2"
            />
            <circle
              cx={currentEarthPos.x}
              cy={currentEarthPos.y}
              r="11"
              fill="none"
              stroke="#34d399"
              strokeWidth="1"
              opacity="0.7"
            />
          </g>

          {/* Observer Center Marker */}
          <circle cx={center} cy={center} r="3.5" fill="#f8fafc" stroke="#0f172a" strokeWidth="1" />
          <text x={center} y={center + 14} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">OBSERVER</text>
        </svg>
      </div>

      {/* Legend & Interpretation Guide */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-2 border-t border-stone-800/80">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-stone-700 border border-stone-500" />
          <span className="text-stone-300">Terrain Obstruction</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-white shadow-sm shadow-amber-400" />
          <span className="text-amber-300">Sun Position</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border border-white shadow-sm shadow-emerald-400" />
          <span className="text-emerald-300">Earth Position</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t border-dashed border-amber-400/80" />
          <span className="text-stone-400">14-Day Trajectory</span>
        </div>
      </div>
    </div>
  );
}
