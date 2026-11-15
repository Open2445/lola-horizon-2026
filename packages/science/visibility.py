"""Deterministic visibility engine for Sun and Earth from lunar surface sites."""

from typing import Union
from .horizon import get_horizon_elevation
from .models import HorizonMask

# Angular radius of the Sun viewed from 1 AU (~0.26 degrees)
SUN_ANGULAR_RADIUS_DEG = 0.267
# Angular radius of the Earth viewed from the Moon (~0.95 degrees)
EARTH_ANGULAR_RADIUS_DEG = 0.95


def is_target_visible(
    azimuth_deg: float,
    elevation_deg: float,
    horizon_mask: Union[HorizonMask, dict, list],
    margin_deg: float = 0.0
) -> bool:
    """Determine whether a celestial body is geometrically above the local terrain horizon.
    
    Args:
        azimuth_deg: Apparent topocentric azimuth of the target [0, 360)
        elevation_deg: Apparent topocentric elevation of the target [-90, +90]
        horizon_mask: HorizonMask object or point array
        margin_deg: Additional margin (e.g. angular radius of disk or antenna mask) in degrees
        
    Returns:
        True if target is above the terrain horizon obstruction angle.
    """
    horizon_el = get_horizon_elevation(azimuth_deg, horizon_mask)
    return (elevation_deg + margin_deg) > horizon_el


def calculate_solar_visibility(
    azimuth_deg: float,
    elevation_deg: float,
    horizon_mask: Union[HorizonMask, dict, list],
    use_upper_limb: bool = False
) -> bool:
    """Calculate whether the Sun provides geometric illumination at the site.
    
    Args:
        azimuth_deg: Sun topocentric azimuth [0, 360)
        elevation_deg: Sun center topocentric elevation [-90, +90]
        horizon_mask: Local terrain horizon profile
        use_upper_limb: If True, uses solar upper limb (elevation + 0.267°); if False, uses solar center.
        
    Returns:
        True if sunlight reaches the site unobstructed by terrain.
    """
    margin = SUN_ANGULAR_RADIUS_DEG if use_upper_limb else 0.0
    return is_target_visible(azimuth_deg, elevation_deg, horizon_mask, margin_deg=margin)


def calculate_dte_visibility(
    azimuth_deg: float,
    elevation_deg: float,
    horizon_mask: Union[HorizonMask, dict, list],
    min_operational_el_deg: float = 0.0
) -> bool:
    """Calculate Direct-To-Earth (DTE) radio communication link visibility.
    
    Args:
        azimuth_deg: Earth topocentric azimuth [0, 360)
        elevation_deg: Earth center topocentric elevation [-90, +90]
        horizon_mask: Local terrain horizon profile
        min_operational_el_deg: Minimum antenna gimbal / operational elevation cutoff (default 0.0°)
        
    Returns:
        True if Earth has line-of-sight clearance above local terrain and antenna limit.
    """
    if elevation_deg < min_operational_el_deg:
        return False
    return is_target_visible(azimuth_deg, elevation_deg, horizon_mask, margin_deg=0.0)
