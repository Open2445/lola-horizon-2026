"""Generate topocentric horizon mask from NASA LOLA DEM using spherical ray-marching."""

import argparse
from datetime import datetime, timezone
import json
import math
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from pyproj import Transformer

from packages.science.horizon import (

    LUNAR_RADIUS_M,
    latlon_to_cartesian,
    topocentric_enu_basis,
)
from packages.science.models import HorizonMask, HorizonPoint, Provenance


class LolaDemReader:
    """Reads NASA LOLA Polar Stereographic DEM raster and transforms lunar coordinates."""

    def __init__(self, img_path: str, lbl_path: str):
        self.img_path = Path(img_path)
        self.lbl_path = Path(lbl_path)
        if not self.img_path.exists():
            raise FileNotFoundError(f"LOLA DEM image not found: {self.img_path}")
        if not self.lbl_path.exists():
            raise FileNotFoundError(f"LOLA DEM label not found: {self.lbl_path}")
            
        self._parse_label()
        print(f"Loading LOLA DEM raster ({self.lines} x {self.samples})...")
        # Raw binary read (16-bit signed integer, LSB)
        raw_data = np.fromfile(self.img_path, dtype="<i2")
        expected_size = self.lines * self.samples
        if raw_data.size != expected_size:
            raise ValueError(f"Raster size mismatch: got {raw_data.size} pixels, expected {expected_size}")
            
        self.raster = raw_data.reshape((self.lines, self.samples))
        print("LOLA DEM successfully loaded into memory.")
        
        # Pyproj transformer for Moon Polar Stereographic
        # South pole stereographic centered at lat=-90, lon=0, sphere R=1737400m
        self.proj_crs = "+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R=1737400 +units=m +no_defs"
        self.geo_crs = "+proj=longlat +R=1737400 +no_defs"
        self.transformer = Transformer.from_crs(self.geo_crs, self.proj_crs, always_xy=True)

    def _parse_label(self):
        """Parse PDS3 label metadata."""
        with open(self.lbl_path, "r", encoding="ascii", errors="ignore") as f:
            lbl_text = f.read()
            
        def find_val(pattern, default=None):
            import re
            m = re.search(pattern, lbl_text)
            return m.group(1).strip() if m else default

        self.lines = int(find_val(r"LINES\s*=\s*(\d+)", "3812"))
        self.samples = int(find_val(r"LINE_SAMPLES\s*=\s*(\d+)", "3812"))
        self.scale_m = float(find_val(r"MAP_SCALE\s*=\s*([\d\.]+)", "240.0"))
        self.scaling_factor = float(find_val(r"SCALING_FACTOR\s*=\s*([\d\.]+)", "0.5"))
        self.offset = float(find_val(r"OFFSET\s*=\s*([\d\.]+)", "1737400.0"))
        self.line_offset = float(find_val(r"LINE_PROJECTION_OFFSET\s*=\s*([\d\.]+)", "1905.5"))
        self.sample_offset = float(find_val(r"SAMPLE_PROJECTION_OFFSET\s*=\s*([\d\.]+)", "1905.5"))

    def latlon_to_pixel(self, lat_deg: float, lon_deg: float) -> Tuple[float, float]:
        """Convert lunar (lat, lon) to 0-indexed (row, col) pixel coordinates."""
        # pyproj always_xy=True takes (lon, lat)
        x_proj, y_proj = self.transformer.transform(lon_deg, lat_deg)
        # PDS line/sample offset formulas (1-based in label, subtract 1 for 0-based indexing)
        col = (self.sample_offset - 1.0) + (x_proj / self.scale_m)
        row = (self.line_offset - 1.0) - (y_proj / self.scale_m)
        return row, col

    def get_elevation_at_latlon(self, lat_deg: float, lon_deg: float) -> float:
        """Sample elevation in meters above 1737.4 km reference sphere using bilinear interpolation."""
        row, col = self.latlon_to_pixel(lat_deg, lon_deg)
        r0 = int(math.floor(row))
        c0 = int(math.floor(col))
        r1 = min(r0 + 1, self.lines - 1)
        c1 = min(c0 + 1, self.samples - 1)
        
        if 0 <= r0 < self.lines and 0 <= c0 < self.samples:
            dr = row - r0
            dc = col - c0
            z00 = float(self.raster[r0, c0]) * self.scaling_factor
            z01 = float(self.raster[r0, c1]) * self.scaling_factor
            z10 = float(self.raster[r1, c0]) * self.scaling_factor
            z11 = float(self.raster[r1, c1]) * self.scaling_factor
            elev = (1.0 - dr) * (1.0 - dc) * z00 + (1.0 - dr) * dc * z01 + dr * (1.0 - dc) * z10 + dr * dc * z11
            return float(elev)
        return 0.0

    def sample_elevation_profile(self, lats: np.ndarray, lons: np.ndarray) -> np.ndarray:
        """Vectorized bilinear elevation sampling along coordinate arrays."""
        x_proj, y_proj = self.transformer.transform(lons, lats)
        cols = (self.sample_offset - 1.0) + (x_proj / self.scale_m)
        rows = (self.line_offset - 1.0) - (y_proj / self.scale_m)
        
        r0 = np.floor(rows).astype(int)
        c0 = np.floor(cols).astype(int)
        r1 = np.clip(r0 + 1, 0, self.lines - 1)
        c1 = np.clip(c0 + 1, 0, self.samples - 1)
        
        valid = (r0 >= 0) & (r0 < self.lines) & (c0 >= 0) & (c0 < self.samples)
        elevations = np.zeros(len(lats), dtype=np.float64)
        
        if np.any(valid):
            dr = (rows[valid] - r0[valid])
            dc = (cols[valid] - c0[valid])
            
            z00 = self.raster[r0[valid], c0[valid]] * self.scaling_factor
            z01 = self.raster[r0[valid], c1[valid]] * self.scaling_factor
            z10 = self.raster[r1[valid], c0[valid]] * self.scaling_factor
            z11 = self.raster[r1[valid], c1[valid]] * self.scaling_factor
            
            elev = (1.0 - dr) * (1.0 - dc) * z00 + (1.0 - dr) * dc * z01 + dr * (1.0 - dc) * z10 + dr * dc * z11
            elevations[valid] = elev
            
        return elevations



def compute_horizon_mask_for_site(
    dem: LolaDemReader,
    site_id: str,
    site_lat: float,
    site_lon: float,
    max_radius_km: float = 60.0,
    azimuth_res_deg: float = 1.0,
    radial_step_m: float = 240.0,
    observer_height_m: float = 2.0,
    output_dir: str = "data/processed/horizon"
) -> Dict:
    """Ray-march radially through DEM terrain around site to compute topocentric horizon mask."""
    print(f"Calculating horizon profile for '{site_id}' at lat={site_lat}°, lon={site_lon}°...")
    
    site_elev_m = dem.get_elevation_at_latlon(site_lat, site_lon)
    print(f"Sampled site surface elevation: {site_elev_m:.2f} m relative to 1737.4 km sphere.")
    
    obs_cartesian = latlon_to_cartesian(site_lat, site_lon, site_elev_m + observer_height_m)
    east, north, up = topocentric_enu_basis(site_lat, site_lon)
    
    # Distance array from observer
    distances_m = np.arange(radial_step_m, max_radius_km * 1000.0, radial_step_m)
    n_radial = len(distances_m)
    sigma = distances_m / LUNAR_RADIUS_M  # Angular distance on lunar sphere
    
    phi0 = math.radians(site_lat)
    lam0 = math.radians(site_lon)
    
    azimuths_deg = np.arange(0.0, 360.0, azimuth_res_deg)
    horizon_points: List[HorizonPoint] = []
    
    for az_deg in azimuths_deg:
        alpha = math.radians(az_deg)
        
        # Great-circle forward propagation on lunar sphere
        sin_phi = math.sin(phi0) * np.cos(sigma) + math.cos(phi0) * np.sin(sigma) * math.cos(alpha)
        sin_phi = np.clip(sin_phi, -1.0, 1.0)
        phi_pts = np.arcsin(sin_phi)
        
        delta_lam = np.arctan2(
            np.sin(sigma) * math.sin(alpha),
            math.cos(phi0) * np.cos(sigma) - math.sin(phi0) * np.sin(sigma) * math.cos(alpha)
        )
        lam_pts = lam0 + delta_lam
        
        lats_deg = np.degrees(phi_pts)
        lons_deg = np.degrees(lam_pts) % 360.0
        
        # Sample elevations along ray
        elevations = dem.sample_elevation_profile(lats_deg, lons_deg)
        
        # Compute 3D Cartesian coordinates of terrain points
        r_pts = LUNAR_RADIUS_M + elevations
        x_pts = r_pts * np.cos(phi_pts) * np.cos(lam_pts)
        y_pts = r_pts * np.cos(phi_pts) * np.sin(lam_pts)
        z_pts = r_pts * np.sin(phi_pts)
        
        # Displacement from observer
        dx = x_pts - obs_cartesian[0]
        dy = y_pts - obs_cartesian[1]
        dz = z_pts - obs_cartesian[2]
        
        # Project onto observer ENU frame
        e_comp = dx * east[0] + dy * east[1] + dz * east[2]
        n_comp = dx * north[0] + dy * north[1] + dz * north[2]
        u_comp = dx * up[0] + dy * up[1] + dz * up[2]
        
        d_horiz = np.sqrt(e_comp * e_comp + n_comp * n_comp)
        
        # Apparent elevation angle in degrees above local horizontal plane
        el_angles = np.degrees(np.arctan2(u_comp, d_horiz))
        max_el = float(np.max(el_angles))
        
        horizon_points.append(HorizonPoint(
            azimuth_deg=round(float(az_deg), 2),
            obstruction_elevation_deg=round(max_el, 3)
        ))
        
    provenance = Provenance(
        provider="NASA PDS Geosciences Node / LRO LOLA Science Team",
        dataset="LOLA GDR LDEM_75S_240M V2.0",
        retrieved_utc=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        source_url="https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/",
        processing_script="generate_horizon_mask.py",
        source_type="authoritative",
        notes=f"Calculated using 3D spherical ray-marching out to {max_radius_km} km radius at {radial_step_m}m step with observer {observer_height_m}m above ground."
    )
    
    mask_obj = HorizonMask(
        resolution_deg=azimuth_res_deg,
        points=horizon_points,
        provenance=provenance
    )
    
    out_dir_p = Path(output_dir)
    out_dir_p.mkdir(parents=True, exist_ok=True)
    out_file = out_dir_p / f"{site_id}_horizon_mask.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(mask_obj.model_dump(), f, indent=2)
        
    print(f"Generated {len(horizon_points)} horizon mask points saved to {out_file}")
    return mask_obj.model_dump()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate local horizon mask from LOLA DEM")
    parser.add_argument("--site", type=str, default="malapert_a", help="Site identifier")
    parser.add_argument("--lat", type=float, default=-80.13, help="Site latitude")
    parser.add_argument("--lon", type=float, default=1.44, help="Site longitude")
    parser.add_argument("--img", type=str, default="data/raw/terrain/ldem_75s_240m.img", help="Path to DEM img")
    parser.add_argument("--lbl", type=str, default="data/raw/terrain/ldem_75s_240m.lbl", help="Path to DEM lbl")
    parser.add_argument("--max-radius-km", type=float, default=60.0, help="Ray-marching radius in km")
    parser.add_argument("--res-deg", type=float, default=1.0, help="Azimuth resolution in degrees")
    parser.add_argument("--out-dir", type=str, default="data/processed/horizon", help="Output directory")
    
    args = parser.parse_args()
    reader = LolaDemReader(args.img, args.lbl)
    compute_horizon_mask_for_site(
        dem=reader,
        site_id=args.site,
        site_lat=args.lat,
        site_lon=args.lon,
        max_radius_km=args.max_radius_km,
        azimuth_res_deg=args.res_deg,
        output_dir=args.out_dir
    )
