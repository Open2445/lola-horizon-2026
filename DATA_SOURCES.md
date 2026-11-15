# Data Sources Audit — CLPS Lunar Mission Browser

This document establishes the authoritative data sources used by the project. Every dataset must be verified, traceable, and documented.

---

## 1. Landing Site Metadata & Coordinates

### Primary Target Site: Malapert A (CLPS IM-1 / Odysseus Landing Site)
- **Site ID**: `malapert_a`
- **Name**: Malapert A
- **Category**: `CLPS_LANDING_SITE`
- **Mission**: Intuitive Machines IM-1 (NASA CLPS TO2-IM)
- **Verified Coordinates**:
  - Latitude: `80.13° S` (-80.13°)
  - Longitude: `1.44° E` (+1.44°)
  - LROC NAC Photometric Elevation: `2,579 m` (relative to GLD100 / local stereo NAC DTM)
  - LOLA GDR Pipeline Elevation: `2,526.28 m` (sampled bilinearly from LDEM_75S_240M relative to IAU 1737.4 km sphere)
  - Elevation Difference: `-52.72 m`
- **Elevation Datum & Observer Placement Note**:
  - NASA LROC NAC publication (M1464402633R) reports landing elevation as `2,579 m` based on a local high-resolution stereo photogrammetric digital terrain model.
  - Our scientific pipeline samples the authoritative NASA PDS LOLA GDR product (`LDEM_75S_240M`) at `2,526.28 m` above the lunar 1,737,400.0 m reference sphere.
  - In lunar geodesy, regional laser altimetry (LOLA) and localized stereo imagery (NAC) frequently exhibit small systematic offsets (typically 20–80 m) due to differing interpolation grids, baselines, and local slope sampling.
  - **Internal Consistency**: To maintain absolute geometric rigor without datum shearing, the pipeline uses `2,526.28 m` for both the terrain observer ground datum and the NASA/JPL Horizons topocentric observer altitude (`SITE_COORD='1.44,-80.13,2.526'`). This ensures that the local horizontal tangent plane, the ray-marched terrain angles, and the celestial azimuth/elevation vectors share the exact same physical spatial origin.
- **Coordinate Reference**: Mean Earth/Polar Axis (ME) frame / IAU 2000 Lunar reference frame
- **Authoritative Sources**:
  - NASA LROC (Lunar Reconnaissance Orbiter Camera) team publication / NASA Science:
    * "NASA's LRO Images Intuitive Machines' Odysseus Lander": [https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/](https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/)
    * LROC NAC observation M1464402633R confirmed landing site: `80.13° S, 1.44° E`.
  - NASA CLPS TO2-IM landing documentation.
- **Verification Status**: **VERIFIED**

---

### Terminology & Communications Modeling Scope: "Geometric Earth Visibility / DTE Proxy"
- **Apparent Target Visibility**: The metric currently reported as "Earth Visibility / DTE Coverage" represents **geometric line-of-sight clearance** above the local terrain horizon:
  $$\text{margin}_{\text{Earth}} = \text{elevation}_{\text{Earth}} - \text{horizon\_elevation}(\text{azimuth}_{\text{Earth}}) > 0$$
- **Distinction from Operational DSN Availability**: Geometric clearance confirms that lunar mountains and crater rims do not block the RF path to Earth. However, actual Deep Space Network (DSN) communications availability further requires:
  1. DSN ground station visibility (Goldstone, Madrid, Canberra view periods as Earth rotates).
  2. Earth sub-observer latitude/longitude and limb orientation.
  3. Lander antenna orientation, beamwidth, and gimbal limit.
  4. Station scheduling and RF link margin.
- In compliance with scientific honesty, this metric is officially designated as **Geometric Earth Visibility / DTE Proxy**.


### Secondary Target Site Candidate: Shackleton Connecting Ridge (PRIME-1 / IM-2 & Artemis III Candidate)
- **Site ID**: `shackleton_connecting_ridge`
- **Category**: `CLPS_AND_ARTEMIS_CANDIDATE`
- **Mission**: Intuitive Machines IM-2 (PRIME-1) / Artemis III candidate region
- **Verified Coordinates**: `89.54° S, 137.7° E` (-89.54°, 137.7°)
- **Verification Status**: **PENDING PIPELINE VALIDATION OF SITE 1**

---

## 2. Lunar Terrain / Digital Elevation Models (DEM)

### Primary Source: NASA LRO LOLA (Lunar Orbiter Laser Altimeter) GDR / PDS Geosciences Node
- **Source**: NASA Planetary Data System (PDS) Geosciences Node / USGS Astrogeology / LRO LOLA Science Team.
- **Product**: Lunar South Pole Digital Elevation Model (LDEM).
- **Format**: Cloud-optimized GeoTIFF / Polar Stereographic IMG.
- **Projection**: South Pole Polar Stereographic (Moon 2000, IAU2000:30100 / EPSG-compatible or custom WKT `+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R=1737400 +units=m +no_defs`).
- **Resolution**: 120m/pixel (LDEM_80S_120M) or 60m/pixel (LDEM_80S_60M).
- **Direct PDS URL**: [https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/)
- **Fallback / On-Demand Tile Source**: USGS / NASA Moon Trek WMS & REST Tile API (`https://moontrek.jpl.nasa.gov/` and USGS Astropedia).
- **Licensing/Access**: Public domain (NASA / USGS / PDS open data policy).

---

## 3. Celestial Ephemeris (Sun & Earth Relative to Lunar Site)

### Primary Source: NASA / JPL Horizons System API
- **Endpoint**: `https://ssd.jpl.nasa.gov/api/horizons.api`
- **Query Type**: Observer Table (`COMMAND`, `CENTER`, `TLIST`/`START_TIME`/`STOP_TIME`/`STEP_SIZE`, `QUANTITIES`)
- **Observer Specification (`CENTER`)**: Topocentric location on the Moon:
  - Format: `'coord@301'` (301 = Moon body ID)
  - Coordinate string: `longitude,latitude,altitude` (degrees East, degrees North, altitude in km relative to reference sphere)
- **Targets (`COMMAND`)**:
  - Sun: `'10'` (Sun body center)
  - Earth: `'399'` (Earth body center)
- **Output Quantities (`QUANTITIES='4'`)**:
  - Apparent Azimuth (AZ) in degrees ($[0^\circ, 360^\circ)$ measured eastward from North)
  - Apparent Elevation (EL) in degrees (relative to local horizontal plane tangent to the reference ellipsoid at the site)
  - Atmospheric Refraction: None (Lunar vacuum, `REFRACTION='NO'`)
- **Temporal Resolution**: 15 minutes default (configurable down to 1 minute or up to 1 hour).
- **Access Protocol**: HTTP GET REST API with JSON response parsing (`result` string containing standard Horizons tabular output).
- **Licensing/Access**: Public service provided by NASA Solar System Dynamics Group / JPL.
