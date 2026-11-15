import { DerivedMetrics, TimeWindow } from "../types";

export function calculateContinuousWindows(
  timestampsUtc: string[],
  stateFlags: boolean[],
  windowTypeTrue: TimeWindow["window_type"],
  windowTypeFalse?: TimeWindow["window_type"]
): TimeWindow[] {
  if (!timestampsUtc || !stateFlags || timestampsUtc.length !== stateFlags.length || timestampsUtc.length === 0) {
    return [];
  }

  const n = timestampsUtc.length;
  const dts = timestampsUtc.map((ts) => new Date(ts).getTime());
  const stepMs = n > 1 ? dts[1] - dts[0] : 900000;

  const windows: TimeWindow[] = [];
  let currState = stateFlags[0];
  let runStartIdx = 0;

  for (let i = 1; i < n; i++) {
    if (stateFlags[i] !== currState) {
      const startTime = new Date(dts[runStartIdx]);
      const endTime = new Date(dts[i]);
      const durationHours = (endTime.getTime() - startTime.getTime()) / 3600000;

      const wType = currState ? windowTypeTrue : windowTypeFalse;
      if (wType) {
        windows.push({
          start_utc: startTime.toISOString().replace(".000Z", "Z"),
          end_utc: endTime.toISOString().replace(".000Z", "Z"),
          duration_hours: Number(durationHours.toFixed(3)),
          window_type: wType
        });
      }
      currState = stateFlags[i];
      runStartIdx = i;
    }
  }

  // Final trailing window
  const startTime = new Date(dts[runStartIdx]);
  const finalStepMs = n > 1 ? dts[n - 1] - dts[n - 2] : stepMs;
  const finalEnd = new Date(dts[n - 1] + finalStepMs);
  const durationHours = (finalEnd.getTime() - startTime.getTime()) / 3600000;
  const wType = currState ? windowTypeTrue : windowTypeFalse;
  if (wType) {
    windows.push({
      start_utc: startTime.toISOString().replace(".000Z", "Z"),
      end_utc: finalEnd.toISOString().replace(".000Z", "Z"),
      duration_hours: Number(durationHours.toFixed(3)),
      window_type: wType
    });
  }

  return windows;
}

export function computeDerivedMetrics(
  timestampsUtc: string[],
  sunVisibleFlags: boolean[],
  dteVisibleFlags: boolean[]
): { metrics: DerivedMetrics; windows: TimeWindow[] } {
  const n = timestampsUtc.length;
  if (n === 0) {
    throw new Error("Cannot calculate metrics on empty timestamp list.");
  }

  const dts = timestampsUtc.map((ts) => new Date(ts).getTime());
  const stepHours = n > 1 ? (dts[1] - dts[0]) / 3600000 : 0.25;
  const totalDurationHours = n * stepHours;

  const sunWindows = calculateContinuousWindows(timestampsUtc, sunVisibleFlags, "SUNLIGHT", "SOLAR_NIGHT");
  const activeSunWindows = sunWindows.filter((w) => w.window_type === "SUNLIGHT");
  const totalSunlightHours = sunVisibleFlags.filter(Boolean).length * stepHours;
  const sunlightCoveragePercent = totalDurationHours > 0 ? (totalSunlightHours / totalDurationHours) * 100 : 0;
  const longestSunlightHours = Math.max(...activeSunWindows.map((w) => w.duration_hours), 0);

  const dteWindows = calculateContinuousWindows(timestampsUtc, dteVisibleFlags, "DTE_AVAILABLE", "DTE_BLACKOUT");
  const activeDteWindows = dteWindows.filter((w) => w.window_type === "DTE_AVAILABLE");
  const blackoutWindows = dteWindows.filter((w) => w.window_type === "DTE_BLACKOUT");
  const totalDteHours = dteVisibleFlags.filter(Boolean).length * stepHours;
  const dteCoveragePercent = totalDurationHours > 0 ? (totalDteHours / totalDurationHours) * 100 : 0;
  const longestDteWindowHours = Math.max(...activeDteWindows.map((w) => w.duration_hours), 0);
  const longestDteBlackoutHours = Math.max(...blackoutWindows.map((w) => w.duration_hours), 0);

  const simFlags = sunVisibleFlags.map((s, i) => s && dteVisibleFlags[i]);
  const simWindows = calculateContinuousWindows(timestampsUtc, simFlags, "SIMULTANEOUS_SUN_DTE");
  const totalSimultaneousHours = simFlags.filter(Boolean).length * stepHours;
  const simultaneousCoveragePercent = totalDurationHours > 0 ? (totalSimultaneousHours / totalDurationHours) * 100 : 0;
  const longestSimultaneousHours = Math.max(...simWindows.map((w) => w.duration_hours), 0);

  const metrics: DerivedMetrics = {
    total_duration_hours: Number(totalDurationHours.toFixed(2)),
    total_sunlight_hours: Number(totalSunlightHours.toFixed(2)),
    sunlight_coverage_percent: Number(sunlightCoveragePercent.toFixed(2)),
    longest_sunlight_hours: Number(longestSunlightHours.toFixed(2)),
    sunlight_windows_count: activeSunWindows.length,
    total_dte_hours: Number(totalDteHours.toFixed(2)),
    dte_coverage_percent: Number(dteCoveragePercent.toFixed(2)),
    longest_dte_window_hours: Number(longestDteWindowHours.toFixed(2)),
    longest_dte_blackout_hours: Number(longestDteBlackoutHours.toFixed(2)),
    dte_blackout_windows_count: blackoutWindows.length,
    total_simultaneous_hours: Number(totalSimultaneousHours.toFixed(2)),
    simultaneous_coverage_percent: Number(simultaneousCoveragePercent.toFixed(2)),
    longest_simultaneous_hours: Number(longestSimultaneousHours.toFixed(2))
  };

  const allWindows = [...activeSunWindows, ...blackoutWindows, ...simWindows].sort((a, b) =>
    a.start_utc.localeCompare(b.start_utc)
  );

  return { metrics, windows: allWindows };
}
