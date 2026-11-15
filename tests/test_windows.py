"""Unit tests for continuous window calculations and derived metrics."""

from datetime import datetime, timedelta
import pytest

from packages.science.windows import (
    calculate_continuous_windows,
    calculate_derived_metrics,
)


def generate_time_series(start_iso: str, count: int, step_minutes: int):
    """Helper to generate sequential ISO UTC timestamp strings."""
    start_dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    return [
        (start_dt + timedelta(minutes=i * step_minutes)).strftime("%Y-%m-%dT%H:%M:%SZ")
        for i in range(count)
    ]


def test_continuous_windows_basic():
    """Verify window generation for alternating boolean series."""
    # 6 steps of 60 minutes: T, T, F, F, T, T
    # Timestamps: 00:00, 01:00, 02:00, 03:00, 04:00, 05:00
    ts = generate_time_series("2026-03-01T00:00:00Z", 6, 60)
    flags = [True, True, False, False, True, True]
    
    windows = calculate_continuous_windows(ts, flags, "SUNLIGHT", "SOLAR_NIGHT")
    assert len(windows) == 3
    
    # First sunlight window: 00:00 to 02:00 (2 hours)
    assert windows[0].window_type == "SUNLIGHT"
    assert windows[0].start_utc == "2026-03-01T00:00:00Z"
    assert windows[0].end_utc == "2026-03-01T02:00:00Z"
    assert windows[0].duration_hours == 2.0
    
    # Night window: 02:00 to 04:00 (2 hours)
    assert windows[1].window_type == "SOLAR_NIGHT"
    assert windows[1].start_utc == "2026-03-01T02:00:00Z"
    assert windows[1].end_utc == "2026-03-01T04:00:00Z"
    assert windows[1].duration_hours == 2.0
    
    # Second sunlight window: 04:00 to 06:00 (2 hours)
    assert windows[2].window_type == "SUNLIGHT"
    assert windows[2].start_utc == "2026-03-01T04:00:00Z"
    assert windows[2].end_utc == "2026-03-01T06:00:00Z"
    assert windows[2].duration_hours == 2.0


def test_continuous_windows_different_intervals():
    """Verify handling of 15m, 30m, and 60m sample intervals."""
    for step in [15, 30, 60]:
        ts = generate_time_series("2026-01-01T00:00:00Z", 4, step)
        flags = [True, True, True, True]
        windows = calculate_continuous_windows(ts, flags, "DTE_AVAILABLE")
        assert len(windows) == 1
        expected_hours = (4 * step) / 60.0
        assert windows[0].duration_hours == pytest.approx(expected_hours)


def test_derived_metrics_calculation():
    """Verify transparent derived metrics calculations without score heuristics."""
    # 8 samples of 15 minutes = 2 hours total
    ts = generate_time_series("2026-06-01T00:00:00Z", 8, 15)
    # Sun visible in first 4 samples (1.0 hr), night in last 4
    sun = [True, True, True, True, False, False, False, False]
    # DTE visible in all except sample 2 and 3 (blackout of 30 min)
    dte = [True, True, False, False, True, True, True, True]
    
    metrics, windows = calculate_derived_metrics(ts, sun, dte)
    
    assert metrics.total_duration_hours == 2.0
    assert metrics.total_sunlight_hours == 1.0
    assert metrics.sunlight_coverage_percent == 50.0
    assert metrics.longest_sunlight_hours == 1.0
    assert metrics.sunlight_windows_count == 1
    
    # DTE metrics: 6 samples visible * 0.25h = 1.5h
    assert metrics.total_dte_hours == 1.5
    assert metrics.dte_coverage_percent == 75.0
    assert metrics.longest_dte_blackout_hours == 0.5
    assert metrics.dte_blackout_windows_count == 1
    
    # Simultaneous: index 0 and 1 are both True -> 2 samples * 0.25h = 0.5h
    assert metrics.total_simultaneous_hours == 0.5
    assert metrics.simultaneous_coverage_percent == 25.0
    assert metrics.longest_simultaneous_hours == 0.5
