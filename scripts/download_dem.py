"""Download and cache Lunar LOLA Digital Elevation Model (DEM) data from NASA PDS or USGS."""

import argparse
import os
import re
import sys
from pathlib import Path
import requests

PDS_POLAR_BASE = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/"

def list_pds_products():
    """List available LOLA polar products on PDS Geosciences."""
    print(f"Querying {PDS_POLAR_BASE}...")
    r = requests.get(PDS_POLAR_BASE, timeout=20)
    r.raise_for_status()
    # PDS IIS HTML format: <A HREF="/path/">name</A>
    links = re.findall(r'<A\s+HREF=["\']([^"\']+)["\']>([^<]+)</A>', r.text, re.IGNORECASE)
    subdirs = [href for href, text in links if href.endswith("/")]
    print("Found subdirectories:", subdirs)
    
    products = {}
    for subdir_path in subdirs:
        sub_name = subdir_path.strip("/").split("/")[-1]
        if sub_name in ["img", "float_img"]:
            sub_url = f"https://pds-geosciences.wustl.edu{subdir_path}"
            sr = requests.get(sub_url, timeout=20)
            sub_links = re.findall(r'<A\s+HREF=["\']([^"\']+)["\']>([^<]+)</A>', sr.text, re.IGNORECASE)
            items = [href for href, text in sub_links if any(ext in href.lower() for ext in ['.img', '.lbl', '.tif', '.jp2'])]
            products[sub_name] = items
            print(f"\nProducts in {sub_name}: {len(items)} files")
            for item in items:
                fname = item.split("/")[-1]
                if any(x in fname.lower() for x in ['80s_80m', '80s_40m', '75s_240m', '75s_120m', '85s_40m']):
                    item_url = f"https://pds-geosciences.wustl.edu{item}"
                    try:
                        h = requests.head(item_url, timeout=10)
                        size_mb = int(h.headers.get("content-length", 0)) / (1024 * 1024)
                        print(f"  - {fname:25s} ({size_mb:7.2f} MB) -> {item_url}")
                    except Exception:
                        print(f"  - {fname:25s} -> {item_url}")
    return products



def download_file(url: str, output_path: Path):
    """Download a file with progress reporting."""
    print(f"Downloading from {url} to {output_path}...")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        total_size = int(r.headers.get("content-length", 0))
        downloaded = 0
        with open(output_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\rProgress: {downloaded / (1024*1024):.1f} MB / {total_size / (1024*1024):.1f} MB ({percent:.1f}%)", end="")
                    else:
                        print(f"\rDownloaded: {downloaded / (1024*1024):.1f} MB", end="")
        print("\nDownload complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download Lunar DEM from NASA PDS")
    parser.add_argument("--list", action="store_true", help="List available PDS products")
    parser.add_argument("--url", type=str, help="Direct URL to download")
    parser.add_argument("--out", type=str, default="data/raw/terrain/", help="Output directory or file path")
    args = parser.parse_args()

    if args.list:
        list_pds_products()
    elif args.url:
        out_p = Path(args.out)
        if out_p.is_dir() or str(args.out).endswith("/") or str(args.out).endswith("\\"):
            filename = args.url.split("/")[-1]
            out_p = out_p / filename
        download_file(args.url, out_p)
    else:
        list_pds_products()
