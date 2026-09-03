"""Gera a narração provisória (OpenAI TTS), um arquivo por segmento do roteiro.

Uso: OPENAI_API_KEY=... python3 scripts/tts.py
Saída: public/audio/<id>.mp3 e src/data/duracoes.json (segundos de cada trecho).
Para trocar por voz humana: grave um arquivo por segmento com o mesmo nome e rode só a parte de duração.
"""
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
roteiro = json.loads((ROOT / "src/data/roteiro.json").read_text())
raw = ROOT / "audio-src"  # TTS bruto (ou gravação humana com o mesmo nome)
out = ROOT / "public/audio"  # versão tratada usada no vídeo
raw.mkdir(parents=True, exist_ok=True)
out.mkdir(parents=True, exist_ok=True)
TEMPO = float(os.environ.get("TTS_TEMPO", "1.1"))

VOICE = os.environ.get("TTS_VOICE", "coral")
INSTRUCOES = (
    "Fale em português do Brasil, com sotaque brasileiro neutro. "
    "Tom de narradora de documentário curto para Instagram: curiosa, calorosa, animada sem exagero. "
    "Ritmo ágil, frases bem marcadas, pequenas pausas nas vírgulas."
)
only_durations = "--duracoes" in sys.argv


def tts(text, dest):
    body = json.dumps({
        "model": "gpt-4o-mini-tts",
        "voice": VOICE,
        "input": text,
        "instructions": INSTRUCOES,
        "response_format": "mp3",
    }).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=body,
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}", "Content-Type": "application/json"},
    )
    dest.write_bytes(urllib.request.urlopen(req, timeout=120).read())


def duration(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


duracoes = {}
for seg in roteiro["segmentos"]:
    src = raw / f"{seg['id']}.mp3"
    if not only_durations and not src.exists():
        print("gerando", seg["id"])
        tts(seg["fala"], src)
    p = out / f"{seg['id']}.wav"
    # tira silêncio do começo/fim, encurta pausas longas, acelera um pouco
    filtro = (
        "silenceremove=start_periods=1:start_threshold=-45dB,"
        "silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-45dB:stop_silence=0.18,"
        f"atempo={TEMPO},apad=pad_dur=0.12"
    )
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-af", filtro,
                    "-ar", "48000", "-ac", "1", str(p)], check=True)
    duracoes[seg["id"]] = round(duration(p), 3)

(ROOT / "src/data/duracoes.json").write_text(json.dumps(duracoes, indent=2))
print(duracoes, "total", round(sum(duracoes.values()), 1))
