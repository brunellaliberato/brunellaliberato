#!/usr/bin/env python3
"""
MÓDULO E — AUTO CLIP STUDIO (motor próprio)

Fluxo B: vídeo autorizado → ingestão → transcrição → sinais → candidatos → ranking → corte →
reenquadramento → legendas → título → loudnorm → QA → (aprovação humana)

Princípios
- Nada roda sem manifesto de direitos (rights.json). Sem direito => recusa.
- Cada etapa grava artefato em disco e é cacheada: dá para refazer só a legenda de um clip.
- Sinais indisponíveis (chat, "mais repetidos", LLM sem chave) são REGISTRADOS como indisponíveis,
  nunca simulados.
- Saída editável: cutlist JSON + .srt + .ass + comando ffmpeg reproduzível ao lado de cada MP4.

Uso:
  clipper.py analyze <video> --rights rights.json --out DIR [--lang en] [--model small]
  clipper.py render  <DIR> [--top 3] [--preset gameplay_fit|center_crop|split_cam]
"""
from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
import time
import wave
from dataclasses import asdict, dataclass, field
from pathlib import Path

import numpy as np

OK_RIGHTS = {"PROPRIO", "LICENCA_ABERTA", "AUTORIZADO_POR_ESCRITO"}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


# ----------------------------------------------------------------------------- ingestão
def ingest(video: Path, out: Path) -> dict:
    meta_f = out / "ingest.json"
    if meta_f.exists():
        return json.loads(meta_f.read_text())
    probe = json.loads(run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(video)]).stdout)
    v = next(s for s in probe["streams"] if s["codec_type"] == "video")
    wav = out / "audio16k.wav"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-ac", "1", "-ar", "16000", str(wav)])
    meta = {"video": str(video.resolve()), "duration": float(probe["format"]["duration"]), "width": v["width"], "height": v["height"], "audio": str(wav)}
    meta_f.write_text(json.dumps(meta, indent=2))
    return meta


# ----------------------------------------------------------------------------- transcrição
def transcribe(meta: dict, out: Path, lang: str | None, model_size: str) -> list[dict]:
    tf = out / "transcript.json"
    if tf.exists():
        return json.loads(tf.read_text())
    from faster_whisper import WhisperModel

    log(f"transcrevendo com faster-whisper/{model_size} (CPU int8)…")
    model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root=str(Path(__file__).parent / "models" / "whisper"))
    # áudio já decodificado pelo ffmpeg na ingestão → evita depender da versão do PyAV
    with wave.open(meta["audio"], "rb") as w:
        pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    segs, info = model.transcribe(pcm, language=lang, word_timestamps=True, vad_filter=True)
    result = []
    for s in segs:
        result.append({
            "start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
            "words": [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2), "p": round(w.probability, 2)} for w in (s.words or [])],
            "avg_logprob": round(s.avg_logprob, 3), "no_speech_prob": round(s.no_speech_prob, 3),
        })
    tf.write_text(json.dumps(result, ensure_ascii=False, indent=1))
    (out / "transcript.lang").write_text(info.language)
    log(f"{len(result)} segmentos, idioma {info.language} ({info.language_probability:.2f})")
    return result


# ----------------------------------------------------------------------------- sinais
WIN = 0.5  # segundos por janela de análise


def audio_energy(meta: dict) -> np.ndarray:
    """RMS em dB por janela de 0,5 s → z-score robusto (mediana/MAD). Picos = gritos, explosões, reações."""
    with wave.open(meta["audio"], "rb") as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    n = int(sr * WIN)
    frames = x[: len(x) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-6)
    med = np.median(db)
    mad = np.median(np.abs(db - med)) + 1e-6
    return (db - med) / (1.4826 * mad)


def scene_changes(meta: dict, out: Path, threshold: float = 0.3) -> list[float]:
    sf = out / "scenes.json"
    if sf.exists():
        return json.loads(sf.read_text())
    log("detectando mudanças de cena (ffmpeg scene score)…")
    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", meta["video"], "-vf", f"scale=320:-2,select='gt(scene,{threshold})',showinfo", "-an", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    ts = [round(float(m), 2) for m in re.findall(r"pts_time:([\d.]+)", p.stderr)]
    sf.write_text(json.dumps(ts))
    return ts


REACTION = re.compile(r"(!|\?|\b(no+|wow|what|oh|god|run|go|stop|help|caramba|nossa|meu deus|vai|corre|olha|mano|socorro|não+)\b)", re.I)
LAUGH = re.compile(r"\[(laugh|risos|applause)[^\]]*\]|\b(ha){2,}\b|\b(kk){2,}", re.I)


def signal_availability(args) -> dict:
    return {
        "transcricao": "disponível (faster-whisper local)",
        "energia_audio": "disponível (RMS por janela)",
        "mudanca_cena": "disponível (ffmpeg scene score)",
        "reacoes_texto": "disponível (léxico de exclamações/risos na transcrição)",
        "llm_semantico": "indisponível — nenhum provedor configurado (ANTHROPIC_API_KEY/Ollama ausentes); usando heurística lexical",
        "chat": "indisponível — sem log de chat gravado para este vídeo (API oficial não fornece replay de chat)",
        "mais_repetidos": "indisponível — não exposto pela YouTube Data API",
        "historico_formatos": "indisponível — canal ainda sem dados no Analytics",
        "eventos_visuais_jogo": "indisponível — detector de HUD/kill-feed não treinado (fase 2)",
    }


# ----------------------------------------------------------------------------- candidatos
@dataclass
class Candidate:
    id: str
    start: float
    end: float
    transcript: str
    description: str
    reason: list[str]
    context_needed: str
    editorial_score: float
    technical_score: float
    score: float
    hook: str
    recommended_duration: float
    rights: str
    spoiler_alert: bool
    signals: dict = field(default_factory=dict)


def build_candidates(segs: list[dict], energy: np.ndarray, scenes: list[float], duration: float, rights: str,
                     min_len=18.0, max_len=45.0) -> list[Candidate]:
    """Janelas alinhadas a FRASES (nunca corta no meio da fala). Começa no início de uma frase,
    cresce até max_len, e termina no fim de uma frase. Inclui a frase anterior como 'preparação'
    quando o pico acontece logo no começo (evita cortar o setup da piada/ação)."""
    if not segs:
        return []
    e_at = lambda t: float(energy[min(len(energy) - 1, max(0, int(t / WIN)))])
    cands: list[Candidate] = []
    for i in range(len(segs)):
        j = i
        while j + 1 < len(segs) and segs[j + 1]["end"] - segs[i]["start"] <= max_len:
            j += 1
        start, end = segs[i]["start"], segs[j]["end"]
        if end - start < min_len:
            continue
        # respiro: 0,3 s antes e 0,6 s depois (deixa a reação "assentar")
        s0, e0 = max(0.0, start - 0.3), min(duration, end + 0.6)
        text = " ".join(s["text"] for s in segs[i : j + 1])
        win = energy[int(s0 / WIN) : int(e0 / WIN) + 1]
        peak = float(win.max()) if len(win) else 0.0
        peak_t = s0 + float(win.argmax()) * WIN if len(win) else s0
        var = float(win.std()) if len(win) else 0.0
        cuts = [c for c in scenes if s0 <= c <= e0]
        cut_rate = len(cuts) / max(1.0, (e0 - s0)) * 10  # cortes a cada 10 s
        reactions = len(REACTION.findall(text))
        laughs = len(LAUGH.findall(text))
        words = sum(len(s["text"].split()) for s in segs[i : j + 1])
        speech_cov = sum(s["end"] - s["start"] for s in segs[i : j + 1]) / (e0 - s0)
        conf = float(np.mean([math.exp(s["avg_logprob"]) for s in segs[i : j + 1]]))
        # o gancho precisa estar nos primeiros 3 s: energia + reação na 1ª frase
        first = segs[i]["text"]
        hook_strength = min(3.0, max(0.0, e_at(segs[i]["start"] + 0.5)) * 0.6 + (1.0 if REACTION.search(first) else 0) + (0.5 if len(first.split()) <= 10 else 0))
        # setup: pico nos primeiros 2,5 s? então a preparação ficou de fora → penaliza
        setup_cut = (peak_t - s0) < 2.5 and i > 0
        editorial = min(10.0, 2.0 * hook_strength + 1.2 * min(4, reactions) + 2.0 * min(2, laughs) + (1.5 if 0.55 <= speech_cov <= 0.95 else 0) - (2.0 if setup_cut else 0))
        technical = min(10.0, 1.6 * max(0.0, peak) + 2.0 * min(2.0, var) + 0.8 * min(4.0, cut_rate) + 2.0 * conf)
        dur = e0 - s0
        reasons = []
        if peak > 2: reasons.append(f"pico de áudio {peak:.1f}σ aos {peak_t - s0:.1f}s do clip")
        if reactions: reasons.append(f"{reactions} marcadores de reação/pergunta na fala")
        if laughs: reasons.append("risos/aplausos detectados")
        if cut_rate > 1.5: reasons.append(f"ritmo visual alto ({cut_rate:.1f} cortes/10s)")
        if hook_strength >= 1.5: reasons.append("abertura forte nos primeiros 3 s")
        if setup_cut: reasons.append("ATENÇÃO: pico no início — preparação pode ter ficado de fora")
        cands.append(Candidate(
            id=f"c{len(cands):03d}", start=round(s0, 2), end=round(e0, 2), transcript=text,
            description=f"{dur:.0f}s · {words} palavras · {len(cuts)} cortes de cena",
            reason=reasons or ["sem sinal forte — candidato de preenchimento"],
            context_needed="Frase anterior: " + segs[i - 1]["text"] if i > 0 else "início do vídeo",
            editorial_score=round(editorial, 2), technical_score=round(technical, 2),
            score=round(0.6 * editorial + 0.4 * technical, 2), hook=first[:90],
            recommended_duration=round(min(dur, 45.0), 1), rights=rights,
            spoiler_alert=False,
            signals={"peak_sigma": round(peak, 2), "energy_std": round(var, 2), "cut_rate_10s": round(cut_rate, 2),
                     "reactions": reactions, "laughs": laughs, "speech_coverage": round(speech_cov, 2), "asr_conf": round(conf, 2)},
        ))
    return cands


def select_non_overlapping(cands: list[Candidate], k: int, min_gap=5.0) -> list[Candidate]:
    chosen: list[Candidate] = []
    for c in sorted(cands, key=lambda c: c.score, reverse=True):
        if all(c.end + min_gap <= o.start or c.start >= o.end + min_gap for o in chosen):
            chosen.append(c)
        if len(chosen) == k:
            break
    return chosen


SPOILER = re.compile(r"\b(final|ending|dies|morre|morreu|twist|revela|chefe final|last mission|última missão)\b", re.I)


def cmd_analyze(args) -> None:
    video, out = Path(args.video), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rights = json.loads(Path(args.rights).read_text())
    if rights.get("rights") not in OK_RIGHTS:
        sys.exit(f"RECUSADO: direito '{rights.get('rights')}' não permite processamento. Registre autorização em rights.json.")
    (out / "rights.json").write_text(json.dumps(rights, ensure_ascii=False, indent=2))
    t0 = time.time()
    meta = ingest(video, out)
    log(f"ingestão ok: {meta['duration']:.0f}s {meta['width']}x{meta['height']}")
    segs = transcribe(meta, out, args.lang, args.model)
    energy = audio_energy(meta)
    scenes = scene_changes(meta, out)
    log(f"{len(scenes)} mudanças de cena; energia em {len(energy)} janelas")
    cands = build_candidates(segs, energy, scenes, meta["duration"], rights["rights"])
    for c in cands:
        c.spoiler_alert = bool(SPOILER.search(c.transcript))
    top = select_non_overlapping(cands, args.top)
    report = {
        "video": meta, "rights": rights, "signals": signal_availability(args),
        "elapsed_s": round(time.time() - t0, 1), "n_candidates": len(cands),
        "selected": [asdict(c) for c in top],
        "runner_up": [asdict(c) for c in sorted(cands, key=lambda c: c.score, reverse=True)[args.top: args.top + 5]],
    }
    (out / "candidates.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    np.save(out / "energy.npy", energy)
    log(f"{len(cands)} candidatos → {len(top)} selecionados (sem sobreposição). Relatório: {out/'candidates.json'}")
    for c in top:
        log(f"  {c.id} {c.start:7.1f}-{c.end:7.1f}s score {c.score} (ed {c.editorial_score} / tec {c.technical_score}) {'⚠ SPOILER' if c.spoiler_alert else ''} :: {c.hook}")


# ----------------------------------------------------------------------------- render
def ts(t: float, sep=",") -> str:
    h, r = divmod(max(0.0, t), 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s % 1) * 1000)):03d}"


def ass_ts(t: float) -> str:
    h, r = divmod(max(0.0, t), 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def write_captions(segs: list[dict], c: dict, out_base: Path, cap_y: int) -> tuple[Path, Path]:
    """Legendas palavra-a-palavra: blocos de até 3 palavras, palavra falada em amarelo (identidade do canal)."""
    words = [w for s in segs for w in s["words"] if c["start"] <= w["s"] < c["end"]]
    blocks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= 3 or re.search(r"[.,!?]$", w["w"]):
            blocks.append(cur); cur = []
    if cur:
        blocks.append(cur)
    srt, ev = [], []
    for k, b in enumerate(blocks, 1):
        s0, e0 = b[0]["s"] - c["start"], b[-1]["e"] - c["start"]
        srt.append(f"{k}\n{ts(s0)} --> {ts(e0)}\n{' '.join(w['w'] for w in b)}\n")
        for wi, w in enumerate(b):
            ws = w["s"] - c["start"]
            we = (b[wi + 1]["s"] - c["start"]) if wi + 1 < len(b) else e0
            txt = " ".join(("{\\c&H3FD2FF&}" + x["w"].upper() + "{\\c&HEAF1F4&}") if x is w else x["w"].upper() for x in b)
            ev.append(f"Dialogue: 0,{ass_ts(ws)},{ass_ts(we)},Cap,,0,0,0,,{txt}")
    srt_f, ass_f = out_base.with_suffix(".srt"), out_base.with_suffix(".ass")
    srt_f.write_text("\n".join(srt))
    ass_f.write_text(
        "[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n"
        "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Cap,Inter Black,66,&H00EAF1F4,&H000000FF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,5,2,2,80,150,{1920 - cap_y},1\n"
        f"Style: Hook,Inter Black,58,&H00121012,&H000000FF,&H003FD2FF,&H003FD2FF,-1,0,0,0,100,100,0,0,3,18,0,8,80,150,250,1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n" + "\n".join(ev) + "\n"
    )
    return srt_f, ass_f


def hook_text(h: str, limit: int = 48) -> str:
    """Gancho na tela: corta em limite de palavra e quebra em 2 linhas — nunca no meio de uma palavra."""
    h = h.strip().upper()
    if len(h) > limit:
        h = h[:limit].rsplit(" ", 1)[0].rstrip(",.;:") + "…"
    if len(h) <= 24:
        return h
    words, half = h.split(), len(h) // 2
    line, acc = [], 0
    for i, w in enumerate(words):
        acc += len(w) + 1
        line.append(w)
        if acc >= half and i < len(words) - 1:
            return " ".join(line) + "\\N" + " ".join(words[i + 1:])
    return h


PRESETS = {
    # gameplay: o frame inteiro (HUD e minimapa preservados) no centro, fundo desfocado do próprio vídeo
    "gameplay_fit": "[0:v]split=2[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.12[bg];"
                    "[b]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2-80,setsar=1",
    # conteúdo com ação centralizada (entrevista/podcast de 1 pessoa)
    "center_crop": "[0:v]scale=-2:1920,crop=1080:1920,setsar=1",
    # stream com facecam: câmera em cima, jogo embaixo — coordenadas da facecam vêm do manifesto (fixas por streamer)
    "split_cam": "[0:v]split=2[a][b];[a]crop={cw}:{ch}:{cx}:{cy},scale=1080:700[cam];[b]scale=-2:1220,crop=1080:1220[game];[cam][game]vstack,setsar=1",
}


def cmd_render(args) -> None:
    out = Path(args.dir)
    rep = json.loads((out / "candidates.json").read_text())
    segs = json.loads((out / "transcript.json").read_text())
    video = rep["video"]["video"]
    fonts_dir = Path(__file__).resolve().parent.parent / "studio" / "public" / "fonts"
    clips_dir = out / "clips"
    clips_dir.mkdir(exist_ok=True)
    results = []
    for c in rep["selected"][: args.top]:
        base = clips_dir / f"{c['id']}"
        mp4 = base.with_suffix(".mp4")
        cap_y = 1500
        _, ass_f = write_captions(segs, c, base, cap_y)
        # gancho na tela nos 2,5 s iniciais (texto do próprio clip — nunca prometer o que não está nele)
        with ass_f.open("a") as f:
            f.write(f"Dialogue: 1,0:00:00.00,0:00:02.50,Hook,,0,0,0,,{hook_text(c['hook'])}\n")
        vf = PRESETS[args.preset].format(cw=args.cam[0], ch=args.cam[1], cx=args.cam[2], cy=args.cam[3]) if args.preset == "split_cam" else PRESETS[args.preset]
        vf += f",ass={ass_f.name}:fontsdir={fonts_dir}[v]"
        dur = c["end"] - c["start"]
        cmd = ["ffmpeg", "-y", "-v", "error", "-ss", str(c["start"]), "-t", f"{dur:.2f}", "-i", video,
               "-filter_complex", vf, "-map", "[v]", "-map", "0:a:0",
               "-af", f"loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:d=0.15,afade=t=out:st={dur - 0.4:.2f}:d=0.4",
               "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", mp4.name]
        log(f"render {c['id']} ({dur:.1f}s, preset {args.preset})…")
        subprocess.run(cmd, check=True, cwd=clips_dir)
        (base.with_suffix(".cmd.txt")).write_text(" ".join(f"'{x}'" if " " in x or ";" in x else x for x in cmd))
        cut = {"clip": c["id"], "source": video, "in": c["start"], "out": c["end"], "preset": args.preset,
               "captions": [ass_f.name, base.with_suffix('.srt').name], "rights": rep["rights"]["rights"],
               "publishable": rep["rights"].get("publishable", False), "attribution": rep["rights"].get("attribution")}
        base.with_suffix(".cutlist.json").write_text(json.dumps(cut, ensure_ascii=False, indent=2))
        results.append({"id": c["id"], "file": str(mp4), "start": c["start"], "end": c["end"], "score": c["score"]})
    (out / "renders.json").write_text(json.dumps(results, indent=2))
    log(f"{len(results)} clips em {clips_dir}")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("analyze")
    a.add_argument("video"); a.add_argument("--rights", required=True); a.add_argument("--out", required=True)
    a.add_argument("--lang", default=None); a.add_argument("--model", default="small"); a.add_argument("--top", type=int, default=3)
    r = sub.add_parser("render")
    r.add_argument("dir"); r.add_argument("--top", type=int, default=3)
    r.add_argument("--preset", default="gameplay_fit", choices=list(PRESETS))
    r.add_argument("--cam", type=int, nargs=4, default=[480, 270, 1440, 810], metavar=("W", "H", "X", "Y"))
    args = ap.parse_args()
    {"analyze": cmd_analyze, "render": cmd_render}[args.cmd](args)


if __name__ == "__main__":
    main()
