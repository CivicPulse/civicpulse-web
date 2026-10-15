#!/usr/bin/env python3
"""Rebuild recreation center GeoJSON from saved county data and Census responses. No network calls."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/sources/recreation"
records = json.loads((SOURCE / "centers.json").read_text())
responses = json.loads((SOURCE / "geocoder-responses.json").read_text())
manifest = json.loads((SOURCE / "manifest.json").read_text())
assert len(records) == manifest["expectedCount"]
assert len({r["id"] for r in records}) == len(records)
features = []
for record in records:
    matches = responses[record["id"]]["response"]["result"]["addressMatches"]
    assert len(matches) == 1, "Review ambiguous or missing match: " + record["name"]
    match = matches[0]
    lon, lat = match["coordinates"]["x"], match["coordinates"]["y"]
    assert -84 < lon < -83 and 32 < lat < 34, "Location outside Macon area"
    props = {**record, "geocodedAddress": match["matchedAddress"],
             "coordinateSource": "US Census Geocoder", "coordinateAccuracy": "approximate street-address location"}
    features.append({"type": "Feature", "id": record["id"], "properties": props,
                     "geometry": {"type": "Point", "coordinates": [lon, lat]}})
output = ROOT / "public/data/recreation-centers.geojson"
output.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
print(f"Rebuilt {len(features)} recreation centers: {output}")
