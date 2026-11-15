export interface Provenance {
  provider: string;
  dataset: string;
  retrieved_utc: string;
  source_url: string;
  processing_script: string;
  source_type: "authoritative" | "synthetic" | "derived";
  notes?: string;
}

export interface SiteMetadata {
  site_id: string;
  name: string;
  category: string;
  mission: string;
  latitude_deg: float;
  longitude_deg: float;
  elevation_m: float;
  source_url: string;
  source_description: string;
  coordinate_reference: string;
  verification_status: "VERIFIED" | "UNVERIFIED";
}

type float = number;

export interface HorizonPoint {
  azimuth_deg: number;
  obstruction_elevation_deg: number;
}

export interface HorizonMask {
  resolution_deg: number;
  points: HorizonPoint[];
  provenance: Provenance;
}

export interface CelestialPoint {
  azimuth_deg: number;
  elevation_deg: number;
}

export interface TargetEphemeris {
  timestamp_utc: string;
  sun: CelestialPoint;
  earth: CelestialPoint;
}

export interface TimeWindow {
  start_utc: string;
  end_utc: string;
  duration_hours: number;
  window_type: "SUNLIGHT" | "SOLAR_NIGHT" | "DTE_AVAILABLE" | "DTE_BLACKOUT" | "SIMULTANEOUS_SUN_DTE";
}

export interface DerivedMetrics {
  total_duration_hours: number;
  total_sunlight_hours: number;
  sunlight_coverage_percent: number;
  longest_sunlight_hours: number;
  sunlight_windows_count: number;
  total_dte_hours: number;
  dte_coverage_percent: number;
  longest_dte_window_hours: number;
  longest_dte_blackout_hours: number;
  dte_blackout_windows_count: number;
  total_simultaneous_hours: number;
  simultaneous_coverage_percent: number;
  longest_simultaneous_hours: number;
}

export interface SiteData {
  schema_version: string;
  site: SiteMetadata;
  horizon_mask: HorizonMask;
  ephemeris_provenance: Provenance;
  ephemeris: TargetEphemeris[];
  metrics: DerivedMetrics;
  windows: TimeWindow[];
}

export interface SiteCatalogItem {
  site_id: string;
  name: string;
  mission: string;
  category: string;
  latitude_deg: number;
  longitude_deg: number;
  elevation_m: number;
  canonical_lola_elevation_m?: number;
  canonical_lroc_elevation_m?: number;
  source_organization?: string;
  source_url?: string;
  coordinate_reference?: string;
  provenance_notes?: string;
  data_file: string;
  historical_mission: string;
  highlights: string;
}

export interface MissionWindowItem {
  window_id: string;
  label: string;
  short_label: string;
  start_utc: string;
  end_utc: string;
  description: string;
  file_suffix: string;
}

export interface InspectedSampleState {
  index: number;
  timestamp_utc: string;
  sun: {
    azimuth_deg: number;
    elevation_deg: number;
    horizon_deg: number;
    visibility_margin_deg: number;
    visible: boolean;
  };
  earth: {
    azimuth_deg: number;
    elevation_deg: number;
    horizon_deg: number;
    visibility_margin_deg: number;
    visible: boolean;
  };
}
