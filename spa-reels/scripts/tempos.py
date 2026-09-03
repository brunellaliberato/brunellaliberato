"""Marca o tempo de cada palavra da narração (Whisper) para sincronizar as legendas.
Uso: OPENAI_API_KEY=... python3 scripts/tempos.py  -> src/data/palavras.json
"""
import json, os, subprocess, uuid, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
roteiro = json.loads((ROOT / "src/data/roteiro.json").read_text())

def transcribe(path):
    boundary = uuid.uuid4().hex
    parts = []
    def field(name, value):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    field("model", "whisper-1"); field("language", "pt")
    field("response_format", "verbose_json"); field("timestamp_granularities[]", "word")
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode())
    parts.append(Path(path).read_bytes()); parts.append(f'\r\n--{boundary}--\r\n'.encode())
    req = urllib.request.Request("https://api.openai.com/v1/audio/transcriptions", data=b"".join(parts),
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}", "Content-Type": f"multipart/form-data; boundary={boundary}"})
    return json.loads(urllib.request.urlopen(req, timeout=120).read())["words"]

out = {}
for seg in roteiro["segmentos"]:
    words = transcribe(ROOT / "public/audio" / f"{seg['id']}.wav")
    out[seg["id"]] = [{"w": w["word"], "s": round(w["start"], 3), "e": round(w["end"], 3)} for w in words]
    print(seg["id"], len(out[seg["id"]]), "palavras ditas /", sum(len(l.replace("**", "").split()) for l in seg["legendas"]), "na legenda")
(ROOT / "src/data/palavras.json").write_text(json.dumps(out, ensure_ascii=False))
