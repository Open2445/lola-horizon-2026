import argparse
from datetime import datetime
import json
import math
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from packages.science.models import SiteData



class ValidationError(Exception):
    """Raised when scientific data validation fails."""
    pass


def validate_dataset_file(file_path: str) -> Tuple[bool, List[str]]:
    """Validate a normalized site_data.json dataset against strict scientific constraints.
    
    Returns:
        (is_valid, list_of_errors_or_warnings)
    """
    path = Path(file_path)
    if not path.exists():
        return False, [f"Dataset file does not exist: {file_path}"]
        
    errors = []
    
    # 1. Parse JSON
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
    except Exception as e:
        return False, [f"Invalid JSON format: {e}"]
        
    # 2. Pydantic schema validation
    try:
        site_data = SiteData(**raw_data)
    except Exception as e:
        errors.append(f"Pydantic Schema Validation Failed: {e}")
        return False, errors
        
    # 3. Schema version check
    if not site_data.schema_version or not site_data.schema_version.startswith("0."):
        errors.append(f"Invalid schema version: {site_data.schema_version}")
        
    # 4. Site metadata checks
    site = site_data.site
    if site.verification_status != "VERIFIED":
        errors.append(f"Site {site.site_id} is UNVERIFIED! Must be VERIFIED for production scientific use.")
    if not (-90.0 <= site.latitude_deg <= 90.0):
        errors.append(f"Invalid site latitude: {site.latitude_deg}")
    if not (-180.0 <= site.longitude_deg <= 360.0):
        errors.append(f"Invalid site longitude: {site.longitude_deg}")
    if not site.source_url or "http" not in site.source_url:
        errors.append(f"Site source_url is missing or invalid: {site.source_url}")
        
    # 5. Horizon mask checks
    mask = site_data.horizon_mask
    if not mask.points or len(mask.points) < 36:
        errors.append(f"Horizon mask has too few points ({len(mask.points)}). Minimum 36 required.")
    else:
        # Check azimuth coverage and monotonicity
        azimuths = [p.azimuth_deg for p in mask.points]
        elevations = [p.obstruction_elevation_deg for p in mask.points]
        
        for i, az in enumerate(azimuths):
            if not (0.0 <= az < 360.0):
                errors.append(f"Horizon mask azimuth out of range [0, 360): {az}")
            if math.isnan(az) or math.isinf(az):
                errors.append(f"Horizon mask azimuth has NaN/Inf at index {i}")
            if i > 0 and az <= azimuths[i - 1]:
                errors.append(f"Horizon mask azimuths not strictly monotonic increasing: {azimuths[i-1]} -> {az}")
                
        for i, el in enumerate(elevations):
            if not (-90.0 <= el <= 90.0):
                errors.append(f"Horizon mask elevation out of physical range [-90, +90]: {el}")
            if math.isnan(el) or math.isinf(el):
                errors.append(f"Horizon mask elevation has NaN/Inf at index {i}")
                
        # Check provenance
        if not mask.provenance.provider or not mask.provenance.source_url:
            errors.append("Horizon mask provenance missing provider or source_url")
            
    # 6. Ephemeris checks
    ephemeris = site_data.ephemeris
    if not ephemeris or len(ephemeris) < 10:
        errors.append(f"Ephemeris series has too few points ({len(ephemeris)}).")
    else:
        timestamps = []
        parsed_dts = []
        for i, ep in enumerate(ephemeris):
            ts = ep.timestamp_utc
            timestamps.append(ts)
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                parsed_dts.append(dt)
            except Exception as e:
                errors.append(f"Invalid ISO timestamp at index {i}: '{ts}' ({e})")
                
            # Sun coordinates
            if not (0.0 <= ep.sun.azimuth_deg < 360.0):
                errors.append(f"Sun azimuth out of range [0, 360) at index {i}: {ep.sun.azimuth_deg}")
            if not (-90.0 <= ep.sun.elevation_deg <= 90.0):
                errors.append(f"Sun elevation out of range [-90, 90] at index {i}: {ep.sun.elevation_deg}")
            if math.isnan(ep.sun.azimuth_deg) or math.isnan(ep.sun.elevation_deg):
                errors.append(f"Sun coordinates contain NaN at index {i}")
                
            # Earth coordinates
            if not (0.0 <= ep.earth.azimuth_deg < 360.0):
                errors.append(f"Earth azimuth out of range [0, 360) at index {i}: {ep.earth.azimuth_deg}")
            if not (-90.0 <= ep.earth.elevation_deg <= 90.0):
                errors.append(f"Earth elevation out of range [-90, 90] at index {i}: {ep.earth.elevation_deg}")
            if math.isnan(ep.earth.azimuth_deg) or math.isnan(ep.earth.elevation_deg):
                errors.append(f"Earth coordinates contain NaN at index {i}")
                
        # Check timestamp monotonicity and uniqueness
        if len(parsed_dts) == len(ephemeris):
            for i in range(1, len(parsed_dts)):
                diff_sec = (parsed_dts[i] - parsed_dts[i - 1]).total_seconds()
                if diff_sec <= 0:
                    errors.append(f"Timestamps not strictly monotonic increasing at index {i}: {timestamps[i-1]} -> {timestamps[i]}")
                    
        # Check ephemeris provenance
        if not site_data.ephemeris_provenance.provider or not site_data.ephemeris_provenance.source_url:
            errors.append("Ephemeris provenance missing provider or source_url")
            
    # 7. Derived metrics sanity checks
    if site_data.metrics:
        m = site_data.metrics
        if m.total_sunlight_hours > m.total_duration_hours + 1e-4:
            errors.append(f"Total sunlight hours ({m.total_sunlight_hours}) exceeds total duration ({m.total_duration_hours})")
        if m.total_dte_hours > m.total_duration_hours + 1e-4:
            errors.append(f"Total DTE hours ({m.total_dte_hours}) exceeds total duration ({m.total_duration_hours})")
        if not (0.0 <= m.sunlight_coverage_percent <= 100.0):
            errors.append(f"Sunlight coverage percent out of range [0, 100]: {m.sunlight_coverage_percent}")
        if not (0.0 <= m.dte_coverage_percent <= 100.0):
            errors.append(f"DTE coverage percent out of range [0, 100]: {m.dte_coverage_percent}")
            
    is_valid = len(errors) == 0
    return is_valid, errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate normalized site dataset")
    parser.add_argument("--file", type=str, default="data/final/site_data.json", help="Path to JSON dataset")
    args = parser.parse_args()
    
    print(f"Validating dataset: {args.file}...")
    valid, errs = validate_dataset_file(args.file)
    if valid:
        print("VALIDATION SUCCESS: Dataset strictly conforms to all scientific rules and schema constraints.")
        sys.exit(0)
    else:
        print("VALIDATION FAILED with the following errors:")
        for err in errs:
            print(f"  [ERROR] {err}")
        sys.exit(1)
