"""Marca o tempo de cada palavra da narração (transcrição local do VoiceStudio) para sincronizar a legenda.

Uso: python3 scripts/tempos.py  -> src/data/palavras.json  (VoiceStudio precisa estar aberto)
"""
import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VS = os.environ.get("VOICESTUDIO_URL", "http://127.0.0.1:3900")
roteiro = json.loads((ROOT / "src/data/roteiro.json").read_text())


def transcreve(path):
    b = "----vs" + os.urandom(8).hex()
    campos = {"language": "pt", "response_format": "verbose_json", "timestamp_granularities[]": "word"}
    corpo = b"".join(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in campos.items())
    corpo += f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode()
    corpo += Path(path).read_bytes() + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request(VS + "/v1/audio/transcriptions", data=corpo,
                                 headers={"Content-Type": f"multipart/form-data; boundary={b}"})
    return json.loads(urllib.request.urlopen(req, timeout=600).read())


saida = {}
for seg in roteiro["segmentos"]:
    d = transcreve(ROOT / "public/audio" / f"{seg['id']}.wav")
    saida[seg["id"]] = [{"w": w["word"], "s": round(w["start"], 3), "e": round(w["end"], 3)} for w in d.get("words", [])]
    print(seg["id"], "->", d.get("text"))
(ROOT / "src/data/palavras.json").write_text(json.dumps(saida, ensure_ascii=False, indent=1))
