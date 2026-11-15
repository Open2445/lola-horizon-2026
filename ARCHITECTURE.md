# Architecture — CLPS Lunar Mission Browser

## System Overview

```text
       ┌────────────────────────┐      ┌────────────────────────┐
       │   NASA LRO / LOLA DEM  │      │   NASA / JPL Horizons  │
       │     (PDS Geosciences)  │      │       API (REST)       │
       └───────────┬────────────┘      └───────────┬────────────┘
                   │                               │
                   ▼                               ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │ generate_horizon_mask  │      │    fetch_ephemeris     │
       │  Ray-march radial DEM  │      │ Topocentric Az/El for  │
       │  0°-359° Horizon Mask  │      │       Sun & Earth      │
       └───────────┬────────────┘      └───────────┬────────────┘
                   │                               │
                   └───────────────┬───────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │     build_site_dataset.py     │
                   │ Merges site metadata, horizon │
                   │  profile, and time ephemerides│
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │    data/final/site_data.json  │
                   │   Validated Normalized Schema │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │  Deterministic Science Engine │
                   │   packages/science/ (Python)  │
                   │  & web/lib/science/ (TS sync) │
                   │  - Horizon obstruction eval   │
                   │  - Solar & DTE window calc    │
                   │  - Blackout duration stats    │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │   Next.js Mission Browser UI  │
                   │  - Interactive Timeline       │
                   │  - Polar Horizon Radar        │
                   │  - Site Comparison Matrix     │
                   │  - Constrained AI Explainer   │
                   └───────────────────────────────┘
```

## Data Flow & Components

### 1. Offline Data Pipeline (`scripts/`)
- `download_dem.py`: Fetches lunar digital elevation models (DEM) from NASA PDS / USGS Astrogeology (e.g. LOLA GDR south pole 120m/60m/30m or Moon Trek API).
- `generate_horizon_mask.py`: Computes topocentric horizon elevation profiles ($0^\circ$ to $359^\circ$ azimuth) at the landing site by radial ray-marching through terrain DEM taking into account lunar spherical curvature:
  $$\Delta z = z_{\text{terrain}} - z_{\text{site}} - \frac{d^2}{2 R_{\text{Moon}}}$$
  $$\theta = \arctan2(\Delta z, d)$$
- `fetch_ephemeris.py`: Queries NASA/JPL Horizons API for topocentric azimuth and elevation of the Sun (NAIF ID: 10) and Earth (NAIF ID: 399) with respect to lunar coordinate center (`500@301`) specified at site (lat, lon, elevation).
- `build_site_dataset.py`: Normalizes, attaches provenance metadata, and outputs standardized JSON.
- `validate_dataset.py`: Enforces data integrity, monotonicity, non-null values, coordinate sanity, and schema compliance.

### 2. Science Engine (`packages/science/`)
- Pure mathematical functions:
  - `get_horizon_elevation(azimuth_deg, horizon_mask)`
  - `is_target_visible(target_az, target_el, horizon_mask)`
  - `calculate_continuous_windows(timestamps, visibility_flags)`
  - `calculate_overlap_windows(sun_flags, dte_flags)`
- Transparent derived metrics without arbitrary scoring heuristics.

### 3. Web Application (`web/`)
- Next.js / TypeScript / Tailwind CSS.
- Client-side deterministic science engine matching Python results bit-for-bit.
- Visualizations:
  - Scrubbable multi-track timeline (Sun illumination vs Earth DTE).
  - Polar Horizon Radar showing local horizon profile, solar path, and Earth apparent path.
  - Side-by-side landing site trade-off comparisons.
  - Secondary: 3D interactive lunar sphere with terminator & DTE vectors.
  - Constrained LLM explainer consuming deterministic metrics.
