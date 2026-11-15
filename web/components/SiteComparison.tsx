"use client";

import React, { useState, useEffect } from "react";
import { SiteCatalogItem, SiteData } from "../lib/types";
import { GitCompare, Sun, Radio, Mountain, ArrowRight, ShieldCheck, Check, ExternalLink } from "lucide-react";

interface SiteComparisonProps {
  catalog: SiteCatalogItem[];
  currentSiteData: SiteData;
  fileSuffix: string;
  windowLabel: string;
}

export function SiteComparison({ catalog, currentSiteData, fileSuffix, windowLabel }: SiteComparisonProps) {
  const [siteAId, setSiteAId] = useState<string>(currentSiteData.site.site_id);
  const [siteBId, setSiteBId] = useState<string>("mons_mouton");

  const [siteAData, setSiteAData] = useState<SiteData>(currentSiteData);
  const [siteBData, setSiteBData] = useState<SiteData | null>(null);
  const [loadingB, setLoadingB] = useState<boolean>(false);

  // Sync site A if current site or window changes from navbar
  useEffect(() => {
    setSiteAId(currentSiteData.site.site_id);
    setSiteAData(currentSiteData);
  }, [currentSiteData]);

  // Fetch site B dataset when selection or window changes
  useEffect(() => {
    async function fetchSiteB() {
      if (siteBId === siteAId) {
        setSiteBData(siteAData);
        return;
      }
      setLoadingB(true);
      try {
        const res = await fetch(`/data/${siteBId}${fileSuffix}.json`);
        const data: SiteData = await res.json();
        setSiteBData(data);
      } catch (err) {
        console.error("Failed to load site B data:", err);
      } finally {
        setLoadingB(false);
      }
    }
    fetchSiteB();
  }, [siteBId, siteAId, siteAData, fileSuffix]);

  const metricsA = siteAData.metrics;
  const metricsB = siteBData?.metrics;

  const maxObsA = Math.max(...(siteAData.horizon_mask.points?.map((p) => p.obstruction_elevation_deg) || [0]));
  const maxObsB = siteBData
    ? Math.max(...(siteBData.horizon_mask.points?.map((p) => p.obstruction_elevation_deg) || [0]))
    : 0;

  const comparisonRows = [
    {
      metric: "Total Usable Sunlight",
      unit: "hours",
      valA: metricsA.total_sunlight_hours,
      valB: metricsB?.total_sunlight_hours,
      format: (v?: number) => (v !== undefined ? `${v.toFixed(1)} h` : "—"),
      better: "higher"
    },
    {
      metric: "Sunlight Coverage",
      unit: "%",
      valA: metricsA.sunlight_coverage_percent,
      valB: metricsB?.sunlight_coverage_percent,
      format: (v?: number) => (v !== undefined ? `${v.toFixed(1)}%` : "—"),
      better: "higher"
    },
    {
      metric: "Longest Continuous Sunlight",
      unit: "hours",
      valA: metricsA.longest_sunlight_hours,
      valB: metricsB?.longest_sunlight_hours,
      format: (v?: number) => (v !== undefined ? `${v.toFixed(1)} h` : "—"),
      better: "higher"
    },
    {
      metric: "Geometric Earth Visibility (DTE Proxy)",
      unit: "hours",
      valA: metricsA.total_dte_hours,
      valB: metricsB?.total_dte_hours,
      format: (v?: number) => (v !== undefined ? `${v.toFixed(1)} h` : "—"),
      better: "higher"
    },
    {
      metric: "Earth Line-of-Sight Coverage",
      unit: "%",
      valA: metricsA.dte_coverage_percent,
      valB: metricsB?.dte_coverage_percent,
      format: (v?: number) => (v !== undefined ? `${v.toFixed(1)}%` : "—"),
      better: "higher"
    },
    {
      metric: "Longest Earth Blackout Window",
      unit: "hours",
      valA: metricsA.longest_dte_blackout_hours,
      valB: metricsB?.longest_dte_blackout_hours,
      format: (v?: number) => (v !== undefined ? `${v.toFixed(1)} h` : "—"),
      better: "lower"
    },
    {
      metric: "Simultaneous Sun + Earth Window",
      unit: "hours",
      valA: metricsA.total_simultaneous_hours,
      valB: metricsB?.total_simultaneous_hours,
      format: (v?: number) => (v !== undefined ? `${v.toFixed(1)} h` : "—"),
      better: "higher"
    },
    {
      metric: "Surface Elevation (1737.4 km datum)",
      unit: "meters",
      valA: siteAData.site.elevation_m,
      valB: siteBData?.site.elevation_m,
      format: (v?: number) => (v !== undefined ? `${v >= 0 ? "+" : ""}${v.toFixed(0)} m` : "—"),
      better: "neutral"
    },
    {
      metric: "Maximum Mountain Obstruction",
      unit: "degrees",
      valA: maxObsA,
      valB: maxObsB,
      format: (v?: number) => (v !== undefined ? `${v.toFixed(1)}°` : "—"),
      better: "lower"
    }
  ];

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col gap-6">
      {/* Header and Site Pickers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-emerald-400" />
              Side-by-Side Lunar Landing Site Decision Matrix
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
              NASA Historical & Candidate Sites
            </span>
          </div>
          <p className="text-xs text-stone-400 font-mono mt-0.5">
            Transparent physical trade-off comparisons across: <span className="text-emerald-300 font-semibold">{windowLabel}</span>
          </p>
        </div>

        {/* Site Selectors */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400">Site A:</span>
            <select
              value={siteAId}
              onChange={(e) => {
                const s = catalog.find((c) => c.site_id === e.target.value);
                if (s) {
                  setSiteAId(s.site_id);
                  fetch(`/data/${s.site_id}${fileSuffix}.json`)
                    .then((r) => r.json())
                    .then((d) => setSiteAData(d));
                }
              }}
              className="bg-stone-900 text-stone-200 text-xs font-medium py-1 px-2.5 rounded-lg border border-stone-700 hover:border-amber-400 focus:outline-none cursor-pointer"
            >
              {catalog.map((c) => (
                <option key={c.site_id} value={c.site_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <span className="text-stone-500 font-mono text-xs">vs</span>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-400">Site B:</span>
            <select
              value={siteBId}
              onChange={(e) => setSiteBId(e.target.value)}
              className="bg-stone-900 text-stone-200 text-xs font-medium py-1 px-2.5 rounded-lg border border-stone-700 hover:border-emerald-400 focus:outline-none cursor-pointer"
            >
              {catalog.map((c) => (
                <option key={c.site_id} value={c.site_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Explicit Comparison-Site Metadata Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        {/* Site A Card */}
        {(() => {
          const itemA = catalog.find((c) => c.site_id === siteAId);
          return (
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 flex flex-col gap-1.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-900/40">
                <span className="font-bold text-amber-300">Site A: {siteAData.site.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                  {itemA?.category || siteAData.site.category}
                </span>
              </div>
              <div className="text-[11px] text-stone-300 space-y-1 pt-0.5">
                <div>
                  <span className="text-stone-400">Mission:</span>{" "}
                  <span className="text-stone-100 font-semibold">{siteAData.site.mission}</span>
                </div>
                <div>
                  <span className="text-stone-400">Coordinates:</span>{" "}
                  <span className="text-stone-100 font-bold">
                    {siteAData.site.latitude_deg.toFixed(4)}°S, {siteAData.site.longitude_deg.toFixed(4)}°E
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Canonical LOLA Elevation:</span>{" "}
                  <span className="text-stone-100 font-bold">
                    {itemA?.canonical_lola_elevation_m !== undefined
                      ? `${itemA.canonical_lola_elevation_m.toFixed(2)} m`
                      : `${siteAData.site.elevation_m.toFixed(2)} m`}
                  </span>
                  {itemA?.canonical_lroc_elevation_m && (
                    <span className="text-stone-400 text-[10px] ml-1.5">
                      (LROC NAC: {itemA.canonical_lroc_elevation_m.toFixed(1)} m, difference -52.72 m)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-stone-400">Source Organization:</span>{" "}
                  <span className="text-stone-200">{itemA?.source_organization || "NASA / PDS Geosciences / JPL"}</span>
                </div>
                {itemA?.source_url && (
                  <div className="pt-0.5">
                    <a
                      href={itemA.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline inline-flex items-center gap-1 text-[10px]"
                    >
                      NASA Documentation <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {itemA?.provenance_notes && (
                  <div className="text-[10px] text-stone-400 pt-1 border-t border-amber-900/30">
                    {itemA.provenance_notes}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Site B Card */}
        {(() => {
          const itemB = catalog.find((c) => c.site_id === siteBId);
          return (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex flex-col gap-1.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-emerald-900/40">
                <span className="font-bold text-emerald-300">Site B: {siteBData?.site.name || "Loading..."}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  {itemB?.category || siteBData?.site.category || "NASA Candidate"}
                </span>
              </div>
              <div className="text-[11px] text-stone-300 space-y-1 pt-0.5">
                <div>
                  <span className="text-stone-400">Mission:</span>{" "}
                  <span className="text-stone-100 font-semibold">{siteBData?.site.mission || itemB?.mission}</span>
                </div>
                <div>
                  <span className="text-stone-400">Coordinates:</span>{" "}
                  <span className="text-stone-100 font-bold">
                    {siteBData ? `${siteBData.site.latitude_deg.toFixed(4)}°S, ${siteBData.site.longitude_deg.toFixed(4)}°E` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Canonical LOLA Elevation:</span>{" "}
                  <span className="text-stone-100 font-bold">
                    {itemB?.canonical_lola_elevation_m !== undefined
                      ? `${itemB.canonical_lola_elevation_m.toFixed(2)} m`
                      : siteBData
                      ? `${siteBData.site.elevation_m.toFixed(2)} m`
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Source Organization:</span>{" "}
                  <span className="text-stone-200">{itemB?.source_organization || "NASA / PDS Geosciences / JPL"}</span>
                </div>
                {itemB?.source_url && (
                  <div className="pt-0.5">
                    <a
                      href={itemB.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline inline-flex items-center gap-1 text-[10px]"
                    >
                      NASA Documentation <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {itemB?.provenance_notes && (
                  <div className="text-[10px] text-stone-400 pt-1 border-t border-emerald-900/30">
                    {itemB.provenance_notes}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-stone-800 text-stone-400 uppercase text-[11px]">
              <th className="py-2.5 px-3">Decision Metric</th>
              <th className="py-2.5 px-3 text-amber-300 font-bold bg-amber-950/20">
                {siteAData.site.name} ({siteAData.site.latitude_deg.toFixed(1)}°S)
              </th>
              <th className="py-2.5 px-3 text-emerald-300 font-bold bg-emerald-950/20">
                {siteBData ? siteBData.site.name : "Loading..."} {siteBData ? `(${siteBData.site.latitude_deg.toFixed(1)}°S)` : ""}
              </th>
              <th className="py-2.5 px-3 text-stone-400 text-right">Physical Trade-Off</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {comparisonRows.map((row, idx) => {
              const diff = row.valB !== undefined ? row.valA - row.valB : 0;
              let advantage = "neutral";
              if (row.better === "higher") {
                if (diff > 0.05) advantage = "A";
                else if (diff < -0.05) advantage = "B";
              } else if (row.better === "lower") {
                if (diff < -0.05) advantage = "A";
                else if (diff > 0.05) advantage = "B";
              }

              return (
                <tr key={idx} className="hover:bg-stone-900/40 transition-colors">
                  <td className="py-3 px-3 text-stone-300 font-medium">{row.metric}</td>
                  <td className="py-3 px-3 font-bold text-stone-100 bg-amber-950/10">
                    <span className={advantage === "A" ? "text-amber-300 font-extrabold" : ""}>
                      {row.format(row.valA)}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-stone-100 bg-emerald-950/10">
                    <span className={advantage === "B" ? "text-emerald-300 font-extrabold" : ""}>
                      {row.format(row.valB)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {advantage === "A" && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                        <Check className="w-3 h-3" />
                        {siteAData.site.name} +{Math.abs(diff).toFixed(1)} {row.unit === "%" ? "%" : row.unit === "hours" ? "h" : ""}
                      </span>
                    )}
                    {advantage === "B" && siteBData && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                        <Check className="w-3 h-3" />
                        {siteBData.site.name} +{Math.abs(diff).toFixed(1)} {row.unit === "%" ? "%" : row.unit === "hours" ? "h" : ""}
                      </span>
                    )}
                    {advantage === "neutral" && <span className="text-stone-500">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Honest Scientific Disclaimer */}
      <div className="bg-stone-950/70 p-3.5 rounded-xl border border-stone-800 text-[11px] font-mono text-stone-400 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-stone-300">SCIENTIFIC TRANSPARENCY NOTICE: </span>
          This tool exposes underlying physical metrics (usable sunlight duration, terrain clearance margins, and line-of-sight continuity). In accordance with Space Apps engineering standards, it does not invent arbitrary composite viability scores (e.g. "Site A = 84/100").
        </div>
      </div>
    </div>
  );
}
