#!/usr/bin/env python3
"""Prepara os cortes de live (formato streamer em cima / jogo embaixo) a partir da análise do clipper.py.
Para cada candidato selecionado: recorta o trecho (com áudio da live), gera legendas palavra a palavra,
marca picos de áudio (zoom + whoosh) e reações (emoji + pop). Saída: <out>/livecut-<id>.json (props do Remotion).
Uso: livecut_prep.py <pasta-da-analise> <pasta-public> --cam x,y,w,h|none --game x,y,w,h --streamer @x --credit "..." [--hooks hooks.json]"""
import argparse
import json
import re
import subprocess
from pathlib import Path

import numpy as np

FPS = 30
WIN = 0.5
LAUGH = re.compile(r"\b(k{3,}|(ha){2,}|(rs){2,})\b", re.I)
SHOCK = re.compile(r"(!|\b(caralho|caramba|meu deus|nossa|mano|loucura|socorro|corre|olha)\b)", re.I)
FN = {"o", "a", "os", "as", "de", "da", "do", "das", "dos", "e", "que", "um", "uma", "no", "na", "em", "pra", "pro", "com", "por", "se", "eu", "é", "the", "a", "to", "of", "and"}


def rect(s: str):
    if s in ("none", ""):
        return None
    x, y, w, h = (int(v) for v in s.split(","))
    return {"x": x, "y": y, "w": w, "h": h}


def chunks(words, s0):
    """1–3 palavras por legenda, ≤ 16 caracteres; palavra de função não fica sozinha no fim."""
    out, cur = [], []
    for w in words:
        cur.append(w)
        txt = " ".join(x["w"] for x in cur)
        if len(cur) >= 3 or len(txt) >= 14 or re.search(r"[.!?,]$", w["w"]):
            if len(cur) > 1 and cur[-1]["w"].lower().strip(".,!?") in FN:
                last = cur.pop()
                out.append(cur)
                cur = [last]
            else:
                out.append(cur)
                cur = []
    if cur:
        out.append(cur)
    caps = []
    for c in out:
        text = " ".join(x["w"] for x in c).upper().strip()
        caps.append({"text": text, "from": round((c[0]["s"] - s0) * FPS), "to": round((c[-1]["e"] - s0) * FPS) + 4, "emphasis": bool(SHOCK.search(text))})
    for a, b in zip(caps, caps[1:]):  # sem sobreposição
        a["to"] = min(a["to"], b["from"])
    return caps


def hook_of(c):
    first = re.split(r"(?<=[.!?])\s", c["transcript"].strip())[0]
    h = first.upper()
    if len(h) > 38:
        h = h[:38].rsplit(" ", 1)[0] + "…"
    return h


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("analysis")
    ap.add_argument("public")
    ap.add_argument("--cam", default="none")
    ap.add_argument("--game", required=True)
    ap.add_argument("--streamer", required=True)
    ap.add_argument("--credit", required=True)
    ap.add_argument("--hooks", default=None)
    a = ap.parse_args()
    out = Path(a.analysis)
    rep = json.loads((out / "candidates.json").read_text())
    segs = json.loads((out / "transcript.json").read_text())
    energy = np.load(out / "energy.npy")
    hooks = json.loads(Path(a.hooks).read_text()) if a.hooks else {}
    meta = rep["video"]
    pub = Path(a.public) / "livecut"
    pub.mkdir(parents=True, exist_ok=True)
    made = []
    for c in rep["selected"]:
        s0, e0 = c["start"], c["end"]
        clip = pub / f"{out.name}-{c['id']}.mp4"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(s0), "-to", str(e0), "-i", meta["video"], "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "192k", str(clip)], check=True)
        words = [w for s in segs for w in s.get("words", []) if w["s"] >= s0 and w["e"] <= e0]
        win = energy[int(s0 / WIN): int(e0 / WIN) + 1]
        peaks = []
        for i in np.argsort(-win):
            t = i * WIN
            if win[i] < 2.2 or len(peaks) >= 4:
                break
            if t < 1.0 or t > (e0 - s0) - 1.5 or any(abs(t - p) < 2.5 for p in peaks):
                continue
            peaks.append(t)
        reactions = []
        for w in words:
            emoji = "😂" if LAUGH.search(w["w"]) else ("😱" if SHOCK.search(w["w"]) and any(abs((w["s"] - s0) - p) < 1.0 for p in peaks) else None)
            if emoji and len(reactions) < 3 and all(abs(r["frame"] - (w["s"] - s0) * FPS) > FPS * 2 for r in reactions):
                reactions.append({"frame": round((w["s"] - s0) * FPS), "emoji": emoji})
        dur = round((e0 - s0) * FPS)
        props = {
            "src": f"livecut/{clip.name}", "srcW": meta["width"], "srcH": meta["height"],
            "cam": rect(a.cam), "game": rect(a.game), "fps": FPS, "durationInFrames": dur,
            "hook": hooks.get(c["id"], hook_of(c)), "streamer": a.streamer, "credit": a.credit,
            "channel": "O CANAL DO GTA 6", "captions": chunks(words, s0),
            "punches": sorted(round(p * FPS) for p in peaks), "reactions": reactions,
            "_candidate": {k: c[k] for k in ("id", "start", "end", "score", "reason", "transcript", "spoiler_alert")},
        }
        f = out / f"livecut-{c['id']}.json"
        f.write_text(json.dumps(props, ensure_ascii=False, indent=1))
        made.append(str(f))
    print(json.dumps(made))


if __name__ == "__main__":
    main()
