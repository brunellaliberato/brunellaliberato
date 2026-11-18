#!/usr/bin/env python3
"""
Narração com a voz Thalita (pt-BR-ThalitaMultilingualNeural, Microsoft) — escolhida pela Brunella em 17/11/2026.

Provedores (mesma voz):
  azure  OFICIAL, plano gratuito F0 (500 mil caracteres/mês). Requer AZURE_SPEECH_KEY e AZURE_SPEECH_REGION.
         Uso em conteúdo publicado: liberado.
  edge   Serviço de leitura em voz alta do navegador Edge. NÃO licenciado para produção.
         Só para PRÉVIA interna — o Gate 4 bloqueia publicação de vídeo com essa voz.

Uso: tts.py --provider azure|edge --text-file in.txt --out out.wav [--rate +6%]
Saída: WAV mono 24 kHz. Com edge, também grava <out>.words.json com o tempo de cada palavra.
"""
import argparse
import asyncio
import json
import os
import ssl
import subprocess
import sys
import urllib.request
from xml.sax.saxutils import escape

VOICE = "pt-BR-ThalitaMultilingualNeural"
LANG = "pt-BR"
# REGRA (18/11/2026): a Thalita é "Multilingual" e adivinha o idioma frase a frase. Sem declarar o idioma,
# ela já falou "basamento" (sotaque espanhol) em "nada de vazamento". Todo pedido declara pt-BR e envolve
# o texto em <lang xml:lang="pt-BR">, o que trava a pronúncia em português.


def ca_context() -> ssl.SSLContext:
    """Usa o pacote de certificados do ambiente (proxy) quando definido; senão, o padrão do sistema."""
    ca = os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
    return ssl.create_default_context(cafile=ca) if ca else ssl.create_default_context()


def azure(text: str, out: str, rate: str) -> None:
    key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
    if not key or not region:
        sys.exit("AZURE_SPEECH_KEY/AZURE_SPEECH_REGION não configurados")
    ssml = (
        f'<speak version="1.0" xml:lang="pt-BR" xmlns="http://www.w3.org/2001/10/synthesis">'
        f'<voice name="{VOICE}"><lang xml:lang="{LANG}"><prosody rate="{rate}">{escape(text)}</prosody></lang></voice></speak>'
    )
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"),
        headers={
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
            "User-Agent": "gta6-content-os",
        },
    )
    with urllib.request.urlopen(req, context=ca_context(), timeout=60) as r, open(out, "wb") as f:
        f.write(r.read())


async def edge(text: str, out: str, rate: str) -> None:
    import edge_tts
    import edge_tts.communicate as comm

    comm._SSL_CTX = ca_context()  # o pacote fixa o certifi; aqui usamos o CA do ambiente

    def mkssml_ptbr(tc, escaped_text):  # o pacote declara en-US e não trava idioma: substituímos
        if isinstance(escaped_text, bytes):
            escaped_text = escaped_text.decode("utf-8")
        return (
            f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{LANG}'>"
            f"<voice name='{tc.voice}'>"
            f"<prosody pitch='{tc.pitch}' rate='{tc.rate}' volume='{tc.volume}'>{escaped_text}</prosody>"
            "</voice></speak>"
        )

    comm.mkssml = mkssml_ptbr
    c = edge_tts.Communicate(text, VOICE, rate=rate, boundary="WordBoundary")
    mp3 = out + ".mp3"
    words = []
    with open(mp3, "wb") as f:
        async for chunk in c.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"w": chunk["text"], "s": chunk["offset"] / 1e7, "e": (chunk["offset"] + chunk["duration"]) / 1e7})
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", mp3, "-ac", "1", "-ar", "24000", out], check=True)
    os.remove(mp3)
    with open(out + ".words.json", "w") as f:
        json.dump(words, f, ensure_ascii=False)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--provider", choices=["azure", "edge"], required=True)
    ap.add_argument("--text-file", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--rate", default="+6%")
    a = ap.parse_args()
    text = open(a.text_file, encoding="utf-8").read().strip()
    # falhas de rede intermitentes: até 4 tentativas com espera crescente
    import time
    for attempt in range(4):
        try:
            if a.provider == "azure":
                azure(text, a.out, a.rate)
            else:
                asyncio.run(edge(text, a.out, a.rate))
            return
        except Exception as e:  # noqa: BLE001
            if attempt == 3:
                raise
            print(f"tentativa {attempt + 1} falhou ({type(e).__name__}: {str(e)[:120]}); tentando de novo", file=sys.stderr)
            time.sleep(2 * (attempt + 1))


if __name__ == "__main__":
    main()
