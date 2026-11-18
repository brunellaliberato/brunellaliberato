import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { color, fonts, sealStyle, sticker, type Seal } from './brand';
import type { BeatBackground, CaptionChunk, Layout, ShortProps, TimelineBeat } from './types';

/* Vídeo longo 16:9 (1920x1080) — mesma identidade dos Shorts, composição horizontal. */

const PAD = 96;

const Bg: React.FC<{ bg: BeatBackground; frames: number; fade: boolean; dim?: number }> = ({ bg, frames, fade, dim = 0 }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, frames], [1.02, 1.1]);
  const o = fade ? interpolate(f, [0, 8], [0, 1], { extrapolateRight: 'clamp' }) : 1;
  return (
    <AbsoluteFill style={{ opacity: o, background: color.ink }}>
      <Img src={staticFile(bg.src)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: bg.position ?? '50% 50%', transform: `scale(${z})` }} />
      <AbsoluteFill style={{ background: `linear-gradient(0deg, ${color.ink}f0 0%, ${color.ink}55 30%, transparent 55%), linear-gradient(90deg, ${color.ink}aa 0%, transparent 45%)` }} />
      <AbsoluteFill style={{ background: color.skyPink, mixBlendMode: 'soft-light', opacity: 0.22 }} />
      {dim > 0 && <AbsoluteFill style={{ background: color.ink, opacity: dim }} />}
    </AbsoluteFill>
  );
};

const SealStamp: React.FC<{ seal: Seal }> = ({ seal }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 8, fps, config: { damping: 11, stiffness: 180 } });
  const st = sealStyle[seal];
  return (
    <div style={{ alignSelf: 'flex-start', transform: `rotate(-4deg) scale(${interpolate(s, [0, 1], [1.6, 1])})`, opacity: s > 0.01 ? 1 : 0, background: st.color, border: `6px solid ${color.ink}`, boxShadow: `6px 8px 0 ${color.ink}`, color: color.ink, padding: '8px 22px', borderRadius: 16, fontFamily: fonts.display, fontSize: 34, letterSpacing: 2 }}>
      ✓ {st.label}
    </div>
  );
};

const pulseAt = (f: number, fps: number) => interpolate(f, [0, 0.12 * fps, 0.4 * fps], [1, 1.04, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });

const Story: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <div style={{ fontFamily: fonts.display, fontSize: 92, lineHeight: 1.0, maxWidth: 1100, transform: `scale(${pulseAt(f, fps)}) rotate(-1.5deg)`, transformOrigin: 'left center', ...sticker(12, 12) }}>{text}</div>;
};

const Chapter: React.FC<{ num: string; name: string; sub?: string }> = ({ num, name, sub }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame: f, fps, config: { damping: 16, stiffness: 120 } });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, transform: `translateX(${(1 - e) * -120}px)` }}>
      <div style={{ fontFamily: fonts.neon, fontSize: 96, color: color.sun, lineHeight: 0.8, WebkitTextStroke: `6px ${color.ink}`, paintOrder: 'stroke fill' }}>capítulo {num}</div>
      <div style={{ fontFamily: fonts.display, fontSize: 150, lineHeight: 0.95, ...sticker(14, 16) }}>{name}</div>
      {sub && <div style={{ alignSelf: 'flex-start', fontFamily: fonts.display, fontSize: 44, color: color.ink, background: color.white, border: `6px solid ${color.ink}`, boxShadow: `6px 8px 0 ${color.ink}`, padding: '8px 22px', borderRadius: 14, transform: 'rotate(-1.5deg)' }}>{sub}</div>}
    </div>
  );
};

const Title: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, transform: `scale(${pulseAt(f, fps)})`, transformOrigin: 'left center' }}>
      <div style={{ fontFamily: fonts.display, fontSize: 140, lineHeight: 0.98, ...sticker(14, 16) }}>{text}</div>
      {sub && <div style={{ fontFamily: fonts.neon, fontSize: 86, color: color.hotPink, WebkitTextStroke: `6px ${color.ink}`, paintOrder: 'stroke fill' }}>{sub}</div>}
    </div>
  );
};

/* Mapa de conexões: nós (adesivos) e ligações que se desenham em sequência. */
type Node = { id: string; label: string; x: number; y: number };
// nós espaçados para que nenhuma legenda de ligação caia embaixo de um nome
const NODES: Node[] = [
  { id: 'lucia', label: 'LUCIA', x: 330, y: 300 },
  { id: 'jason', label: 'JASON', x: 330, y: 640 },
  { id: 'brian', label: 'BRIAN', x: 720, y: 820 },
  { id: 'boobie', label: 'BOOBIE', x: 1260, y: 250 },
  { id: 'drequan', label: "DRE'QUAN", x: 1640, y: 540 },
  { id: 'dimez', label: 'REAL DIMEZ', x: 1400, y: 820 },
  { id: 'raul', label: 'RAUL', x: 860, y: 420 },
];
const EDGES: { a: string; b: string; label: string; dx: number; dy: number }[] = [
  { a: 'lucia', b: 'jason', label: 'o casal', dx: 110, dy: 0 },
  { a: 'jason', b: 'brian', label: 'mora de graça', dx: -175, dy: 55 },
  { a: 'boobie', b: 'drequan', label: 'sócios na Only Raw', dx: 60, dy: -60 },
  { a: 'drequan', b: 'dimez', label: 'contratou', dx: 90, dy: 50 },
];

const MapView: React.FC<{ focus?: string; frames: number }> = ({ focus, frames }) => {
  const f = useCurrentFrame();
  const n = (id: string) => NODES.find((x) => x.id === id)!;
  const prog = (i: number) => {
    if (focus) return 1;
    const t0 = (i / EDGES.length) * frames * 0.7;
    return interpolate(f, [t0, t0 + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  };
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${color.panel}, ${color.ink})` }}>
      <div style={{ position: 'absolute', left: PAD, top: 90, fontFamily: fonts.neon, fontSize: 80, color: color.sun, WebkitTextStroke: `6px ${color.ink}`, paintOrder: 'stroke fill' }}>
        como todos se ligam
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        {EDGES.map((e, i) => {
          const A = n(e.a), B = n(e.b);
          const len = Math.hypot(B.x - A.x, B.y - A.y);
          return (
            <line key={i} opacity={focus ? 0.3 : 1} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={color.sun} strokeWidth={12} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - prog(i))} />
          );
        })}
      </svg>
      {EDGES.map((e, i) => {
        const A = n(e.a), B = n(e.b);
        return (
          <div key={'l' + i} style={{ position: 'absolute', left: (A.x + B.x) / 2 + e.dx, top: (A.y + B.y) / 2 + e.dy, transform: 'translate(-50%,-50%) rotate(-2deg)', opacity: prog(i) * (focus ? 0.3 : 1), fontFamily: fonts.body, fontWeight: 900, fontSize: 40, color: color.ink, background: color.sun, border: `5px solid ${color.ink}`, borderRadius: 12, padding: '4px 16px', whiteSpace: 'nowrap' }}>
            {e.label}
          </div>
        );
      })}
      {NODES.map((nd, i) => {
        const s = spring({ frame: f - i * 3, fps: 30, config: { damping: 14, stiffness: 160 } });
        const dimmed = focus && focus !== nd.id;
        return (
          <div key={nd.id} style={{ position: 'absolute', left: nd.x, top: nd.y, transform: `translate(-50%,-50%) scale(${s * (focus === nd.id ? 1.3 : 1)})`, opacity: dimmed ? 0.3 : 1, fontFamily: fonts.display, fontSize: 64, color: color.ink, background: nd.id === 'raul' ? color.hotPink : color.white, border: `8px solid ${color.ink}`, boxShadow: `8px 10px 0 ${color.ink}`, padding: '12px 30px', borderRadius: 20, whiteSpace: 'nowrap' }}>
            {nd.label}
          </div>
        );
      })}
      {focus === 'raul' && (
        <div style={{ position: 'absolute', left: n('raul').x + 190, top: n('raul').y - 40, transform: `translate(-50%,-50%) rotate(8deg) scale(${spring({ frame: f - 6, fps: 30, config: { damping: 10 } })})`, fontFamily: fonts.display, fontSize: 200, ...sticker(14, 14), color: color.sun }}>?</div>
      )}
    </AbsoluteFill>
  );
};

const Captions: React.FC<{ chunks: CaptionChunk[] }> = ({ chunks }) => {
  const f = useCurrentFrame();
  const c = chunks.find((c) => f >= c.from && f < c.to);
  if (!c) return null;
  const pop = interpolate(f - c.from, [0, 4], [0.9, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 70, display: 'flex', justifyContent: 'center' }}>
      <div style={{ transform: `scale(${pop})`, fontFamily: fonts.display, fontSize: 54, textAlign: 'center', ...sticker(10, 7), color: c.emphasis ? color.sun : color.white }}>{c.text}</div>
    </div>
  );
};

const ChapterBar: React.FC<{ beats: TimelineBeat[]; total: number }> = ({ beats, total }) => {
  const f = useCurrentFrame();
  const starts = beats.filter((b) => b.layout.kind === 'chapter').map((b) => b.from);
  return (
    <div style={{ position: 'absolute', top: 40, left: PAD, right: PAD, height: 10, borderRadius: 5, background: `${color.ink}88`, border: `2px solid ${color.ink}` }}>
      <div style={{ width: `${(f / total) * 100}%`, height: '100%', background: color.white, borderRadius: 5 }} />
      {starts.map((s) => (
        <div key={s} style={{ position: 'absolute', left: `${(s / total) * 100}%`, top: -6, width: 6, height: 22, background: color.sun, borderRadius: 3 }} />
      ))}
    </div>
  );
};

const BeatView: React.FC<{ beat: TimelineBeat }> = ({ beat }) => {
  const l = beat.layout as Layout & Record<string, unknown>;
  const isMap = l.kind === 'map';
  return (
    <AbsoluteFill>
      {beat.bg && !isMap && <Bg bg={beat.bg} frames={beat.durationInFrames} fade={beat.from > 0} dim={l.kind === 'chapter' ? 0.1 : 0} />}
      {isMap && <MapView focus={l.focus as string | undefined} frames={beat.durationInFrames} />}
      {!isMap && (
        <div style={{ position: 'absolute', left: PAD, right: PAD, top: 110, bottom: 220, display: 'flex', flexDirection: 'column', justifyContent: l.kind === 'chapter' || l.kind === 'title' ? 'center' : 'flex-end', gap: 28 }}>
          {l.kind === 'story' && <Story text={l.text as string} />}
          {l.kind === 'chapter' && <Chapter num={l.num as string} name={l.name as string} sub={l.sub as string | undefined} />}
          {l.kind === 'title' && <Title text={l.text as string} sub={l.sub as string | undefined} />}
          {beat.seal && <SealStamp seal={beat.seal} />}
        </div>
      )}
      {(beat.sourceLabel || beat.bg) && (
        <div style={{ position: 'absolute', right: PAD, top: 70, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {beat.sourceLabel && <div style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 20, color: color.white, background: `${color.ink}cc`, padding: '4px 10px', borderRadius: 6 }}>FONTE: {beat.sourceLabel}</div>}
          {beat.bg && !isMap && <div style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 18, color: color.white, background: `${color.ink}cc`, padding: '4px 10px', borderRadius: 6 }}>{beat.bg.credit}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const LongVideo: React.FC<ShortProps> = (p) => {
  const all = p.beats.flatMap((b) => b.captions);
  return (
    <AbsoluteFill style={{ background: color.ink, fontFamily: fonts.body }}>
      {p.beats.map((b, i) => (
        <Sequence key={i} from={b.from} durationInFrames={b.durationInFrames}>
          <BeatView beat={b} />
        </Sequence>
      ))}
      <ChapterBar beats={p.beats} total={p.durationInFrames} />
      <Captions chunks={all} />
      {p.voiceSrc && <Audio src={staticFile(p.voiceSrc)} />}
      {p.bedSrc && <Audio src={staticFile(p.bedSrc)} volume={0.14} />}
    </AbsoluteFill>
  );
};
