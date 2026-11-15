"use client";

import React, { useState, useEffect } from "react";
import { MissionWindowItem, SiteCatalogItem, SiteData } from "../lib/types";
import { Navbar } from "../components/Navbar";
import { KpiCards } from "../components/KpiCards";
import { MissionTimeline } from "../components/MissionTimeline";
import { HorizonRadar } from "../components/HorizonRadar";
import { SiteComparison } from "../components/SiteComparison";
import { LunarGlobe3D } from "../components/LunarGlobe3D";
import { AiMissionExplainer } from "../components/AiMissionExplainer";
import { ProvenanceModal } from "../components/ProvenanceModal";
import { MapPin, Calendar, Clock, Layers, ShieldCheck, Compass, Info, Radio, Sparkles } from "lucide-react";

export default function Home() {
  const [catalog, setCatalog] = useState<SiteCatalogItem[]>([]);
  const [windowsCatalog, setWindowsCatalog] = useState<MissionWindowItem[]>([]);
  const [currentSiteId, setCurrentSiteId] = useState<string>("malapert_a");
  const [currentWindowId, setCurrentWindowId] = useState<string>("nov_2026");
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [comparisonSiteData, setComparisonSiteData] = useState<SiteData | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [useUpperLimb, setUseUpperLimb] = useState<boolean>(false);
  const [minEarthEl, setMinEarthEl] = useState<number>(0);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Load sites & mission windows catalogs on mount
  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [sitesRes, windowsRes] = await Promise.all([
          fetch("/data/sites_catalog.json"),
          fetch("/data/windows_catalog.json")
        ]);
        const cat: SiteCatalogItem[] = await sitesRes.json();
        const wins: MissionWindowItem[] = await windowsRes.json();
        setCatalog(cat);
        setWindowsCatalog(wins);
      } catch (e) {
        console.error("Failed to load catalogs:", e);
      }
    }
    loadCatalogs();
  }, []);

  const activeWindow = windowsCatalog.find((w) => w.window_id === currentWindowId) || windowsCatalog[0];
  const fileSuffix = activeWindow ? activeWindow.file_suffix : "";

  // 2. Load site dataset when currentSiteId or currentWindowId changes
  useEffect(() => {
    async function loadSiteData() {
      setLoading(true);
      try {
        const res = await fetch(`/data/${currentSiteId}${fileSuffix}.json`);
        const data: SiteData = await res.json();
        setSiteData(data);
        setSelectedIndex(0);

        // Also preload secondary comparison site (Mons Mouton by default)
        const compItem = catalog.find((c) => c.site_id !== currentSiteId) || catalog[1];
        if (compItem) {
          const compRes = await fetch(`/data/${compItem.site_id}${fileSuffix}.json`);
          const compData: SiteData = await compRes.json();
          setComparisonSiteData(compData);
        }
      } catch (e) {
        console.error("Failed to load site data:", e);
      } finally {
        setLoading(false);
      }
    }

    if (catalog.length > 0 && windowsCatalog.length > 0) {
      loadSiteData();
    }
  }, [currentSiteId, currentWindowId, catalog, windowsCatalog, fileSuffix]);

  if (loading || !siteData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 font-mono gap-4">
        <div className="w-12 h-12 rounded-xl border-2 border-cyan-500 border-t-transparent animate-spin" />
        <p className="text-sm tracking-wider uppercase text-cyan-400">
          Loading NASA Ephemeris & Terrain Horizon Data...
        </p>
      </div>
    );
  }

  const currentSample = siteData.ephemeris[selectedIndex] || siteData.ephemeris[0];

  return (
    <div className="min-h-screen flex flex-col text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navigation Header */}
      <Navbar
        catalog={catalog}
        currentSiteId={currentSiteId}
        onSelectSite={(id) => setCurrentSiteId(id)}
        windowsCatalog={windowsCatalog}
        currentWindowId={currentWindowId}
        onSelectWindow={(wid) => setCurrentWindowId(wid)}
        useUpperLimb={useUpperLimb}
        onToggleUpperLimb={setUseUpperLimb}
        minEarthEl={minEarthEl}
        onChangeMinEarthEl={setMinEarthEl}
        onOpenProvenance={() => setIsProvenanceOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Site Header Banner */}
        <section className="glass-panel rounded-2xl p-5 sm:p-6 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-40 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-bold">
                {siteData.site.category}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{siteData.site.mission}</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                NASA Verified Coordinates
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
              <span>{siteData.site.name}</span>
              <span className="text-sm font-normal text-slate-400 font-mono">
                ({siteData.site.latitude_deg.toFixed(2)}°S, {siteData.site.longitude_deg.toFixed(2)}°E)
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300/90 max-w-3xl leading-relaxed">
              {siteData.site.source_description} Evaluated against high-resolution NASA Lunar Reconnaissance Orbiter (LRO) LOLA terrain altimetry and NASA/JPL Horizons topocentric orbital mechanics.
            </p>

            {/* Analysis Window & Precomputed Dataset Metadata */}
            <div className="mt-2 flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-cyan-800/40 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-semibold border border-cyan-700/60 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                {activeWindow ? activeWindow.label : "Mission Analysis Window"}
              </span>
              <span className="text-slate-200 font-bold">
                {siteData.ephemeris[0]?.timestamp_utc} → {siteData.ephemeris[siteData.ephemeris.length - 1]?.timestamp_utc}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">
                {(siteData.metrics.total_duration_hours / 24).toFixed(1)} Days ({siteData.ephemeris.length} epochs @ 15m cadence)
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                {activeWindow?.description} Precomputed from authoritative NASA JPL Horizons (DE441) and LOLA GDR data — switch Mission Window above to evaluate launch-slip sensitivity.
              </span>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs font-mono shrink-0">
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Window:</span>
              <span className="text-slate-200 font-bold">14.0 Earth Days</span>
            </div>
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Resolution:</span>
              <span className="text-slate-200 font-bold">15-Min (1,345 Steps)</span>
            </div>
          </div>
        </section>

        {/* 1. Scientific KPI Decision Cards */}
        <section aria-label="Mission KPI Cards">
          <KpiCards
            site={siteData.site}
            metrics={siteData.metrics}
            horizonMask={siteData.horizon_mask}
            useUpperLimb={useUpperLimb}
            minEarthEl={minEarthEl}
          />
        </section>

        {/* 2. Interactive Mission Timeline */}
        <section aria-label="Interactive Mission Timeline">
          <MissionTimeline
            ephemeris={siteData.ephemeris}
            horizonMask={siteData.horizon_mask}
            useUpperLimb={useUpperLimb}
            minEarthEl={minEarthEl}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
          />
        </section>

        {/* 3. Dual Scientific Visualization Grid (Horizon Radar + 3D Moon Globe) */}
        <section aria-label="Visualizations" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HorizonRadar
            horizonMask={siteData.horizon_mask}
            ephemeris={siteData.ephemeris}
            selectedIndex={selectedIndex}
            useUpperLimb={useUpperLimb}
            minEarthEl={minEarthEl}
          />

          <LunarGlobe3D
            site={siteData.site}
            currentSample={currentSample}
          />
        </section>

        {/* 4. Side-by-Side Landing Site Comparison Matrix */}
        <section aria-label="Site Comparison">
          <SiteComparison
            catalog={catalog}
            currentSiteData={siteData}
            fileSuffix={fileSuffix}
            windowLabel={activeWindow?.label || ""}
          />
        </section>

        {/* 5. Constrained AI Mission Explainer */}
        <section aria-label="AI Explanation">
          <AiMissionExplainer
            siteA={siteData}
            siteB={comparisonSiteData}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 mt-12 py-8 text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col gap-1">
            <span className="text-slate-200 font-bold">
              Team LOLA Horizon • NASA Space Apps Challenge 2026 — Lunar Landing Site Navigator
            </span>
            <span>
              Authoritative Data: NASA/JPL Horizons (DE441) • NASA PDS Geosciences Node (LOLA GDR LDEM_75S_240M)
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsProvenanceOpen(true)}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <ShieldCheck className="w-4 h-4" />
              Full Provenance & QA Audit
            </button>
            <span>•</span>
            <span className="text-slate-500">Apache 2.0 Open Source</span>
          </div>
        </div>
      </footer>

      {/* Provenance & QA Modal */}
      <ProvenanceModal
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
        siteData={siteData}
      />
    </div>
  );
}
