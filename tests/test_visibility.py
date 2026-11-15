"""Unit tests for deterministic target visibility engine."""

import pytest

from packages.science.models import HorizonMask, HorizonPoint, Provenance
from packages.science.visibility import (
    calculate_dte_visibility,
    calculate_solar_visibility,
    is_target_visible,
)


@pytest.fixture
def sample_horizon_mask():
    """Provides a synthetic 4-point horizon mask for visibility tests."""
    points = [
        HorizonPoint(azimuth_deg=0.0, obstruction_elevation_deg=3.0),
        HorizonPoint(azimuth_deg=90.0, obstruction_elevation_deg=5.0),
        HorizonPoint(azimuth_deg=180.0, obstruction_elevation_deg=2.0),
        HorizonPoint(azimuth_deg=270.0, obstruction_elevation_deg=8.0),
    ]
    provenance = Provenance(
        provider="TEST",
        dataset="SYNTHETIC",
        retrieved_utc="2026-01-01T00:00:00Z",
        source_url="http://example.com",
        processing_script="test_visibility.py",
        source_type="synthetic"
    )
    return HorizonMask(resolution_deg=90.0, points=points, provenance=provenance)


def test_is_target_visible(sample_horizon_mask):
    """Test geometric clearance against terrain obstruction."""
    # At Az=0, horizon obstruction is 3.0 deg
    assert is_target_visible(0.0, 3.5, sample_horizon_mask) is True
    assert is_target_visible(0.0, 2.5, sample_horizon_mask) is False
    assert is_target_visible(0.0, 3.0, sample_horizon_mask) is False  # Equal is blocked

    # At Az=270, horizon obstruction is 8.0 deg
    assert is_target_visible(270.0, 8.1, sample_horizon_mask) is True
    assert is_target_visible(270.0, 7.9, sample_horizon_mask) is False


def test_solar_visibility_options(sample_horizon_mask):
    """Test solar visibility with and without solar upper limb disk radius."""
    # At Az=0, obstruction is 3.0 deg.
    # Solar center at 2.85 deg is below 3.0 -> False
    assert calculate_solar_visibility(0.0, 2.85, sample_horizon_mask, use_upper_limb=False) is False
    
    # But with upper limb (2.85 + 0.267 = 3.117 > 3.0) -> True
    assert calculate_solar_visibility(0.0, 2.85, sample_horizon_mask, use_upper_limb=True) is True


def test_dte_visibility_operational_cutoff(sample_horizon_mask):
    """Test Direct-To-Earth visibility respecting antenna elevation threshold."""
    # At Az=180, obstruction is 2.0 deg.
    # Earth at 3.0 deg is above terrain (3.0 > 2.0)
    assert calculate_dte_visibility(180.0, 3.0, sample_horizon_mask, min_operational_el_deg=0.0) is True
    
    # If ground station / gimbal requires 5.0 deg minimum elevation:
    assert calculate_dte_visibility(180.0, 3.0, sample_horizon_mask, min_operational_el_deg=5.0) is False
