import { HorizonMask } from "../types";
import { getHorizonElevation } from "./horizon";

export const SUN_ANGULAR_RADIUS_DEG = 0.267;
export const EARTH_ANGULAR_RADIUS_DEG = 0.95;

export interface TargetVisibilityResult {
  azimuth_deg: number;
  elevation_deg: number;
  horizon_deg: number;
  visibility_margin_deg: number;
  visible: boolean;
}

export function evaluateTargetVisibility(
  azimuthDeg: number,
  elevationDeg: number,
  horizonMask: HorizonMask,
  marginOffsetDeg: number = 0.0,
  minOperationalElDeg: number = -90.0
): TargetVisibilityResult {
  const horizonDeg = getHorizonElevation(azimuthDeg, horizonMask);
  const effectiveEl = elevationDeg + marginOffsetDeg;
  const marginDeg = effectiveEl - horizonDeg;
  const isAboveHorizon = marginDeg > 0;
  const isAboveOperationalCutoff = elevationDeg >= minOperationalElDeg;

  return {
    azimuth_deg: azimuthDeg,
    elevation_deg: elevationDeg,
    horizon_deg: horizonDeg,
    visibility_margin_deg: marginDeg,
    visible: isAboveHorizon && isAboveOperationalCutoff
  };
}
