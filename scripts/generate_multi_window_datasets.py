"""Generate real multi-date mission window datasets via NASA/JPL Horizons API for 2026 challenge."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.fetch_ephemeris import fetch_site_ephemeris
from scripts.build_site_dataset import VERIFIED_SITES, build_site_dataset

MISSION_WINDOWS = [
    {
        "window_id": "nov_2026",
        "label": "Nov 2026 Live Window (Nov 15 – Nov 29, 2026)",
        "short_label": "Nov 2026 (Live)",
        "start_utc": "2026-11-15T00:00:00",
        "duration_days": 14,
        "description": "Current Space Apps 2026 operational window (Southern Lunar Summer)."
    },
    {
        "window_id": "feb_2027",
        "label": "Q1 2027 Launch Slip (Feb 15 – Mar 01, 2027)",
        "short_label": "Feb 2027 (+3 Mo Slip)",
        "start_utc": "2027-02-15T00:00:00",
        "duration_days": 14,
        "description": "3-month delayed launch schedule sensitivity analysis."
    }
]


def main():
    base_dir = Path(__file__).resolve().parent.parent
    ephem_dir = base_dir / "data" / "processed" / "ephemeris"
    horizon_dir = base_dir / "data" / "processed" / "horizon"
    web_data_dir = base_dir / "web" / "public" / "data"
    web_data_dir.mkdir(parents=True, exist_ok=True)

    for win in MISSION_WINDOWS:
        win_id = win["window_id"]
        print(f"\n=== Processing Window: {win['label']} ===")
        for site_id, info in VERIFIED_SITES.items():
            ephem_tag = f"{site_id}_{win_id}"
            ephem_file = ephem_dir / f"{ephem_tag}_ephemeris.json"
            if not ephem_file.exists():
                fetch_site_ephemeris(
                    site_id=ephem_tag,
                    site_lon=info["longitude_deg"],
                    site_lat=info["latitude_deg"],
                    site_elevation_m=info["elevation_m"],
                    start_date=win["start_utc"],
                    duration_days=win["duration_days"],
                    step_minutes=15,
                    output_dir=str(ephem_dir),
                )
            else:
                print(f"Using cached ephemeris {ephem_file.name}")

            horizon_file = horizon_dir / f"{site_id}_horizon_mask.json"
            out_file = web_data_dir / f"{site_id}_{win_id}.json"
            build_site_dataset(
                site_id=site_id,
                horizon_mask_file=str(horizon_file),
                ephemeris_file=str(ephem_file),
                output_file=str(out_file),
            )

    # Also write windows_catalog.json for the frontend
    windows_catalog = [
        {
            "window_id": "im1_2024",
            "label": "Historical IM-1 Window (Feb 22 – Mar 07, 2024)",
            "short_label": "Feb 2024 (IM-1)",
            "start_utc": "2024-02-22T00:00:00Z",
            "end_utc": "2024-03-07T00:00:00Z",
            "description": "Historical Intuitive Machines IM-1 (Odysseus) landing operational window.",
            "file_suffix": ""
        },
        {
            "window_id": "nov_2026",
            "label": "Nov 2026 Live Window (Nov 15 – Nov 29, 2026)",
            "short_label": "Nov 2026 (Live)",
            "start_utc": "2026-11-15T00:00:00Z",
            "end_utc": "2026-11-29T00:00:00Z",
            "description": "Space Apps 2026 live mission window (Southern Lunar Summer).",
            "file_suffix": "_nov_2026"
        },
        {
            "window_id": "feb_2027",
            "label": "Q1 2027 Launch Slip (Feb 15 – Mar 01, 2027)",
            "short_label": "Feb 2027 (+3 Mo Slip)",
            "start_utc": "2027-02-15T00:00:00Z",
            "end_utc": "2027-03-01T00:00:00Z",
            "description": "3-month delayed launch window for schedule sensitivity comparison.",
            "file_suffix": "_feb_2027"
        }
    ]
    with open(web_data_dir / "windows_catalog.json", "w", encoding="utf-8") as f:
        json.dump(windows_catalog, f, indent=2)
    print("\nSaved web/public/data/windows_catalog.json")


if __name__ == "__main__":
    main()
