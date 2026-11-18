#!/usr/bin/env python3
"""Efeitos sonoros PRÓPRIOS, sintetizados aqui (sem amostra de terceiros → sem Content ID, uso livre).
Gera studio/public/sfx/*.wav: whoosh, pop, shutter, ding, impact (gancho no lugar do meme "faah").
Uso: sfx.py [pasta]"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def env(n, a=0.005, r=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a)
    if r:
        e *= np.exp(-t / r)
    return e


def lowpass(x, alpha):
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha[i] * (v - acc)
        y[i] = acc
    return y


def whoosh(d=0.45):
    n = int(SR * d)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    sweep = 0.02 + 0.5 * np.sin(np.pi * t) ** 2  # filtro abre e fecha
    x = lowpass(noise, sweep) - lowpass(noise, sweep * 0.15)
    return x * np.sin(np.pi * t) ** 1.5


def pop(d=0.12):
    n = int(SR * d)
    t = np.arange(n) / SR
    f = 900 * np.exp(-t / 0.02) + 300
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.03)


def shutter():
    def click(d, f):
        n = int(SR * d)
        return (rng.standard_normal(n) * 0.6 + np.sin(2 * np.pi * f * np.arange(n) / SR)) * env(n, 0.0005, 0.008)
    gap = np.zeros(int(SR * 0.06))
    return np.concatenate([click(0.04, 2400), gap, click(0.05, 1700)])


def ding(d=1.1):
    n = int(SR * d)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * t) for f, a in [(1318.5, 1), (2637, 0.35), (3955, 0.12)])
    return x * env(n, 0.002, 0.35)


def impact(d=0.9):
    """Gancho de atenção: grave descendente + estalo (substitui o meme 'faah', que é áudio de terceiros)."""
    n = int(SR * d)
    t = np.arange(n) / SR
    f = 120 * np.exp(-t / 0.25) + 38
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.3)
    crack = rng.standard_normal(n) * env(n, 0.0005, 0.02) * 0.5
    return np.tanh(2.2 * (boom + crack))


def save(path: Path, x: np.ndarray, peak=0.8):
    x = x / (np.abs(x).max() + 1e-9) * peak
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "studio/public/sfx")
    out.mkdir(parents=True, exist_ok=True)
    for name, fn, pk in [("whoosh", whoosh, 0.6), ("pop", pop, 0.7), ("shutter", shutter, 0.7), ("ding", ding, 0.55), ("impact", impact, 0.85)]:
        save(out / f"{name}.wav", fn(), pk)
        print(out / f"{name}.wav")
