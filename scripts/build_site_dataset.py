import argparse
from datetime import datetime, timezone
import json
import sys
from pathlib import Path
from typing import Dict, List

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from packages.science.models import (

    CelestialPoint,
    DerivedMetrics,
    HorizonMask,
    Provenance,
    SiteData,
    SiteMetadata,
    TargetEphemeris,
    TimeWindow,
)
from packages.science.visibility import (
    calculate_dte_visibility,
    calculate_solar_visibility,
)
from packages.science.windows import calculate_derived_metrics

# Authoritative catalog of verified sites
VERIFIED_SITES = {
    "malapert_a": {
        "site_id": "malapert_a",
        "name": "Malapert A",
        "category": "CLPS_LANDING_SITE",
        "mission": "Intuitive Machines IM-1 (NASA CLPS TO2-IM)",
        "latitude_deg": -80.13,
        "longitude_deg": 1.44,
        "elevation_m": 2526.28,  # Sampled from LOLA GDR LDEM_75S_240M
        "source_url": "https://www.nasa.gov/missions/lro/nasa-lro-images-intuitive-machines-im-1-landing-site/",
        "source_description": "NASA Lunar Reconnaissance Orbiter Camera (LROC) NAC imagery M1464402633R confirming landing at 80.13°S, 1.44°E.",
        "coordinate_reference": "Lunar Mean Earth/Polar Axis (ME) IAU2000",
        "verification_status": "VERIFIED"
    },
    "shackleton_connecting_ridge": {
        "site_id": "shackleton_connecting_ridge",
        "name": "Shackleton Connecting Ridge",
        "category": "CLPS_PRIME1_AND_ARTEMIS",
        "mission": "Intuitive Machines IM-2 (PRIME-1) / Artemis III Candidate",
        "latitude_deg": -89.54,
        "longitude_deg": 137.7,
        "elevation_m": 1245.0,
        "source_url": "https://www.nasa.gov/news-release/nasa-announces-candidate-landing-regions-for-artemis-iii/",
        "source_description": "NASA Artemis III candidate region and CLPS PRIME-1 landing zone on the ridge connecting Shackleton and de Gerlache craters.",
        "coordinate_reference": "Lunar Mean Earth/Polar Axis (ME) IAU2000",
        "verification_status": "VERIFIED"
    },
    "mons_mouton": {
        "site_id": "mons_mouton",
        "name": "Mons Mouton",
        "category": "CLPS_AND_ARTEMIS_CANDIDATE",
        "mission": "CLPS / Artemis Candidate Region",
        "latitude_deg": -84.90,
        "longitude_deg": 31.0,
        "elevation_m": 5820.0,
        "source_url": "https://www.nasa.gov/missions/viper/nasa-names-landing-site-for-water-hunting-viper/",
        "source_description": "NASA CLPS designated landing site at Mons Mouton plateau adjacent to Nobile crater.",
        "coordinate_reference": "Lunar Mean Earth/Polar Axis (ME) IAU2000",
        "verification_status": "VERIFIED"
    }
}



def build_site_dataset(
    site_id: str = "malapert_a",
    horizon_mask_file: str = "data/processed/horizon/malapert_a_horizon_mask.json",
    ephemeris_file: str = "data/processed/ephemeris/malapert_a_ephemeris.json",
    output_file: str = "data/final/site_data.json"
) -> SiteData:
    """Combine site metadata, terrain horizon mask, and JPL ephemeris into validated SiteData dataset."""
    if site_id not in VERIFIED_SITES:
        raise ValueError(f"Site '{site_id}' is not in the verified site registry!")
        
    site_info = VERIFIED_SITES[site_id]
    site_meta = SiteMetadata(**site_info)
    
    # 1. Load horizon mask
    h_path = Path(horizon_mask_file)
    if not h_path.exists():
        raise FileNotFoundError(f"Horizon mask file not found: {h_path}")
    with open(h_path, "r", encoding="utf-8") as f:
        h_data = json.load(f)
    horizon_mask = HorizonMask(**h_data)
    
    # 2. Load ephemeris
    e_path = Path(ephemeris_file)
    if not e_path.exists():
        raise FileNotFoundError(f"Ephemeris file not found: {e_path}")
    with open(e_path, "r", encoding="utf-8") as f:
        e_data = json.load(f)
    ephem_provenance = Provenance(**e_data["provenance"])
    ephem_points = [TargetEphemeris(**ep) for ep in e_data["ephemeris"]]
    
    # 3. Execute deterministic science engine
    print(f"Calculating visibility and mission windows for {len(ephem_points)} timestamps...")
    timestamps = [ep.timestamp_utc for ep in ephem_points]
    sun_flags = [
        calculate_solar_visibility(ep.sun.azimuth_deg, ep.sun.elevation_deg, horizon_mask)
        for ep in ephem_points
    ]
    dte_flags = [
        calculate_dte_visibility(ep.earth.azimuth_deg, ep.earth.elevation_deg, horizon_mask)
        for ep in ephem_points
    ]
    
    metrics, windows = calculate_derived_metrics(timestamps, sun_flags, dte_flags)
    
    site_dataset = SiteData(
        schema_version="0.1.0",
        site=site_meta,
        horizon_mask=horizon_mask,
        ephemeris_provenance=ephem_provenance,
        ephemeris=ephem_points,
        metrics=metrics,
        windows=windows
    )
    
    out_p = Path(output_file)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    with open(out_p, "w", encoding="utf-8") as f:
        json.dump(site_dataset.model_dump(), f, indent=2)
        
    print(f"Normalized site dataset assembled and saved to {output_file}")
    print(f"Summary Metrics:")
    print(f"  - Mission Duration: {metrics.total_duration_hours:.1f} hours")
    print(f"  - Usable Sunlight: {metrics.total_sunlight_hours:.1f} hrs ({metrics.sunlight_coverage_percent:.1f}%)")
    print(f"  - Longest Sunlight Window: {metrics.longest_sunlight_hours:.1f} hrs")
    print(f"  - Earth DTE Coverage: {metrics.total_dte_hours:.1f} hrs ({metrics.dte_coverage_percent:.1f}%)")
    print(f"  - Longest DTE Blackout: {metrics.longest_dte_blackout_hours:.1f} hrs")
    print(f"  - Simultaneous Sun+DTE: {metrics.total_simultaneous_hours:.1f} hrs ({metrics.simultaneous_coverage_percent:.1f}%)")
    
    return site_dataset


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Assemble normalized site dataset")
    parser.add_argument("--site", type=str, default="malapert_a", help="Site identifier")
    parser.add_argument("--horizon", type=str, default="data/processed/horizon/malapert_a_horizon_mask.json")
    parser.add_argument("--ephemeris", type=str, default="data/processed/ephemeris/malapert_a_ephemeris.json")
    parser.add_argument("--out", type=str, default="data/final/site_data.json")
    args = parser.parse_args()
    
    build_site_dataset(
        site_id=args.site,
        horizon_mask_file=args.horizon,
        ephemeris_file=args.ephemeris,
        output_file=args.out
    )
