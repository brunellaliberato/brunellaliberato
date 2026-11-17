#!/usr/bin/env python3
"""QA de voz (Gate 3): transcreve o áudio final e compara com o texto do roteiro (WER por palavra).
Uso: asr_check.py <audio.wav> <texto_esperado.txt> [--lang pt]"""
import json, re, sys, unicodedata, wave
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

NUM = {"0":"zero","2":"dois","3":"três","5":"cinco","6":"seis","9":"nove","10":"dez","12":"doze","19":"dezenove","30":"trinta","212":"duzentos e doze"}

def norm(s: str) -> list[str]:
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\d+", lambda m: NUM.get(m.group(0), m.group(0)), s)
    EQ = {"esta": "ta", "para": "pra", "estao": "tao"}
    return [EQ.get(w, w) for w in re.findall(r"[a-z0-9]+", s)]

def wer(ref, hyp):
    d = np.zeros((len(ref) + 1, len(hyp) + 1), dtype=int); d[:, 0] = range(len(ref) + 1); d[0, :] = range(len(hyp) + 1)
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            d[i, j] = min(d[i-1, j] + 1, d[i, j-1] + 1, d[i-1, j-1] + (ref[i-1] != hyp[j-1]))
    return d[-1, -1] / max(1, len(ref))

audio, expected = sys.argv[1], Path(sys.argv[2]).read_text()
with wave.open(audio, "rb") as w:
    sr, ch = w.getframerate(), w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
x = x.reshape(-1, ch).mean(axis=1)
if sr != 16000:
    x = np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x).astype(np.float32)
m = WhisperModel("small", device="cpu", compute_type="int8", download_root=str(Path(__file__).parent / "models" / "whisper"))
segs, _ = m.transcribe(x, language="pt", vad_filter=True)
hyp = " ".join(s.text.strip() for s in segs)
r, h = norm(expected), norm(hyp)
print(json.dumps({"wer": round(wer(r, h), 3), "ref_words": len(r), "transcricao": hyp}, ensure_ascii=False, indent=1))
