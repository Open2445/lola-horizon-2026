"""Data models and schemas for lunar mission data and science calculations."""

from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class Provenance(BaseModel):
    """Data provenance and audit trail for authoritative datasets."""
    provider: str = Field(..., description="Agency or institute providing the data (e.g. NASA/JPL, NASA PDS)")
    dataset: str = Field(..., description="Dataset or service identifier (e.g. Horizons, LOLA GDR LDEM)")
    retrieved_utc: str = Field(..., description="ISO 8601 UTC timestamp of retrieval")
    source_url: str = Field(..., description="Authoritative URL or API endpoint")
    processing_script: str = Field(..., description="Script generating the processed data")
    source_type: Literal["authoritative", "synthetic", "derived"] = Field(
        default="authoritative",
        description="Type of source data"
    )
    notes: Optional[str] = None


class SiteMetadata(BaseModel):
    """Metadata describing a lunar landing or observation site."""
    site_id: str = Field(..., description="Machine-readable unique site identifier")
    name: str = Field(..., description="Display name of the site")
    category: str = Field(..., description="Classification (e.g. CLPS_LANDING_SITE, ARTEMIS_CANDIDATE)")
    mission: str = Field(..., description="Associated mission name (e.g. IM-1, PRIME-1)")
    latitude_deg: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees (-90 to +90)")
    longitude_deg: float = Field(..., ge=-180.0, le=360.0, description="Longitude in decimal degrees")
    elevation_m: float = Field(..., description="Elevation in meters relative to reference sphere (1737.4 km)")
    source_url: str = Field(..., description="Authoritative documentation reference URL")
    source_description: str = Field(..., description="Description of the coordinates source")
    coordinate_reference: str = Field(
        default="Lunar Mean Earth/Polar Axis (ME) IAU2000",
        description="Planetary coordinate reference frame"
    )
    verification_status: Literal["VERIFIED", "UNVERIFIED"] = Field(
        default="VERIFIED",
        description="Whether coordinates are verified against official sources"
    )


class HorizonPoint(BaseModel):
    """Obstruction elevation angle at a specific azimuth."""
    azimuth_deg: float = Field(..., ge=0.0, lt=360.0, description="Azimuth in degrees [0, 360), 0=North, 90=East")
    obstruction_elevation_deg: float = Field(
        ..., ge=-90.0, le=90.0,
        description="Highest terrain elevation angle encountered along this azimuth"
    )


class HorizonMask(BaseModel):
    """Full horizon mask profile around the site."""
    resolution_deg: float = Field(..., gt=0.0, le=90.0, description="Azimuth step size in degrees")
    points: List[HorizonPoint] = Field(..., description="Array of horizon points sorted by azimuth")
    provenance: Provenance = Field(..., description="Provenance of DEM used to generate mask")



class CelestialPoint(BaseModel):
    """Apparent topocentric coordinates of a celestial body."""
    azimuth_deg: float = Field(..., ge=0.0, lt=360.0, description="Azimuth in degrees [0, 360)")
    elevation_deg: float = Field(..., ge=-90.0, le=90.0, description="Elevation angle in degrees")


class TargetEphemeris(BaseModel):
    """Topocentric ephemeris sample for a given timestamp."""
    timestamp_utc: str = Field(..., description="ISO 8601 UTC timestamp")
    sun: CelestialPoint = Field(..., description="Apparent Sun azimuth and elevation")
    earth: CelestialPoint = Field(..., description="Apparent Earth azimuth and elevation")


class TimeWindow(BaseModel):
    """A continuous window of time with specific visibility conditions."""
    start_utc: str
    end_utc: str
    duration_hours: float
    window_type: Literal["SUNLIGHT", "SOLAR_NIGHT", "DTE_AVAILABLE", "DTE_BLACKOUT", "SIMULTANEOUS_SUN_DTE"]


class DerivedMetrics(BaseModel):
    """Calculated deterministic mission metrics."""
    total_duration_hours: float
    # Solar metrics
    total_sunlight_hours: float
    sunlight_coverage_percent: float
    longest_sunlight_hours: float
    sunlight_windows_count: int
    # DTE metrics
    total_dte_hours: float
    dte_coverage_percent: float
    longest_dte_window_hours: float
    longest_dte_blackout_hours: float
    dte_blackout_windows_count: int
    # Combined
    total_simultaneous_hours: float
    simultaneous_coverage_percent: float
    longest_simultaneous_hours: float


class SiteData(BaseModel):
    """Complete validated normalized dataset for a lunar site."""
    schema_version: str = Field(default="0.1.0", description="Semantic schema version")
    site: SiteMetadata
    horizon_mask: HorizonMask
    ephemeris_provenance: Provenance
    ephemeris: List[TargetEphemeris]
    metrics: Optional[DerivedMetrics] = None
    windows: Optional[List[TimeWindow]] = None
