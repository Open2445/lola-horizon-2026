"""Unit tests for topocentric coordinate transformations and horizon mask calculations."""

import math
import numpy as np
import pytest

from packages.science.horizon import (
    LUNAR_RADIUS_M,
    get_horizon_elevation,
    latlon_to_cartesian,
    topocentric_enu_basis,
    vector_to_az_el,
)
from packages.science.models import HorizonMask, HorizonPoint, Provenance


def test_latlon_to_cartesian():
    """Verify spherical to 3D Cartesian conversions."""
    # North Pole
    p_np = latlon_to_cartesian(90.0, 0.0, 0.0)
    assert np.allclose(p_np, [0.0, 0.0, LUNAR_RADIUS_M], atol=1e-3)
    
    # South Pole
    p_sp = latlon_to_cartesian(-90.0, 0.0, 0.0)
    assert np.allclose(p_sp, [0.0, 0.0, -LUNAR_RADIUS_M], atol=1e-3)
    
    # Equator, Prime Meridian
    p_eq0 = latlon_to_cartesian(0.0, 0.0, 100.0)
    assert np.allclose(p_eq0, [LUNAR_RADIUS_M + 100.0, 0.0, 0.0], atol=1e-3)
    
    # Equator, 90 deg East
    p_eq90 = latlon_to_cartesian(0.0, 90.0, 0.0)
    assert np.allclose(p_eq90, [0.0, LUNAR_RADIUS_M, 0.0], atol=1e-3)


def test_topocentric_enu_basis():
    """Verify local ENU orthonormal basis vectors."""
    east, north, up = topocentric_enu_basis(-80.0, 45.0)
    
    # Unit lengths
    assert math.isclose(np.linalg.norm(east), 1.0, abs_tol=1e-7)
    assert math.isclose(np.linalg.norm(north), 1.0, abs_tol=1e-7)
    assert math.isclose(np.linalg.norm(up), 1.0, abs_tol=1e-7)
    
    # Mutual orthogonality
    assert math.isclose(np.dot(east, north), 0.0, abs_tol=1e-7)
    assert math.isclose(np.dot(east, up), 0.0, abs_tol=1e-7)
    assert math.isclose(np.dot(north, up), 0.0, abs_tol=1e-7)
    
    # Right-handed coordinate frame: east x north = up
    cross_en = np.cross(east, north)
    assert np.allclose(cross_en, up, atol=1e-6)


def test_vector_to_az_el():
    """Verify vector to Azimuth/Elevation conversions for cardinal directions."""
    # North vector [0, 1, 0] -> Az = 0, El = 0
    az, el = vector_to_az_el(np.array([0.0, 100.0, 0.0]))
    assert math.isclose(az, 0.0, abs_tol=1e-6)
    assert math.isclose(el, 0.0, abs_tol=1e-6)
    
    # East vector [1, 0, 0] -> Az = 90, El = 0
    az, el = vector_to_az_el(np.array([100.0, 0.0, 0.0]))
    assert math.isclose(az, 90.0, abs_tol=1e-6)
    assert math.isclose(el, 0.0, abs_tol=1e-6)
    
    # South vector [0, -1, 0] -> Az = 180, El = 0
    az, el = vector_to_az_el(np.array([0.0, -100.0, 0.0]))
    assert math.isclose(az, 180.0, abs_tol=1e-6)
    assert math.isclose(el, 0.0, abs_tol=1e-6)
    
    # West vector [-1, 0, 0] -> Az = 270, El = 0
    az, el = vector_to_az_el(np.array([-100.0, 0.0, 0.0]))
    assert math.isclose(az, 270.0, abs_tol=1e-6)
    assert math.isclose(el, 0.0, abs_tol=1e-6)
    
    # Zenith vector [0, 0, 1] -> El = 90
    az, el = vector_to_az_el(np.array([0.0, 0.0, 50.0]))
    assert math.isclose(el, 90.0, abs_tol=1e-6)
    
    # Nadir vector [0, 0, -1] -> El = -90
    az, el = vector_to_az_el(np.array([0.0, 0.0, -50.0]))
    assert math.isclose(el, -90.0, abs_tol=1e-6)


def test_get_horizon_elevation_interpolation():
    """Verify horizon lookup, linear interpolation, and cyclic boundary wrap-around."""
    dummy_points = [
        HorizonPoint(azimuth_deg=0.0, obstruction_elevation_deg=2.0),
        HorizonPoint(azimuth_deg=90.0, obstruction_elevation_deg=6.0),
        HorizonPoint(azimuth_deg=180.0, obstruction_elevation_deg=4.0),
        HorizonPoint(azimuth_deg=270.0, obstruction_elevation_deg=8.0),
    ]
    provenance = Provenance(
        provider="NASA/TEST",
        dataset="TEST_DATA",
        retrieved_utc="2026-01-01T00:00:00Z",
        source_url="http://example.com",
        processing_script="test_horizon.py",
        source_type="synthetic"
    )
    mask = HorizonMask(resolution_deg=90.0, points=dummy_points, provenance=provenance)
    
    # Exact points
    assert math.isclose(get_horizon_elevation(0.0, mask), 2.0, abs_tol=1e-5)
    assert math.isclose(get_horizon_elevation(90.0, mask), 6.0, abs_tol=1e-5)
    assert math.isclose(get_horizon_elevation(180.0, mask), 4.0, abs_tol=1e-5)
    assert math.isclose(get_horizon_elevation(270.0, mask), 8.0, abs_tol=1e-5)
    
    # Midpoints
    # 45 deg between 0 (2.0) and 90 (6.0) -> 4.0
    assert math.isclose(get_horizon_elevation(45.0, mask), 4.0, abs_tol=1e-5)
    # 135 deg between 90 (6.0) and 180 (4.0) -> 5.0
    assert math.isclose(get_horizon_elevation(135.0, mask), 5.0, abs_tol=1e-5)
    
    # Cyclic wrapping across 360 -> 0:
    # 315 deg between 270 (8.0) and 360/0 (2.0) -> midpoint is 5.0
    assert math.isclose(get_horizon_elevation(315.0, mask), 5.0, abs_tol=1e-5)
    # 350 deg: t = (350 - 270) / 90 = 80/90
    expected_350 = 8.0 + (80.0 / 90.0) * (2.0 - 8.0)
    assert math.isclose(get_horizon_elevation(350.0, mask), expected_350, abs_tol=1e-5)
    
    # Input >= 360 modulo wrapping
    assert math.isclose(get_horizon_elevation(360.0, mask), 2.0, abs_tol=1e-5)
    assert math.isclose(get_horizon_elevation(450.0, mask), 6.0, abs_tol=1e-5)
