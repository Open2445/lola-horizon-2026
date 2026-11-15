"""Fetch topocentric Sun and Earth ephemeris from NASA/JPL Horizons API for a lunar site."""

import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re
import sys
from typing import Dict, List, Tuple
import requests

HORIZONS_API_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"


def query_horizons_target(
    target_id: str,
    site_lon: float,
    site_lat: float,
    site_alt_km: float,
    start_dt: datetime,
    stop_dt: datetime,
    step_minutes: int = 15,
) -> List[Tuple[str, float, float]]:
    """Query NASA/JPL Horizons API for a single target (10=Sun, 399=Earth) from a lunar topocentric site.
    
    Returns:
        List of (iso_timestamp, azimuth_deg, elevation_deg) tuples.
    """
    start_str = start_dt.strftime("%Y-%m-%d %H:%M")
    stop_str = stop_dt.strftime("%Y-%m-%d %H:%M")
    step_str = f"{step_minutes}m"
    site_coord_str = f"{site_lon},{site_lat},{site_alt_km}"
    
    params = {
        "format": "json",
        "COMMAND": str(target_id),
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": "coord@301",
        "COORD_TYPE": "GEODETIC",
        "SITE_COORD": site_coord_str,
        "START_TIME": start_str,
        "STOP_TIME": stop_str,
        "STEP_SIZE": step_str,
        "QUANTITIES": "4"
    }
    
    print(f"Querying JPL Horizons for Target {target_id} from {start_str} to {stop_str} (step {step_str})...")
    resp = requests.get(HORIZONS_API_URL, params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    
    if "error" in data:
        raise RuntimeError(f"Horizons API Error: {data['error']}")
    if "result" not in data:
        raise RuntimeError(f"Horizons API returned unexpected payload: {data}")
        
    result_text = data["result"]
    lines = result_text.splitlines()
    
    in_table = False
    samples = []
    
    # Example line: " 2026-Feb-15 00:00  i  204.297492  -8.626214"
    # Or without flag: " 2026-Feb-15 00:00     204.297492  -8.626214"
    row_pattern = re.compile(
        r"^\s*(\d{4}-[A-Za-z]{3}-\d{2}\s+\d{2}:\d{2})\s+([A-Za-z* ]{0,3})\s+([+-]?\d+\.\d+|n\.a\.)\s+([+-]?\d+\.\d+|n\.a\.)"
    )
    
    for line in lines:
        if "$$SOE" in line:
            in_table = True
            continue
        if "$$EOE" in line:
            in_table = False
            break
        if in_table:
            match = row_pattern.search(line)
            if match:
                dt_str, flag, az_str, el_str = match.groups()
                if az_str == "n.a." or el_str == "n.a.":
                    continue
                dt = datetime.strptime(dt_str.strip(), "%Y-%b-%d %H:%M").replace(tzinfo=timezone.utc)
                iso_ts = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                az = float(az_str) % 360.0
                el = float(el_str)
                samples.append((iso_ts, az, el))
                
    if not samples:
        raise RuntimeError(f"No ephemeris data rows parsed for target {target_id}. API Response snippet:\n{result_text[:500]}")
        
    print(f"Retrieved {len(samples)} ephemeris samples for target {target_id}.")
    return samples


def fetch_site_ephemeris(
    site_id: str,
    site_lon: float,
    site_lat: float,
    site_elevation_m: float,
    start_date: str,
    duration_days: int = 14,
    step_minutes: int = 15,
    output_dir: str = "data/processed/ephemeris"
) -> Dict:
    """Fetch both Sun and Earth ephemeris and return merged temporal series."""
    start_dt = datetime.fromisoformat(start_date.replace("Z", "")).replace(tzinfo=timezone.utc)
    stop_dt = start_dt + timedelta(days=duration_days)
    site_alt_km = site_elevation_m / 1000.0
    
    sun_data = query_horizons_target("10", site_lon, site_lat, site_alt_km, start_dt, stop_dt, step_minutes)
    earth_data = query_horizons_target("399", site_lon, site_lat, site_alt_km, start_dt, stop_dt, step_minutes)
    
    # Merge on timestamp
    sun_map = {ts: (az, el) for ts, az, el in sun_data}
    earth_map = {ts: (az, el) for ts, az, el in earth_data}
    
    common_timestamps = sorted(set(sun_map.keys()) & set(earth_map.keys()))
    if not common_timestamps:
        raise ValueError("No common timestamps between Sun and Earth ephemeris!")
        
    merged_ephem = []
    for ts in common_timestamps:
        sun_az, sun_el = sun_map[ts]
        earth_az, earth_el = earth_map[ts]
        merged_ephem.append({
            "timestamp_utc": ts,
            "sun": {
                "azimuth_deg": round(sun_az, 4),
                "elevation_deg": round(sun_el, 4)
            },
            "earth": {
                "azimuth_deg": round(earth_az, 4),
                "elevation_deg": round(earth_el, 4)
            }
        })
        
    provenance = {
        "provider": "NASA/JPL",
        "dataset": "Horizons On-line Solar System Data",
        "retrieved_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_url": HORIZONS_API_URL,
        "processing_script": "fetch_ephemeris.py",
        "source_type": "authoritative",
        "notes": f"Topocentric observer coord@301 at Lon {site_lon}°, Lat {site_lat}°, Alt {site_alt_km} km; Step {step_minutes}m; DE441"
    }
    
    output_payload = {
        "site_id": site_id,
        "start_utc": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stop_utc": stop_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "step_minutes": step_minutes,
        "count": len(merged_ephem),
        "provenance": provenance,
        "ephemeris": merged_ephem
    }
    
    out_dir_path = Path(output_dir)
    out_dir_path.mkdir(parents=True, exist_ok=True)
    out_file = out_dir_path / f"{site_id}_ephemeris.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)
        
    print(f"Saved {len(merged_ephem)} merged ephemeris points to {out_file}")
    return output_payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Sun/Earth ephemeris from NASA/JPL Horizons")
    parser.add_argument("--site", type=str, default="malapert_a", help="Site identifier")
    parser.add_argument("--lon", type=float, default=1.44, help="Longitude in degrees East")
    parser.add_argument("--lat", type=float, default=-80.13, help="Latitude in degrees (-90 to +90)")
    parser.add_argument("--elevation-m", type=float, default=-2600.0, help="Elevation in meters")
    parser.add_argument("--start", type=str, default="2026-02-15T00:00:00", help="Start timestamp ISO (UTC)")
    parser.add_argument("--duration-days", type=int, default=14, help="Mission window duration in days")
    parser.add_argument("--step-minutes", type=int, default=15, help="Step size in minutes (e.g. 15, 30, 60)")
    parser.add_argument("--out-dir", type=str, default="data/processed/ephemeris", help="Output directory")
    
    args = parser.parse_args()
    fetch_site_ephemeris(
        site_id=args.site,
        site_lon=args.lon,
        site_lat=args.lat,
        site_elevation_m=args.elevation_m,
        start_date=args.start,
        duration_days=args.duration_days,
        step_minutes=args.step_minutes,
        output_dir=args.out_dir
    )
