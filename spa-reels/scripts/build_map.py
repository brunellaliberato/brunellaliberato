"""Monta as imagens de satélite e os contornos usados no vídeo.

Uso: uv run --with pillow scripts/build_map.py <pasta-com-geojsons>

Mapa: Sentinel-2 cloudless 2016 (EOX, CC BY 4.0) -> exige crédito no vídeo.
Contornos: Natural Earth (domínio público), click_that_hood (Portugal distritos, estados BR).
"""
import json
import math
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
GEO = Path(sys.argv[1])
OUT_IMG = ROOT / "public" / "map"
OUT_DATA = ROOT / "src" / "data"
CACHE = GEO / "tiles"
TILE_URL = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg"


def lonlat_to_tile(lon, lat, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def fetch(z, x, y):
    p = CACHE / f"{z}_{x}_{y}.jpg"
    if not p.exists():
        req = urllib.request.Request(TILE_URL.format(z=z, x=x, y=y), headers={"User-Agent": "spa-reels-pilot"})
        p.write_bytes(urllib.request.urlopen(req, timeout=30).read())
    return p


def stitch(name, z, west, south, east, north):
    x0, y0 = lonlat_to_tile(west, north, z)
    x1, y1 = lonlat_to_tile(east, south, z)
    xs = range(int(x0), int(x1) + 1)
    ys = range(int(y0), int(y1) + 1)
    jobs = [(z, x, y) for y in ys for x in xs]
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(lambda a: fetch(*a), jobs))
    img = Image.new("RGB", (len(xs) * 256, len(ys) * 256))
    for (zz, x, y) in jobs:
        img.paste(Image.open(CACHE / f"{zz}_{x}_{y}.jpg"), ((x - xs[0]) * 256, (y - ys[0]) * 256))
    # visual "documentário": mais escuro e contrastado, como na referência
    img = ImageEnhance.Brightness(img).enhance(0.78)
    img = ImageEnhance.Contrast(img).enhance(1.18)
    img = ImageEnhance.Color(img).enhance(0.92)
    img.save(OUT_IMG / f"{name}.jpg", quality=86)
    # limites em coordenadas de tile normalizadas (0..1 do mundo)
    n = 2 ** z
    return {
        "src": f"map/{name}.jpg",
        "x0": xs[0] / n, "y0": ys[0] / n,
        "x1": (xs[-1] + 1) / n, "y1": (ys[-1] + 1) / n,
        "w": img.width, "h": img.height,
    }


def dp(points, tol):
    """Douglas-Peucker."""
    if len(points) < 3:
        return points
    (ax, ay), (bx, by) = points[0], points[-1]
    dx, dy = bx - ax, by - ay
    norm = math.hypot(dx, dy) or 1e-12
    best, idx = 0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
        if d > best:
            best, idx = d, i
    if best > tol:
        return dp(points[: idx + 1], tol)[:-1] + dp(points[idx:], tol)
    return [points[0], points[-1]]


def rings(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    return [poly[0] for poly in geom["coordinates"]]


def simp(ring, tol, minpts=4):
    pts = [(round(x, 4), round(y, 4)) for x, y in ring]
    if len(pts) < minpts:
        return None
    # anel fechado: simplifica as duas metades separadamente
    mid = len(pts) // 2
    r = dp(pts[: mid + 1], tol)[:-1] + dp(pts[mid:], tol)
    return r if len(r) >= minpts else None


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    OUT_DATA.mkdir(parents=True, exist_ok=True)

    layers = {
        "world": stitch("world", 5, -80, -38, 12, 56),
        "iberia": stitch("iberia", 7, -15, 33.5, 4, 45.5),
        "portugal": stitch("portugal", 10, -10.4, 36.6, -5.6, 42.6),
    }

    ne50 = json.load(open(GEO / "ne50.geojson"))
    ne10 = json.load(open(GEO / "ne10.geojson"))
    br = json.load(open(GEO / "br_states.geojson"))
    pt = json.load(open(GEO / "pt.geojson"))

    def in_box(ring, w, s, e, n):
        return any(w <= x <= e and s <= y <= n for x, y in ring)

    # países de fundo (linhas finas) na área do Atlântico
    countries = []
    for f in ne50["features"]:
        for r in rings(f["geometry"]):
            if in_box(r, -85, -40, 20, 60):
                s = simp(r, 0.08)
                if s:
                    countries.append(s)

    brazil = []
    for f in ne50["features"]:
        if f["properties"].get("ADM0_A3") == "BRA":
            brazil = [s for r in rings(f["geometry"]) if (s := simp(r, 0.05))]

    # Portugal continental em alta resolução
    portugal = []
    spain = []
    for f in ne10["features"]:
        code = f["properties"].get("ADM0_A3")
        if code == "PRT":
            portugal = [s for r in rings(f["geometry"]) if r and in_box(r, -10, 36, -6, 43) and (s := simp(r, 0.004, 8))]
        if code == "ESP":
            spain = [s for r in rings(f["geometry"]) if in_box(r, -10, 35, 4, 44) and (s := simp(r, 0.01, 8))]

    districts = []
    for f in pt["features"]:
        for r in rings(f["geometry"]):
            s = simp(r, 0.006, 6)
            if s:
                districts.append(s)

    # Pernambuco em escala real, reposicionado sobre Portugal
    pe = next(f for f in br["features"] if f["properties"]["sigla"] == "PE")
    pe_rings = rings(pe["geometry"])
    main_ring = max(pe_rings, key=len)
    lat0 = sum(y for _, y in main_ring) / len(main_ring)
    lon0 = sum(x for x, _ in main_ring) / len(main_ring)
    target_lat, target_lon = 39.6, -8.0  # centro de Portugal continental
    pe_over = []
    for r in pe_rings:
        if not in_box(r, -42, -10, -34, -6):  # ignora Fernando de Noronha
            continue
        moved = []
        for x, y in r:
            kx = (x - lon0) * math.cos(math.radians(lat0))
            ky = y - lat0
            moved.append((target_lon + kx / math.cos(math.radians(target_lat)), target_lat + ky))
        s = simp(moved, 0.005, 8)
        if s:
            pe_over.append(s)

    data = {
        "layers": layers,
        "countries": countries,
        "brazil": brazil,
        "portugal": portugal,
        "spain": spain,
        "districts": districts,
        "pernambucoOverPortugal": pe_over,
    }
    (OUT_DATA / "geo.json").write_text(json.dumps(data, separators=(",", ":")))
    print({k: (len(v) if isinstance(v, list) else v) for k, v in data.items()})


if __name__ == "__main__":
    main()
