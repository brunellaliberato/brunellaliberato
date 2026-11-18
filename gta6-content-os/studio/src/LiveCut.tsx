import React from 'react';
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { color, fonts, sticker } from './brand';

/**
 * Corte de live 9:16: streamer EM CIMA, jogo EMBAIXO (formato que funciona para cortes).
 * O que é nosso (não é "chapado"): gancho em adesivo com impacto, zoom de soco nos picos de áudio (whoosh),
 * legenda palavra a palavra com pop, flash + obturador na entrada, emoji de reação, cartão final com ding.
 * Efeitos sonoros: sintetizados por nós (clip-engine/sfx.py) — sem amostra de terceiros.
 */
export interface Rect { x: number; y: number; w: number; h: number }
export interface LiveCutProps {
  src: string; // trecho já cortado em studio/public (com áudio original da live)
  srcW: number;
  srcH: number;
  cam: Rect | null; // facecam em pixels da fonte; null = sem câmera (só jogo)
  game: Rect; // região do jogo
  fps: number;
  durationInFrames: number;
  hook: string; // texto do gancho (2 linhas no máx.)
  streamer: string; // @ do criador — crédito sempre na tela
  credit: string; // ex.: "CORTE AUTORIZADO · LIVE DE 18/11"
  channel: string;
  captions: { text: string; from: number; to: number; emphasis?: boolean }[];
  punches: number[]; // frames de pico (zoom + whoosh)
  reactions: { frame: number; emoji: string }[];
  [key: string]: unknown;
}

const W = 1080;
const TOP_H = 760;
const BOT_H = 1920 - TOP_H;

/** Mostra só o retângulo `r` da fonte, cobrindo uma caixa boxW×boxH (como object-fit: cover). */
const Crop: React.FC<{ p: LiveCutProps; r: Rect; boxW: number; boxH: number; muted: boolean; zoom: number }> = ({ p, r, boxW, boxH, muted, zoom }) => {
  const s = Math.max(boxW / r.w, boxH / r.h) * zoom;
  const left = -(r.x + r.w / 2) * s + boxW / 2;
  const top = -(r.y + r.h / 2) * s + boxH / 2;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <OffthreadVideo src={staticFile(p.src)} muted={muted} style={{ position: 'absolute', left, top, width: p.srcW * s, height: p.srcH * s, maxWidth: 'none' }} />
    </div>
  );
};

function punchZoom(frame: number, fps: number, punches: number[]): number {
  let z = 1;
  for (const f of punches) {
    if (frame < f || frame > f + fps) continue;
    const s = spring({ frame: frame - f, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
    z = Math.max(z, 1 + 0.14 * (1 - s) + 0.06 * Math.sin(Math.min(1, s) * Math.PI));
  }
  return z;
}

export const LiveCut: React.FC<LiveCutProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const zoom = punchZoom(frame, fps, p.punches);
  const shake = p.punches.some((f) => frame >= f && frame < f + 5) ? Math.sin(frame * 3.1) * 6 : 0;
  const flash = interpolate(frame, [0, 4], [0.9, 0], { extrapolateRight: 'clamp' });
  const hookIn = spring({ frame, fps, config: { damping: 11, stiffness: 180 } });
  const hookOut = interpolate(frame, [fps * 3, fps * 3 + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cap = p.captions.find((c) => frame >= c.from && frame < c.to);
  const capPop = cap ? spring({ frame: frame - cap.from, fps, config: { damping: 10, stiffness: 260, mass: 0.5 } }) : 0;
  const endStart = durationInFrames - Math.round(fps * 1.6);
  const endIn = spring({ frame: frame - endStart, fps, config: { damping: 12 } });
  const camRect = p.cam ?? p.game;

  return (
    <AbsoluteFill style={{ background: color.ink }}>
      {/* CIMA: streamer (soco de zoom nos picos) */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: TOP_H, overflow: 'hidden', transform: `translateX(${shake}px)` }}>
        <Crop p={p} r={camRect} boxW={W} boxH={TOP_H} muted={false} zoom={zoom} />
        <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 -60px 80px -40px ${color.ink}` }} />
      </div>
      {/* BAIXO: jogo */}
      <div style={{ position: 'absolute', left: 0, top: TOP_H, width: W, height: BOT_H, overflow: 'hidden' }}>
        <Crop p={p} r={p.game} boxW={W} boxH={BOT_H} muted zoom={1 + (zoom - 1) * 0.3} />
      </div>
      {/* faixa divisória na cor da marca */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: TOP_H - 5, height: 10, background: `linear-gradient(90deg, ${color.hotPink}, ${color.sun}, ${color.aqua})` }} />

      {/* topo: canal + crédito do streamer (sempre visível) */}
      <div style={{ position: 'absolute', top: 40, left: 40, right: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: fonts.display, fontSize: 30, ...sticker(6, 4) }}>★ {p.channel}</div>
        <div style={{ fontFamily: fonts.body, fontWeight: 800, fontSize: 28, color: color.white, background: `${color.ink}cc`, padding: '6px 14px', borderRadius: 10 }}>🎮 {p.streamer}</div>
      </div>

      {/* gancho (0–3 s) */}
      {hookOut > 0 && (
        <div style={{ position: 'absolute', left: 50, right: 50, top: 150, textAlign: 'center', transform: `scale(${0.6 + 0.4 * hookIn}) rotate(-2deg)`, opacity: hookOut }}>
          <span style={{ fontFamily: fonts.display, fontSize: 74, lineHeight: 1.05, background: color.sun, color: color.ink, padding: '8px 22px', borderRadius: 18, border: `7px solid ${color.ink}`, boxShadow: `8px 10px 0 ${color.ink}`, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{p.hook}</span>
        </div>
      )}

      {/* legenda na linha de divisão */}
      {cap && (
        <div style={{ position: 'absolute', left: 40, right: 40, top: TOP_H - 70, textAlign: 'center', transform: `scale(${0.7 + 0.3 * capPop})` }}>
          <span style={{ fontFamily: fonts.display, fontSize: cap.emphasis ? 92 : 80, lineHeight: 1, ...sticker(12, 8), color: cap.emphasis ? color.sun : color.white }}>{cap.text}</span>
        </div>
      )}

      {/* emojis de reação */}
      {p.reactions.map((r, i) => {
        const t = frame - r.frame;
        if (t < 0 || t > fps * 1.2) return null;
        const s = spring({ frame: t, fps, config: { damping: 8, stiffness: 200 } });
        return (
          <div key={i} style={{ position: 'absolute', right: 70, top: TOP_H - 300 - t * 2, fontSize: 130, transform: `scale(${s}) rotate(${8 - 16 * (i % 2)}deg)`, opacity: interpolate(t, [fps * 0.9, fps * 1.2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{r.emoji}</div>
        );
      })}

      {/* crédito da fonte */}
      <div style={{ position: 'absolute', left: 40, bottom: 330, fontFamily: fonts.mono, fontSize: 22, color: '#ffffffd0', background: `${color.ink}aa`, padding: '4px 10px', borderRadius: 6 }}>{p.credit}</div>

      {/* cartão final */}
      {frame >= endStart && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: TOP_H + 260, textAlign: 'center', transform: `translateY(${(1 - endIn) * 200}px)` }}>
          <span style={{ fontFamily: fonts.display, fontSize: 64, background: color.hotPink, color: color.white, padding: '10px 28px', borderRadius: 20, border: `6px solid ${color.ink}`, boxShadow: `6px 8px 0 ${color.ink}` }}>SEGUE PRA MAIS CORTES</span>
        </div>
      )}

      <AbsoluteFill style={{ background: 'white', opacity: flash, pointerEvents: 'none' }} />

      {/* efeitos sonoros */}
      <Sequence from={0}><Audio src={staticFile('sfx/shutter.wav')} volume={0.5} /></Sequence>
      <Sequence from={2}><Audio src={staticFile('sfx/impact.wav')} volume={0.55} /></Sequence>
      {p.punches.map((f) => (
        <Sequence key={`w${f}`} from={Math.max(0, f - 6)}><Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} /></Sequence>
      ))}
      {p.reactions.map((r) => (
        <Sequence key={`p${r.frame}`} from={r.frame}><Audio src={staticFile('sfx/pop.wav')} volume={0.5} /></Sequence>
      ))}
      <Sequence from={endStart}><Audio src={staticFile('sfx/ding.wav')} volume={0.45} /></Sequence>
    </AbsoluteFill>
  );
};
