import { HorizonMask, HorizonPoint } from "../types";

/**
 * Deterministic linear interpolation of horizon obstruction elevation at any continuous azimuth.
 * Accurately handles cyclic boundary wrap-around across 360° -> 0°.
 */
export function getHorizonElevation(azimuthDeg: number, horizonMask: HorizonMask): number {
  const az = ((azimuthDeg % 360) + 360) % 360;
  const points = horizonMask.points;
  if (!points || points.length === 0) return 0.0;

  // Binary search or linear scan for sorted points
  const n = points.length;
  let idx = 0;
  while (idx < n && points[idx].azimuth_deg < az) {
    idx++;
  }

  // Exact match
  if (idx < n && Math.abs(points[idx].azimuth_deg - az) < 1e-6) {
    return points[idx].obstruction_elevation_deg;
  }

  // Handle cyclic boundary interpolation
  let az0: number, el0: number, az1: number, el1: number;
  if (idx === 0) {
    az0 = points[n - 1].azimuth_deg - 360.0;
    el0 = points[n - 1].obstruction_elevation_deg;
    az1 = points[0].azimuth_deg;
    el1 = points[0].obstruction_elevation_deg;
  } else if (idx === n) {
    az0 = points[n - 1].azimuth_deg;
    el0 = points[n - 1].obstruction_elevation_deg;
    az1 = points[0].azimuth_deg + 360.0;
    el1 = points[0].obstruction_elevation_deg;
  } else {
    az0 = points[idx - 1].azimuth_deg;
    el0 = points[idx - 1].obstruction_elevation_deg;
    az1 = points[idx].azimuth_deg;
    el1 = points[idx].obstruction_elevation_deg;
  }

  const t = (az - az0) / (az1 - az0);
  return el0 + t * (el1 - el0);
}
