"""Baixa as fotos do Wikimedia Commons e registra autor/licença em src/data/creditos.json."""
import json, re, time, urllib.parse, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "spa-reels-pilot/0.1"}
FOTOS = {
    "lisboa": "File:View of Praça do Comércio from the Tagus River in Lisbon, 20250604 2038 9656.jpg",
    "nata": "File:Pastel de Nata Pastéis de Belém (3780458880).jpg",
    "roca": "File:Cabo da Roca Lighthouse, 20250606 1547 0322.jpg",
    "nazare": "File:Mysovskiy Sergey surfing Nazare.jpg",
    "coimbra": "File:Universidade de Coimbra (53560519412).jpg",
    "douro": "File:Portugal Vallée du Douro (8121915978).jpg",
}
def get(url):
    for i in range(5):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(10 * (i + 1))
    raise RuntimeError("429 persistente")
creditos = {}
for key, title in FOTOS.items():
    q = urllib.parse.urlencode(dict(action="query", titles=title, prop="imageinfo", iiprop="url|extmetadata", iiurlwidth=900, format="json"))
    page = next(iter(json.loads(get("https://commons.wikimedia.org/w/api.php?" + q))["query"]["pages"].values()))
    if "imageinfo" not in page:
        print("NÃO ACHEI", key, title); continue
    ii = page["imageinfo"][0]; m = ii["extmetadata"]
    (ROOT / "public/fotos" / f"{key}.jpg").write_bytes(get(ii["thumburl"]))
    artist = re.sub("<[^>]+>", "", m.get("Artist", {}).get("value", "")).strip()
    creditos[key] = {"arquivo": title[5:], "autor": artist, "licenca": m.get("LicenseShortName", {}).get("value"), "pagina": ii["descriptionurl"]}
    print(key, "|", artist, "|", creditos[key]["licenca"])
    time.sleep(2)
(ROOT / "src/data/creditos.json").write_text(json.dumps(creditos, ensure_ascii=False, indent=2))
