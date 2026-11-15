"""Deterministic window detection and mission metrics calculation."""

from datetime import datetime
from typing import Dict, List, Optional, Tuple
from .models import DerivedMetrics, TimeWindow


def parse_iso_utc(ts_str: str) -> datetime:
    """Parse ISO UTC timestamp string."""
    clean = ts_str.replace("Z", "+00:00")
    return datetime.fromisoformat(clean)


def calculate_continuous_windows(
    timestamps_utc: List[str],
    state_flags: List[bool],
    window_type_true: str,
    window_type_false: Optional[str] = None
) -> List[TimeWindow]:
    """Calculate continuous time windows from discrete boolean time series.
    
    Works with arbitrary or variable temporal sample steps (15m, 30m, 60m).
    Assumes each sample at index i represents conditions over the interval [t_i - dt/2, t_i + dt/2],
    or spans the segment from t_i to t_{i+1}. Specifically, interval boundaries are defined
    from the start timestamp of a contiguous run to the end timestamp plus the trailing half-step.
    
    Args:
        timestamps_utc: Ordered list of ISO 8601 UTC timestamp strings.
        state_flags: Ordered list of booleans corresponding to each timestamp.
        window_type_true: Window type string when condition is True.
        window_type_false: Window type string when condition is False (optional).
        
    Returns:
        List of TimeWindow objects.
    """
    if not timestamps_utc or not state_flags or len(timestamps_utc) != len(state_flags):
        return []
        
    dts = [parse_iso_utc(ts) for ts in timestamps_utc]
    n = len(dts)
    
    # Estimate typical time step
    if n > 1:
        step_seconds = (dts[1] - dts[0]).total_seconds()
    else:
        step_seconds = 900.0  # fallback 15m
        
    windows: List[TimeWindow] = []
    
    curr_state = state_flags[0]
    run_start_idx = 0
    
    for i in range(1, n):
        if state_flags[i] != curr_state:
            # Run ended at i - 1
            start_time = dts[run_start_idx]
            # End time covers through the step after i - 1
            step_i = (dts[i] - dts[i - 1]).total_seconds()
            end_time = dts[i]
            duration_hours = (end_time - start_time).total_seconds() / 3600.0
            
            w_type = window_type_true if curr_state else window_type_false
            if w_type is not None:
                windows.append(TimeWindow(
                    start_utc=start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    end_utc=end_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    duration_hours=round(duration_hours, 3),
                    window_type=w_type  # type: ignore
                ))
            curr_state = state_flags[i]
            run_start_idx = i
            
    # Trailing run to end of dataset
    start_time = dts[run_start_idx]
    # Add one step to end time for the final sample
    final_step = (dts[-1] - dts[-2]).total_seconds() if n > 1 else step_seconds
    end_time = dts[-1]
    duration_hours = ((end_time - start_time).total_seconds() + final_step) / 3600.0
    w_type = window_type_true if curr_state else window_type_false
    if w_type is not None:
        final_end = end_time.fromtimestamp(end_time.timestamp() + final_step, tz=end_time.tzinfo)
        windows.append(TimeWindow(
            start_utc=start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            end_utc=final_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
            duration_hours=round(duration_hours, 3),
            window_type=w_type  # type: ignore
        ))
        
    return windows


def calculate_derived_metrics(
    timestamps_utc: List[str],
    sun_visible_flags: List[bool],
    dte_visible_flags: List[bool]
) -> Tuple[DerivedMetrics, List[TimeWindow]]:
    """Compute complete transparent mission decision metrics.
    
    Args:
        timestamps_utc: Monotonic ISO 8601 UTC timestamp series.
        sun_visible_flags: Boolean list of Sun visibility.
        dte_visible_flags: Boolean list of Earth DTE visibility.
        
    Returns:
        (DerivedMetrics, all_detected_windows)
    """
    n = len(timestamps_utc)
    if n == 0:
        raise ValueError("Cannot calculate metrics on empty timestamp list.")
        
    dts = [parse_iso_utc(ts) for ts in timestamps_utc]
    if n > 1:
        step_hours = (dts[1] - dts[0]).total_seconds() / 3600.0
    else:
        step_hours = 0.25
        
    total_duration_hours = n * step_hours
    
    # 1. Solar calculations
    sun_windows = calculate_continuous_windows(
        timestamps_utc, sun_visible_flags, "SUNLIGHT", "SOLAR_NIGHT"
    )
    active_sun_windows = [w for w in sun_windows if w.window_type == "SUNLIGHT"]
    total_sunlight_hours = sum(sun_visible_flags) * step_hours
    sunlight_coverage_percent = (total_sunlight_hours / total_duration_hours) * 100.0 if total_duration_hours > 0 else 0.0
    longest_sunlight_hours = max([w.duration_hours for w in active_sun_windows], default=0.0)
    sunlight_windows_count = len(active_sun_windows)
    
    # 2. DTE communications calculations
    dte_windows = calculate_continuous_windows(
        timestamps_utc, dte_visible_flags, "DTE_AVAILABLE", "DTE_BLACKOUT"
    )
    active_dte_windows = [w for w in dte_windows if w.window_type == "DTE_AVAILABLE"]
    blackout_windows = [w for w in dte_windows if w.window_type == "DTE_BLACKOUT"]
    
    total_dte_hours = sum(dte_visible_flags) * step_hours
    dte_coverage_percent = (total_dte_hours / total_duration_hours) * 100.0 if total_duration_hours > 0 else 0.0
    longest_dte_window_hours = max([w.duration_hours for w in active_dte_windows], default=0.0)
    longest_dte_blackout_hours = max([w.duration_hours for w in blackout_windows], default=0.0)
    dte_blackout_windows_count = len(blackout_windows)
    
    # 3. Simultaneous Sun and DTE calculations
    simultaneous_flags = [s and d for s, d in zip(sun_visible_flags, dte_visible_flags)]
    sim_windows = calculate_continuous_windows(
        timestamps_utc, simultaneous_flags, "SIMULTANEOUS_SUN_DTE", None
    )
    total_simultaneous_hours = sum(simultaneous_flags) * step_hours
    simultaneous_coverage_percent = (total_simultaneous_hours / total_duration_hours) * 100.0 if total_duration_hours > 0 else 0.0
    longest_simultaneous_hours = max([w.duration_hours for w in sim_windows], default=0.0)
    
    metrics = DerivedMetrics(
        total_duration_hours=round(total_duration_hours, 2),
        total_sunlight_hours=round(total_sunlight_hours, 2),
        sunlight_coverage_percent=round(sunlight_coverage_percent, 2),
        longest_sunlight_hours=round(longest_sunlight_hours, 2),
        sunlight_windows_count=sunlight_windows_count,
        total_dte_hours=round(total_dte_hours, 2),
        dte_coverage_percent=round(dte_coverage_percent, 2),
        longest_dte_window_hours=round(longest_dte_window_hours, 2),
        longest_dte_blackout_hours=round(longest_dte_blackout_hours, 2),
        dte_blackout_windows_count=dte_blackout_windows_count,
        total_simultaneous_hours=round(total_simultaneous_hours, 2),
        simultaneous_coverage_percent=round(simultaneous_coverage_percent, 2),
        longest_simultaneous_hours=round(longest_simultaneous_hours, 2)
    )
    
    all_windows = active_sun_windows + blackout_windows + sim_windows
    all_windows.sort(key=lambda w: w.start_utc)
    return metrics, all_windows
