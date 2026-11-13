"""Transcreve a narração (faster-whisper, tempo por palavra) e divide entre os trechos do roteiro.
Uso: alinha.py narracao.wav roteiro.json pasta_saida
Saída: inicios.json, duracoes.json, palavras.json (formato da Parte 2)."""
import sys, json, re, difflib, unicodedata
from pathlib import Path
from faster_whisper import WhisperModel
wav, rot, out = sys.argv[1], json.load(open(sys.argv[2])), Path(sys.argv[3])
norm = lambda x: re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", x.lower()))
m = WhisperModel("small", device="cpu", compute_type="int8")
import subprocess, numpy as np
pcm = subprocess.run(["ffmpeg","-v","error","-i",wav,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True,check=True).stdout
audio = np.frombuffer(pcm, np.float32)
segs, _ = m.transcribe(audio, language="pt", word_timestamps=True, initial_prompt=" ".join(s["fala"] for s in rot["segmentos"]))
ws = [w for s in segs for w in s.words if norm(w.word)]
print(" ".join(w.word.strip() for w in ws))
esp, dono = [], []
for k, s in enumerate(rot["segmentos"]):
    for t in s["fala"].split():
        if norm(t): esp.append(norm(t)); dono.append(k)
got = [norm(w.word) for w in ws]
seg_de = [None] * len(got)
for op, a1, a2, b1, b2 in difflib.SequenceMatcher(None, esp, got, autojunk=False).get_opcodes():
    for j in range(b1, b2):
        if op == "equal": seg_de[j] = dono[a1 + (j - b1)]
        elif a2 > a1: seg_de[j] = dono[min(a2 - 1, a1 + (j - b1))]
ult = 0
for j in range(len(seg_de)):
    seg_de[j] = ult if seg_de[j] is None or seg_de[j] < ult else seg_de[j]; ult = seg_de[j]
ids = [s["id"] for s in rot["segmentos"]]
ini, dur, pal = {}, {}, {}
for k, sid in enumerate(ids):
    mine = [w for w, d in zip(ws, seg_de) if d == k]
    if not mine: raise SystemExit(f"trecho sem palavras: {sid}")
    ini[sid] = round(max(0, mine[0].start - 0.05), 3)
for k, sid in enumerate(ids):
    fim = ini[ids[k + 1]] if k + 1 < len(ids) else max(w.end for w in ws) + 0.3
    dur[sid] = round(fim - ini[sid], 3)
    pal[sid] = [{"w": w.word.strip(), "s": round(w.start - ini[sid], 3), "e": round(w.end - ini[sid], 3)} for w, d in zip(ws, seg_de) if d == k]
for n, d in (("inicios", ini), ("duracoes", dur), ("palavras", pal)):
    (out / f"{n}.json").write_text(json.dumps(d, ensure_ascii=False, indent=1))
print(ini)
