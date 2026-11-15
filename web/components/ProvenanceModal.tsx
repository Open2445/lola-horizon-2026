"use client";

import React, { useState } from "react";
import { SiteData } from "../lib/types";
import { X, ShieldCheck, ExternalLink, Image as ImageIcon, Database, Layers, CheckCircle2 } from "lucide-react";

interface ProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteData: SiteData;
}

export function ProvenanceModal({ isOpen, onClose, siteData }: ProvenanceModalProps) {
  const [activeTab, setActiveTab] = useState<"provenance" | "plots">("provenance");

  if (!isOpen) return null;

  const site = siteData.site;
  const ephemProv = siteData.ephemeris_provenance;
  const maskProv = siteData.horizon_mask.provenance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                NASA Data Provenance & Scientific QA Audit Trail
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Full scientific traceability • NASA/JPL Horizons • LRO LOLA GDR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            onClick={() => setActiveTab("provenance")}
            className={`py-2.5 px-4 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "provenance"
                ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-4 h-4" />
            Authoritative Sources & Datums
          </button>
          <button
            onClick={() => setActiveTab("plots")}
            className={`py-2.5 px-4 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "plots"
                ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Scientific QA Verification Plots
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {activeTab === "provenance" ? (
            <div className="space-y-6">
              {/* Site Information Audit */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300 font-bold">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Target Site Verification ({site.name})
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                    {site.verification_status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-400 pt-1">
                  <div>
                    <span className="text-slate-500">Mission: </span>
                    <span className="text-slate-200">{site.mission}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Coordinates: </span>
                    <span className="text-slate-200">
                      {site.latitude_deg.toFixed(4)}°S, {site.longitude_deg.toFixed(4)}°E
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Elevation: </span>
                    <span className="text-slate-200">{site.elevation_m.toFixed(2)} m (IAU 1737.4 km datum)</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Reference Frame: </span>
                    <span className="text-slate-200">{site.coordinate_reference}</span>
                  </div>
                </div>
                <div className="pt-2 text-slate-400">
                  <span className="text-slate-500">Primary Authority: </span>
                  <a
                    href={site.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    {site.source_description}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Terrain Model Audit */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300 font-bold">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Lunar Digital Elevation Model (Terrain Horizon)
                  </span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                    NASA PDS AUTHORITATIVE
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-400 pt-1">
                  <div>
                    <span className="text-slate-500">Provider: </span>
                    <span className="text-slate-200">{maskProv.provider}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Product: </span>
                    <span className="text-slate-200">{maskProv.dataset}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Resolution: </span>
                    <span className="text-slate-200">240 m/pixel (LDEM_75S_240M)</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Ray-March Algorithm: </span>
                    <span className="text-slate-200">3D Spherical Curvature (R = 1737.4 km)</span>
                  </div>
                </div>
                <p className="text-slate-400 text-[11px] pt-1 leading-relaxed">
                  {maskProv.notes}
                </p>
                <div className="pt-1">
                  <a
                    href={maskProv.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    NASA PDS Geosciences Node Repository
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Celestial Ephemeris Audit */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300 font-bold">
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    Topocentric Ephemeris (Sun & Earth)
                  </span>
                  <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                    JPL HORIZONS REST API
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-400 pt-1">
                  <div>
                    <span className="text-slate-500">Provider: </span>
                    <span className="text-slate-200">{ephemProv.provider}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Service: </span>
                    <span className="text-slate-200">{ephemProv.dataset}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Ephemeris Kernel: </span>
                    <span className="text-slate-200">JPL DE441 High-Precision Planetary Ephemeris</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Observer Coordinates: </span>
                    <span className="text-slate-200">coord@301 (Lon 1.44°E, Lat -80.13°, Alt 2.526 km)</span>
                  </div>
                </div>
                <p className="text-slate-400 text-[11px] pt-1 leading-relaxed">
                  {ephemProv.notes}
                </p>
                <div className="pt-1">
                  <a
                    href={ephemProv.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    NASA JPL Solar System Dynamics Horizons API
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plot 1: Sun Track */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="font-bold text-slate-200">1. Sun Trajectory & Horizon Mask</span>
                <img
                  src="/plots/sun_track.png"
                  alt="Sun Trajectory and Horizon Track"
                  className="rounded-lg border border-slate-800 w-full"
                />
                <p className="text-[11px] text-slate-400">
                  Continuous 14-day Sun elevation tracking across local terrain obstruction.
                </p>
              </div>

              {/* Plot 2: Earth Track */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="font-bold text-slate-200">2. Earth Libration Trajectory</span>
                <img
                  src="/plots/earth_track.png"
                  alt="Earth Trajectory and Libration"
                  className="rounded-lg border border-slate-800 w-full"
                />
                <p className="text-[11px] text-slate-400">
                  Earth elevation oscillation demonstrating continuous line-of-sight clearance.
                </p>
              </div>

              {/* Plot 3: Polar Horizon */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="font-bold text-slate-200">3. Polar Horizon Obstruction Profile</span>
                <img
                  src="/plots/malapert_a_horizon_mask.png"
                  alt="Polar Horizon Obstruction Profile"
                  className="rounded-lg border border-slate-800 w-full"
                />
                <p className="text-[11px] text-slate-400">
                  Full 360° topocentric obstruction showing 10.8° peak at Malapert Massif.
                </p>
              </div>

              {/* Plot 4: Visibility Margins */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="font-bold text-slate-200">4. Visibility Margins (El - Horizon)</span>
                <img
                  src="/plots/visibility_margin.png"
                  alt="Visibility Margins (Sun & Earth)"
                  className="rounded-lg border border-slate-800 w-full"
                />
                <p className="text-[11px] text-slate-400">
                  Quantitative visibility margin identifying sunset transition and +0.56° Earth minimum clearance.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>NASA Space Apps Challenge 2026 Submission</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
