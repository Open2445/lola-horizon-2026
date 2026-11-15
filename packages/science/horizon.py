"""Deterministic local lunar terrain horizon obstruction engine.

Calculates the apparent topocentric horizon elevation profile (0° to 359°) from a
lunar site by ray-marching terrain DEM or sample grids, accounting for lunar spherical
curvature and topocentric horizontal reference planes.
"""

import math
from typing import List, Tuple, Union
import numpy as np

from .models import HorizonMask, HorizonPoint, Provenance

# Lunar mean volumetric radius (IAU / NASA standard)
LUNAR_RADIUS_M = 1737400.0


def latlon_to_cartesian(lat_deg: float, lon_deg: float, elevation_m: float, radius_m: float = LUNAR_RADIUS_M) -> np.ndarray:
    """Convert lunar geodetic/spherical coordinates to 3D lunar-centric Cartesian coordinates.
    
    Args:
        lat_deg: Latitude in decimal degrees [-90, +90]
        lon_deg: Longitude in decimal degrees [0, 360) or [-180, +180]
        elevation_m: Height above the mean lunar reference sphere (meters)
        radius_m: Lunar reference sphere radius (meters, default 1737.4 km)
        
    Returns:
        3D numpy array [X, Y, Z] in meters.
    """
    phi = math.radians(lat_deg)
    lam = math.radians(lon_deg)
    r = radius_m + elevation_m
    x = r * math.cos(phi) * math.cos(lam)
    y = r * math.cos(phi) * math.sin(lam)
    z = r * math.sin(phi)
    return np.array([x, y, z], dtype=np.float64)


def topocentric_enu_basis(lat_deg: float, lon_deg: float) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Compute local East, North, and Up unit vectors at the observer's location.
    
    Args:
        lat_deg: Observer latitude in decimal degrees
        lon_deg: Observer longitude in decimal degrees
        
    Returns:
        (east_unit, north_unit, up_unit) as 3D numpy unit vectors.
    """
    phi = math.radians(lat_deg)
    lam = math.radians(lon_deg)
    
    # Up is normal to the reference sphere
    up = np.array([
        math.cos(phi) * math.cos(lam),
        math.cos(phi) * math.sin(lam),
        math.sin(phi)
    ], dtype=np.float64)
    
    # East is parallel to lines of latitude (d/d_lam)
    east = np.array([
        -math.sin(lam),
        math.cos(lam),
        0.0
    ], dtype=np.float64)
    east_norm = np.linalg.norm(east)
    if east_norm < 1e-12:
        # At exact poles, choose arbitrary reference for East
        east = np.array([0.0, 1.0, 0.0], dtype=np.float64)
    else:
        east = east / east_norm
        
    # North is up x east (or perpendicular along meridian towards north pole)
    north = np.cross(up, east)
    north = north / np.linalg.norm(north)
    
    return east, north, up


def vector_to_az_el(vec_enu: np.ndarray) -> Tuple[float, float]:
    """Convert topocentric ENU (East, North, Up) displacement vector to Azimuth and Elevation.
    
    Args:
        vec_enu: 3D vector [e, n, u] relative to observer
        
    Returns:
        (azimuth_deg, elevation_deg)
        azimuth_deg: [0, 360) clockwise from true North (0=N, 90=E, 180=S, 270=W)
        elevation_deg: [-90, +90] angle above the local horizontal plane
    """
    e, n, u = vec_enu[0], vec_enu[1], vec_enu[2]
    horiz_dist = math.sqrt(e * e + n * n)
    if horiz_dist < 1e-9:
        el = 90.0 if u >= 0 else -90.0
        return 0.0, el
    
    # Azimuth: 0 = North (+n), 90 = East (+e)
    # atan2(e, n) gives angle clockwise from north
    az = math.degrees(math.atan2(e, n))
    if az < 0.0:
        az += 360.0
        
    el = math.degrees(math.atan2(u, horiz_dist))
    return az, el


def get_horizon_elevation(azimuth_deg: float, horizon_mask: Union[HorizonMask, List[HorizonPoint], dict]) -> float:
    """Look up or linearly interpolate the horizon obstruction elevation at any azimuth.
    
    Args:
        azimuth_deg: Azimuth angle in degrees [0, 360)
        horizon_mask: HorizonMask model, list of HorizonPoint, or serialized dictionary
        
    Returns:
        Interpolated obstruction elevation in degrees.
    """
    az = float(azimuth_deg) % 360.0
    
    points: List[HorizonPoint] = []
    if isinstance(horizon_mask, HorizonMask):
        points = horizon_mask.points
    elif isinstance(horizon_mask, dict):
        raw_pts = horizon_mask.get("points", [])
        points = [HorizonPoint(**p) if isinstance(p, dict) else p for p in raw_pts]
    elif isinstance(horizon_mask, list):
        points = [HorizonPoint(**p) if isinstance(p, dict) else p for p in horizon_mask]
    else:
        raise ValueError(f"Unsupported horizon_mask type: {type(horizon_mask)}")
        
    if not points:
        raise ValueError("Horizon mask contains no points.")
        
    # Sort points by azimuth if not already sorted
    sorted_pts = sorted(points, key=lambda p: p.azimuth_deg)
    az_vals = np.array([p.azimuth_deg for p in sorted_pts])
    el_vals = np.array([p.obstruction_elevation_deg for p in sorted_pts])
    
    # Exact match check
    idx = np.searchsorted(az_vals, az)
    if idx < len(az_vals) and math.isclose(az_vals[idx], az, abs_tol=1e-6):
        return float(el_vals[idx])
        
    # Handle cyclic interpolation between last point and first point
    if idx == 0:
        az0 = az_vals[-1] - 360.0
        el0 = el_vals[-1]
        az1 = az_vals[0]
        el1 = el_vals[0]
    elif idx == len(az_vals):
        az0 = az_vals[-1]
        el0 = el_vals[-1]
        az1 = az_vals[0] + 360.0
        el1 = el_vals[0]
    else:
        az0 = az_vals[idx - 1]
        el0 = el_vals[idx - 1]
        az1 = az_vals[idx]
        el1 = el_vals[idx]
        
    t = (az - az0) / (az1 - az0)
    interp_el = el0 + t * (el1 - el0)
    return float(interp_el)


def sample_ray_horizon_elevation(
    obs_cartesian: np.ndarray,
    east: np.ndarray,
    north: np.ndarray,
    up: np.ndarray,
    terrain_cartesian_points: np.ndarray
) -> float:
    """Compute the maximum elevation angle of terrain points viewed from the observer.
    
    Args:
        obs_cartesian: [X, Y, Z] of observer
        east, north, up: Local ENU orthonormal basis vectors
        terrain_cartesian_points: Array of shape (N, 3) representing sampled terrain points [X, Y, Z]
        
    Returns:
        Maximum elevation angle in degrees encountered.
    """
    diff = terrain_cartesian_points - obs_cartesian
    e = np.dot(diff, east)
    n = np.dot(diff, north)
    u = np.dot(diff, up)
    
    horiz_dist = np.sqrt(e * e + n * n)
    valid_mask = horiz_dist > 1.0  # Ignore self point (< 1m)
    if not np.any(valid_mask):
        return 0.0
        
    angles = np.degrees(np.arctan2(u[valid_mask], horiz_dist[valid_mask]))
    return float(np.max(angles))
