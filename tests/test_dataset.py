"""Unit and regression tests for normalized site dataset validation."""

from pathlib import Path
import pytest

from scripts.validate_dataset import validate_dataset_file


def test_final_site_data_passes_validation():
    """Verify that the generated production dataset passes all scientific validation rules."""
    dataset_path = "data/final/site_data.json"
    assert Path(dataset_path).exists(), f"Dataset file {dataset_path} does not exist!"
    
    is_valid, errors = validate_dataset_file(dataset_path)
    assert is_valid, f"Dataset validation failed: {errors}"
    assert len(errors) == 0


def test_validation_detects_corrupted_data(tmp_path):
    """Verify that validation strictly catches non-monotonicity and invalid coordinates."""
    import json
    
    with open("data/final/site_data.json", "r", encoding="utf-8") as f:
        valid_data = json.load(f)
        
    # Case 1: Corrupted latitude (> 90 deg)
    bad_lat = dict(valid_data)
    bad_lat["site"] = dict(valid_data["site"])
    bad_lat["site"]["latitude_deg"] = -95.0
    bad_file = tmp_path / "bad_lat.json"
    with open(bad_file, "w") as f:
        json.dump(bad_lat, f)
    valid, errs = validate_dataset_file(str(bad_file))
    assert not valid
    assert any("latitude" in e.lower() for e in errs)
    
    # Case 2: Non-monotonic ephemeris timestamps
    bad_ts = dict(valid_data)
    bad_ts["ephemeris"] = [dict(ep) for ep in valid_data["ephemeris"][:20]]
    # Invert timestamp order
    bad_ts["ephemeris"][1]["timestamp_utc"] = bad_ts["ephemeris"][0]["timestamp_utc"]

    bad_ts_file = tmp_path / "bad_ts.json"
    with open(bad_ts_file, "w") as f:
        json.dump(bad_ts, f)
    valid, errs = validate_dataset_file(str(bad_ts_file))
    assert not valid
    assert any("monotonic" in e.lower() for e in errs)
