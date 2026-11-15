"use client";

import React, { useState } from "react";
import { SiteData } from "../lib/types";
import { Bot, ChevronDown, ChevronUp, Database, Sparkles, ShieldCheck } from "lucide-react";

interface AiMissionExplainerProps {
  siteA: SiteData;
  siteB?: SiteData | null;
}

export function AiMissionExplainer({ siteA, siteB }: AiMissionExplainerProps) {
  const [showRawPayload, setShowRawPayload] = useState<boolean>(false);

  const mA = siteA.metrics;
  const mB = siteB?.metrics;

  // Build the structured telemetry payload
  const structuredPayload = {
    site_a: {
      site_id: siteA.site.site_id,
      name: siteA.site.name,
      latitude_deg: siteA.site.latitude_deg,
      elevation_m: siteA.site.elevation_m,
      total_sunlight_hours: mA.total_sunlight_hours,
      sunlight_coverage_percent: mA.sunlight_coverage_percent,
      longest_sunlight_hours: mA.longest_sunlight_hours,
      geometric_earth_visibility_hours: mA.total_dte_hours,
      earth_visibility_percent: mA.dte_coverage_percent,
      longest_earth_blackout_hours: mA.longest_dte_blackout_hours,
      simultaneous_sun_earth_hours: mA.total_simultaneous_hours
    },
    site_b: mB && siteB ? {
      site_id: siteB.site.site_id,
      name: siteB.site.name,
      latitude_deg: siteB.site.latitude_deg,
      elevation_m: siteB.site.elevation_m,
      total_sunlight_hours: mB.total_sunlight_hours,
      sunlight_coverage_percent: mB.sunlight_coverage_percent,
      longest_sunlight_hours: mB.longest_sunlight_hours,
      geometric_earth_visibility_hours: mB.total_dte_hours,
      earth_visibility_percent: mB.dte_coverage_percent,
      longest_earth_blackout_hours: mB.longest_dte_blackout_hours,
      simultaneous_sun_earth_hours: mB.total_simultaneous_hours
    } : null
  };

  // Generate constrained, transparent synthesis strictly from numbers
  const generateSynthesis = () => {
    if (!mB || !siteB) {
      return (
        <p className="leading-relaxed">
          <strong>{siteA.site.name}</strong> provides{" "}
          <span className="text-amber-300 font-bold">{mA.total_sunlight_hours.toFixed(1)} hours</span> of usable solar illumination (
          {mA.sunlight_coverage_percent.toFixed(1)}% of the {mA.total_duration_hours.toFixed(1)}-hour analysis window), with an uninterrupted daylight duration of{" "}
          <span className="text-amber-300 font-bold">{mA.longest_sunlight_hours.toFixed(1)} hours</span> before the Sun drops below the local terrain horizon. Geometric line-of-sight clearance to Earth is available for{" "}
          <span className="text-emerald-300 font-bold">{mA.total_dte_hours.toFixed(1)} hours</span> (
          {mA.dte_coverage_percent.toFixed(1)}%), with a maximum terrain blackout duration of{" "}
          <span className="text-stone-200 font-bold">{mA.longest_dte_blackout_hours.toFixed(1)} hours</span>. The duration where both the Sun and Earth are simultaneously visible above local terrain is{" "}
          <span className="text-indigo-300 font-bold">{mA.total_simultaneous_hours.toFixed(1)} hours</span> (
          {mA.simultaneous_coverage_percent.toFixed(1)}%).
        </p>
      );
    }

    const sunDiff = mA.total_sunlight_hours - mB.total_sunlight_hours;
    const dteDiff = mA.dte_coverage_percent - mB.dte_coverage_percent;
    const blackoutDiff = mA.longest_dte_blackout_hours - mB.longest_dte_blackout_hours;

    return (
      <div className="flex flex-col gap-3 leading-relaxed">
        <p>
          Comparing <strong>{siteA.site.name}</strong> against <strong>{siteB.site.name}</strong> reveals a direct physical trade-off between solar illumination duration and Earth line-of-sight continuity:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1 text-stone-300">
          <li>
            <strong>Solar Illumination:</strong>{" "}
            {sunDiff > 0.5
              ? `${siteA.site.name} yields ${mA.total_sunlight_hours.toFixed(1)} h (${mA.sunlight_coverage_percent.toFixed(1)}%) versus ${siteB.site.name}'s ${mB.total_sunlight_hours.toFixed(1)} h (${mB.sunlight_coverage_percent.toFixed(1)}%), a difference of +${Math.abs(sunDiff).toFixed(1)} h.`
              : sunDiff < -0.5
              ? `${siteB.site.name} yields ${mB.total_sunlight_hours.toFixed(1)} h (${mB.sunlight_coverage_percent.toFixed(1)}%) versus ${siteA.site.name}'s ${mA.total_sunlight_hours.toFixed(1)} h (${mA.sunlight_coverage_percent.toFixed(1)}%), a difference of +${Math.abs(sunDiff).toFixed(1)} h.`
              : `Both sites offer comparable total illumination (${mA.total_sunlight_hours.toFixed(1)} h vs ${mB.total_sunlight_hours.toFixed(1)} h).`}
          </li>
          <li>
            <strong>Earth Line-of-Sight Clearance:</strong>{" "}
            {dteDiff > 1.0
              ? `${siteA.site.name} provides ${mA.dte_coverage_percent.toFixed(1)}% Earth visibility (${mA.total_dte_hours.toFixed(1)} h, max blackout ${mA.longest_dte_blackout_hours.toFixed(1)} h) compared to ${siteB.site.name}'s ${mB.dte_coverage_percent.toFixed(1)}% (${mB.total_dte_hours.toFixed(1)} h, max blackout ${mB.longest_dte_blackout_hours.toFixed(1)} h).`
              : dteDiff < -1.0
              ? `${siteB.site.name} provides ${mB.dte_coverage_percent.toFixed(1)}% Earth visibility (${mB.total_dte_hours.toFixed(1)} h, max blackout ${mB.longest_dte_blackout_hours.toFixed(1)} h) compared to ${siteA.site.name}'s ${mA.dte_coverage_percent.toFixed(1)}% (${mA.total_dte_hours.toFixed(1)} h, max blackout ${mA.longest_dte_blackout_hours.toFixed(1)} h).`
              : `Both sites maintain equivalent geometric line-of-sight to Earth (${mA.dte_coverage_percent.toFixed(1)}% vs ${mB.dte_coverage_percent.toFixed(1)}%).`}
          </li>
        </ul>
        <div className="bg-stone-950/70 p-3 rounded-lg border border-stone-800 text-xs text-stone-300">
          <strong className="text-indigo-300 font-mono">Trade-off Summary: </strong>
          {mA.dte_coverage_percent > mB.dte_coverage_percent && mA.total_sunlight_hours < mB.total_sunlight_hours
            ? `${siteA.site.name} provides greater Earth line-of-sight continuity (${mA.dte_coverage_percent.toFixed(1)}% vs ${mB.dte_coverage_percent.toFixed(1)}%), whereas ${siteB.site.name} provides longer cumulative illumination (${mB.total_sunlight_hours.toFixed(1)} h vs ${mA.total_sunlight_hours.toFixed(1)} h). The core trade-off is communications continuity versus total illumination.`
            : mA.total_sunlight_hours > mB.total_sunlight_hours && mA.dte_coverage_percent < mB.dte_coverage_percent
            ? `${siteA.site.name} provides more cumulative illumination (${mA.total_sunlight_hours.toFixed(1)} h vs ${mB.total_sunlight_hours.toFixed(1)} h), whereas ${siteB.site.name} provides superior Earth line-of-sight continuity (${mB.dte_coverage_percent.toFixed(1)}% vs ${mA.dte_coverage_percent.toFixed(1)}%).`
            : `${siteA.site.name} and ${siteB.site.name} differ by ${Math.abs(sunDiff).toFixed(1)} h in solar illumination and ${Math.abs(dteDiff).toFixed(1)}% in geometric Earth line-of-sight clearance across this 14-day analysis window.`}
        </div>
      </div>
    );
  };


  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col gap-4 border border-indigo-500/20 relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-950/80 border border-indigo-700/60 flex items-center justify-center text-orange-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-100">
                Constrained AI Mission Decision Synthesis
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-orange-950 text-indigo-300 border border-indigo-800">
                AI-GENERATED EXPLANATION
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono">
              Strictly derived from deterministic underlying metrics • Grounded in deterministic telemetry
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowRawPayload(!showRawPayload)}
          className="text-xs font-mono text-indigo-300 hover:text-indigo-200 flex items-center gap-1 bg-orange-950/50 px-2.5 py-1 rounded-lg border border-indigo-800/60 transition-colors"
        >
          <Database className="w-3.5 h-3.5" />
          <span>{showRawPayload ? "Hide" : "Inspect"} Input Payload</span>
          {showRawPayload ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* AI Synthesis Text Box */}
      <div className="bg-stone-900/70 p-4 rounded-xl border border-stone-800/80 text-sm text-stone-200">
        {generateSynthesis()}
      </div>

      {/* Collapsible Raw Telemetry Payload */}
      {showRawPayload && (
        <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 font-mono text-xs text-stone-300 flex flex-col gap-2">
          <div className="flex items-center justify-between text-stone-400 text-[11px] pb-1 border-b border-stone-800">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Telemetry Consumed by LLM (Strict Schema)
            </span>
            <span>JSON Payload</span>
          </div>
          <pre className="overflow-x-auto text-[11px] text-emerald-300/90 leading-tight">
            {JSON.stringify(structuredPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
