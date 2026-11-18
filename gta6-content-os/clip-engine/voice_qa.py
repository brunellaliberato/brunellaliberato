#!/usr/bin/env python3
"""REGRA de pronúncia (18/11/2026): cada palavra comum do roteiro precisa ser reconhecida na fala gerada.
Pega troca de idioma/sotaque (ex.: "vazamento" falado como "basamento") e palavras engolidas.
Nomes próprios (inicial maiúscula fora do começo da frase) e palavras curtas são ignorados: o ASR erra nomes.
Uso: voice_qa.py <jobs.json>   jobs = [{"id":..., "wav":..., "text":...}]  → JSON por id."""
import difflib, json, re, sys, unicodedata, wave
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

NUM = {"2": "dois", "3": "três", "4": "quatro", "5": "cinco", "6": "seis", "7": "sete", "10": "dez", "19": "dezenove", "30": "trinta", "212": "duzentos e doze"}
EQ = {"esta": "ta", "para": "pra", "estao": "tao"}

def norm(w: str) -> str:
    w = unicodedata.normalize("NFKD", w.lower())
    w = "".join(c for c in w if not unicodedata.combining(c))
    w = re.sub(r"[^a-z0-9]", "", w)
    return EQ.get(w, w)

NAMES = set()
try:
    NAMES = {norm(n) for n in json.load(open(Path(__file__).resolve().parent.parent / "memory" / "nomes-proprios.json"))["nomes"]}
except Exception:  # noqa: BLE001
    pass

def ref_words(text: str):
    out = []
    text = text.replace("-", " ")  # "tubarão-branco" = duas palavras
    for sent in re.split(r"(?<=[.!?…])\s+", text):
        toks = sent.split()
        for i, t in enumerate(toks):
            core = re.sub(r"^[^\wÀ-ú]+|[^\wÀ-ú]+$", "", t)
            if not core or len(norm(core)) < 4 or re.search(r"\d", core):
                continue
            if (i > 0 and core[0].isupper()) or norm(core) in NAMES:  # nome próprio
                continue
            out.append(norm(core))
    return out

def main():
    jobs = json.load(open(sys.argv[1]))
    m = WhisperModel("small", device="cpu", compute_type="int8", download_root=str(Path(__file__).parent / "models" / "whisper"))
    res = {}
    for j in jobs:
        with wave.open(j["wav"], "rb") as w:
            sr, ch = w.getframerate(), w.getnchannels()
            x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        x = x.reshape(-1, ch).mean(axis=1)
        if sr != 16000:
            x = np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x).astype(np.float32)
        segs, _ = m.transcribe(x, language="pt", without_timestamps=True, beam_size=5)
        hyp_text = " ".join(s.text for s in segs)
        hyp = [norm(t) for t in re.sub(r"\d+", lambda mm: NUM.get(mm.group(0), mm.group(0)), hyp_text.replace("-", " ")).split()]
        missing = []
        for r in ref_words(j["text"]):
            best = max((difflib.SequenceMatcher(None, r, h).ratio() for h in hyp), default=0)
            if best < 0.8:
                missing.append(r)
        res[j["id"]] = {"ok": not missing, "missing": missing, "heard": hyp_text.strip()}
    print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
