import requests
import json

url = "https://ssd.jpl.nasa.gov/api/horizons.api"

# Horizons API manual states:
# For observer on non-Earth body:
# CENTER = 'coord@301'
# COORD_TYPE = 'GEODETIC' or 'CYLINDRICAL'
# SITE_COORD = 'lon,lat,alt' (degrees east, deg north, km)

test_configs = [
    {
        "name": "coord@301 with SITE_COORD",
        "params": {
            "format": "json",
            "COMMAND": "'10'",
            "OBJ_DATA": "NO",
            "MAKE_EPHEM": "YES",
            "EPHEM_TYPE": "OBSERVER",
            "CENTER": "'coord@301'",
            "COORD_TYPE": "'GEODETIC'",
            "SITE_COORD": "'1.44,-80.13,-2.6'",
            "START_TIME": "'2026-02-15 00:00'",
            "STOP_TIME": "'2026-02-15 01:00'",
            "STEP_SIZE": "'15m'",
            "QUANTITIES": "'4'"
        }
    },
    {
        "name": "coord@301 without quotes around SITE_COORD",
        "params": {
            "format": "json",
            "COMMAND": "10",
            "OBJ_DATA": "NO",
            "MAKE_EPHEM": "YES",
            "EPHEM_TYPE": "OBSERVER",
            "CENTER": "coord@301",
            "COORD_TYPE": "GEODETIC",
            "SITE_COORD": "1.44,-80.13,-2.6",
            "START_TIME": "2026-02-15 00:00",
            "STOP_TIME": "2026-02-15 01:00",
            "STEP_SIZE": "15m",
            "QUANTITIES": "4"
        }
    },
    {
        "name": "Lunar center 500@301",
        "params": {
            "format": "json",
            "COMMAND": "'10'",
            "OBJ_DATA": "NO",
            "MAKE_EPHEM": "YES",
            "EPHEM_TYPE": "OBSERVER",
            "CENTER": "'500@301'",
            "START_TIME": "'2026-02-15 00:00'",
            "STOP_TIME": "'2026-02-15 01:00'",
            "STEP_SIZE": "'15m'",
            "QUANTITIES": "'4'"
        }
    }
]

for cfg in test_configs:
    print(f"--- Testing {cfg['name']} ---")
    r = requests.get(url, params=cfg["params"], timeout=30)
    print("Status:", r.status_code)
    try:
        data = r.json()
        if "error" in data:
            print("Error:", data["error"])
        elif "message" in data:
            print("Message:", data["message"])
        elif "result" in data:
            print("SUCCESS! Result snippet:")
            lines = data["result"].splitlines()
            for line in lines[:25]:
                print(line)
            # Find data table
            table_lines = [l for l in lines if "$$SOE" in l or "$$EOE" in l or (len(l) > 10 and "2026-" in l)]
            print("Table snippet:", table_lines[:5])
    except Exception as e:
        print("JSON parse error:", e, r.text[:200])
