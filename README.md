# LOLA Horizon — Lunar Landing Site Navigator

**Team:** LOLA Horizon (Solo Virtual Participant • Kochi Local Event)  
**Event:** NASA Space Apps Challenge 2026  
**Challenge:** Lunar Landing Site Navigator (Challenge 10 — CLPS)  
**License:** Apache License 2.0 (`LICENSE`)

---

## Overview

**LOLA Horizon** is a terrain-aware lunar south pole mission decision-support browser. Because Commercial Lunar Payload Services (CLPS) landers operate near the lunar south pole at grazing solar and Earth elevation angles, small ridges or launch-date slips can turn a sunlit, Earth-visible site into a communications blackout or permanent shadow.

LOLA Horizon computes deterministic 360° topographic horizon masks from **NASA LRO LOLA** elevation models and intersects them with **NASA/JPL Horizons (DE441)** solar and Earth ephemerides across multiple candidate landing sites and mission windows.

---

## Key Capabilities

- **Multi-Window Launch-Slip Analysis**: Switch between **IM-1 Historical Validation (Feb 2024)**, **Nov 2026 Nominal Window**, and **Feb 2027 (+3 Mo Launch Slip)** to see how shifting launch dates impacts solar hours and Earth Direct-to-Earth (DTE) line-of-sight blackouts.
- **360° Topographic Horizon Masking**: Computes horizon obstruction angles at 1° azimuth resolution from LOLA `LDEM_75S_240M` polar stereographic topography.
- **Interactive Mission Timeline & Polar Radar**: Inspect 1,345 15-minute telemetry steps over 14.0 Earth days, toggle Sun center vs. upper-limb illumination (`+0.267°`), and adjust operational DTE elevation cutoffs (`0°`–`15°`).
- **Side-by-Side Site Comparison & Grounded Explainer**: Compare **Malapert A**, **Mons Mouton**, and **Shackleton Connecting Ridge** with explicit Trade-off Summaries grounded strictly in deterministic telemetry.
- **3D Lunar Globe (Contextual Visualization)**: Interactive Three.js lunar globe with seeded highland/mare bump topography, 75°S LOLA domain ring, live Sun/Earth vectors, and starfield (explicitly labeled as contextual only).

---

## Authoritative Data & Open-Source Attribution

- **NASA LRO LOLA Digital Elevation Model (`LDEM_75S_240M`)**: NASA Planetary Data System (PDS) Geosciences Node, Lunar Reconnaissance Orbiter Lunar Orbiter Laser Altimeter.
- **NASA/JPL Horizons Ephemeris API (`DE441`)**: Solar System Dynamics Group, Jet Propulsion Laboratory (`coord@301`).
- **Open-Source Stack**: Next.js, React, TypeScript, Tailwind CSS, Three.js, Lucide Icons, Python, NumPy, Rasterio, Pytest.

---

## Running Locally

### Backend / Science Engine Verification
```bash
pytest
```

### Web Application
```bash
cd web
npm install
npm run dev
```
Open `http://localhost:3000`.
