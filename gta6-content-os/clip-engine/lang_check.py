#!/usr/bin/env python3
"""QA de idioma da narração: detecta o idioma falado em cada arquivo de voz (Whisper).
Uso: lang_check.py <wav> [<wav> ...]  → JSON com idioma e probabilidade por arquivo."""
import json, sys, wave
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

m = WhisperModel("small", device="cpu", compute_type="int8", download_root=str(Path(__file__).parent / "models" / "whisper"))
out = {}
for f in sys.argv[1:]:
    with wave.open(f, "rb") as w:
        sr, ch = w.getframerate(), w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    x = x.reshape(-1, ch).mean(axis=1)
    if sr != 16000:
        x = np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x).astype(np.float32)
    _, info = m.transcribe(x, language=None, without_timestamps=True)
    probs = dict(info.all_language_probs or [])
    out[f] = {"lang": info.language, "pt": round(probs.get("pt", 0.0), 3), "es": round(probs.get("es", 0.0), 3)}
print(json.dumps(out))
