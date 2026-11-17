import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { color, fonts, safe, sealStyle, type Seal } from './brand';
import type { CaptionChunk, Layout, ShortProps, TimelineBeat } from './types';

/* ---------- fundo: asfalto + grão + faixa de sinalização (assinatura do canal) ---------- */
const Background: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: color.bg, overflow: 'hidden' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.08 }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(f / 2) % 8} />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      {/* faixas tracejadas descendo devagar, como estrada vista de cima */}
      <div
        style={{
          position: 'absolute',
          left: 980,
          top: -200,
          width: 14,
          height: 2400,
          transform: `translateY(${(f * 3) % 160}px)`,
          backgroundImage: `repeating-linear-gradient(to bottom, ${color.signal}33 0 90px, transparent 90px 160px)`,
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 35%, #ffffff0a, transparent 60%)' }} />
    </AbsoluteFill>
  );
};

/* ---------- topo: marca + progresso por segmentos ---------- */
const TopBar: React.FC<{ beats: TimelineBeat[]; channel: string }> = ({ beats, channel }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', top: 110, left: safe.left, right: safe.left, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {beats.map((b, i) => {
          const p = interpolate(f, [b.from, b.from + b.durationInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: color.line, overflow: 'hidden' }}>
              <div style={{ width: `${p * 100}%`, height: '100%', background: color.signal }} />
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: color.text, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: color.signal, fontSize: 34 }}>★6</span> {channel}
      </div>
    </div>
  );
};

/* ---------- selo de status (carimbo) ---------- */
const SealStamp: React.FC<{ seal: Seal; delay?: number }> = ({ seal, delay = 8 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 11, stiffness: 180 } });
  const st = sealStyle[seal];
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        transform: `rotate(-5deg) scale(${interpolate(s, [0, 1], [1.7, 1])})`,
        opacity: s > 0.01 ? 1 : 0,
        border: `6px solid ${st.color}`,
        color: st.color,
        padding: '8px 22px',
        borderRadius: 10,
        fontFamily: fonts.mono,
        fontWeight: 700,
        fontSize: 40,
        letterSpacing: 6,
        background: `${st.color}14`,
      }}
    >
      ✓ {st.label}
    </div>
  );
};

/* ---------- layouts ---------- */
const enter = (f: number, fps: number, delay = 0) => spring({ frame: f - delay, fps, config: { damping: 18, stiffness: 140 } });

const BigNumber: React.FC<{ l: Extract<Layout, { kind: 'bigNumber' }> }> = ({ l }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Número factual NUNCA anima por valores intermediários: qualquer quadro pode virar capa.
  // O movimento vem da escala ("slam"), o valor é sempre o real.
  const v = l.value;
  // quadro 0 = composição final limpa; pulso de 0,4 s logo depois dá o impacto
  const slam = interpolate(f, [0, 0.12 * fps, 0.4 * fps], [1, 1.05, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const meterP = l.meter ? interpolate(f, [4, 4 + fps], [0, l.value / l.meter.max], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }) : 0;
  const danger = l.meter && meterP * l.meter.max >= l.meter.danger;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {l.label && <div style={{ fontFamily: fonts.mono, fontSize: 38, color: color.muted, letterSpacing: 3 }}>{l.label}</div>}
      <div style={{ fontFamily: fonts.display, color: color.text, lineHeight: 0.9, display: 'flex', alignItems: 'baseline', gap: 18 }}>
        {l.prefix && <span style={{ fontSize: 120, color: color.signal }}>{l.prefix}</span>}
        <span style={{ fontSize: 400, fontVariantNumeric: 'tabular-nums', display: 'inline-block', transform: `scale(${slam})`, transformOrigin: 'left center' }}>{v}</span>
        {l.suffix && <span style={{ fontSize: 170, color: color.signal }}>{l.suffix}</span>}
      </div>
      {l.meter && (
        <div style={{ width: 820, height: 54, borderRadius: 12, border: `4px solid ${color.line}`, padding: 6, background: color.bgRaised }}>
          <div style={{ height: '100%', width: `${meterP * 100}%`, borderRadius: 6, background: danger ? color.rumor : color.signal }} />
        </div>
      )}
    </div>
  );
};

const Quote: React.FC<{ l: Extract<Layout, { kind: 'quote' }> }> = ({ l }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = l.quote.split(' ');
  const shown = Math.floor(interpolate(f, [4, 4 + words.length * 3], [0, words.length], { extrapolateRight: 'clamp' }));
  const hl = (l.highlight ?? '').toLowerCase();
  const e = enter(f, fps);
  return (
    <div
      style={{
        transform: `translateY(${(1 - e) * 60}px)`,
        opacity: e,
        background: color.bgRaised,
        borderLeft: `14px solid ${color.signal}`,
        borderRadius: 18,
        padding: '56px 54px',
        width: 860,
        display: 'flex',
        flexDirection: 'column',
        gap: 30,
      }}
    >
      <div style={{ fontFamily: fonts.display, fontSize: 130, color: color.signal, lineHeight: 0.6 }}>“</div>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 64, lineHeight: 1.18, color: color.text }}>
        {words.map((w, i) => {
          const isHl = hl && hl.split(' ').some((h) => w.toLowerCase().replace(/[^\w]/g, '') === h.replace(/[^\w]/g, ''));
          return (
            <span key={i} style={{ opacity: i < shown ? 1 : 0.12, background: isHl && i < shown ? `${color.signal}` : 'transparent', color: isHl && i < shown ? color.bg : undefined, padding: isHl ? '0 6px' : 0, borderRadius: 6 }}>
              {w}{' '}
            </span>
          );
        })}
      </div>
      {l.translation && <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 40, color: color.muted }}>{l.translation}</div>}
    </div>
  );
};

const Tags: React.FC<{ l: Extract<Layout, { kind: 'tags' }> }> = ({ l }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = enter(f, fps);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      {l.counter && <div style={{ fontFamily: fonts.mono, fontSize: 44, color: color.signal, letterSpacing: 4 }}>{l.counter}</div>}
      <div style={{ fontFamily: fonts.display, fontSize: 250, lineHeight: 0.9, color: color.text, transform: `translateX(${(1 - e) * -80}px)`, opacity: e }}>{l.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {l.tags.map((t, i) => {
          const s = enter(f, fps, 10 + i * 5);
          return (
            <div key={t} style={{ alignSelf: 'flex-start', transform: `translateY(${(1 - s) * 40}px)`, opacity: s, fontFamily: fonts.body, fontWeight: 900, fontSize: 54, color: color.bg, background: color.text, padding: '14px 28px', borderRadius: 14 }}>
              {t}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DateCard: React.FC<{ l: Extract<Layout, { kind: 'date' }>; renderDateISO: string }> = ({ l, renderDateISO }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = enter(f, fps);
  const days = Math.round((Date.parse(l.date) - Date.parse(renderDateISO.slice(0, 10))) / 86_400_000);
  const [y, m, d] = l.date.split('-');
  void y;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 40, color: color.muted, letterSpacing: 3 }}>{l.label}</div>
      <div style={{ fontFamily: fonts.display, fontSize: 380, lineHeight: 0.9, color: color.text, transform: `scale(${interpolate(e, [0, 1], [0.85, 1])})`, transformOrigin: 'left center', opacity: e }}>
        {d}/{m}
      </div>
      {days > 0 && (
        <div style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 60, color: color.bg, background: color.signal, alignSelf: 'flex-start', padding: '10px 26px', borderRadius: 12 }}>
          FALTAM {days} {days === 1 ? 'DIA' : 'DIAS'}
        </div>
      )}
    </div>
  );
};

const Poll: React.FC<{ l: Extract<Layout, { kind: 'poll' }> }> = ({ l }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = (k: number) => 1 + 0.04 * Math.max(0, Math.sin((f / fps) * Math.PI * 1.5 + k * Math.PI));
  const side = (t: string, k: number, bg: string, fg: string) => {
    const e = enter(f, fps, k * 5);
    return (
      <div style={{ flex: 1, background: bg, color: fg, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.display, fontSize: 150, transform: `scale(${pulse(k) * e})`, height: 360, textAlign: 'center', lineHeight: 0.95 }}>
        {t}
      </div>
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: 860 }}>
      {l.question && <div style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 60, color: color.text }}>{l.question}</div>}
      {side(l.left, 0, color.text, color.bg)}
      <div style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 52, color: color.signal, textAlign: 'center' }}>OU</div>
      {side(l.right, 1, color.signal, color.bg)}
    </div>
  );
};

const Title: React.FC<{ l: Extract<Layout, { kind: 'title' }> }> = ({ l }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = enter(f, fps);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, opacity: e }}>
      <div style={{ fontFamily: fonts.display, fontSize: 200, lineHeight: 0.92, color: color.text }}>{l.text}</div>
      {l.sub && <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 52, color: color.signal }}>{l.sub}</div>}
    </div>
  );
};

/* ---------- legendas sincronizadas ---------- */
const Captions: React.FC<{ chunks: CaptionChunk[] }> = ({ chunks }) => {
  const f = useCurrentFrame();
  const c = chunks.find((c) => f >= c.from && f < c.to);
  if (!c) return null;
  const pop = interpolate(f - c.from, [0, 4], [0.92, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: safe.left, right: safe.right, bottom: safe.bottom + 10, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          transform: `scale(${pop})`,
          fontFamily: fonts.body,
          fontWeight: 900,
          fontSize: 62,
          lineHeight: 1.15,
          textAlign: 'center',
          color: c.emphasis ? color.signal : color.text,
          textShadow: '0 4px 0 #000, 0 0 24px #000c',
          WebkitTextStroke: '2px #000',
        }}
      >
        {c.text}
      </div>
    </div>
  );
};

const BeatView: React.FC<{ beat: TimelineBeat; renderDateISO: string }> = ({ beat, renderDateISO }) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [beat.durationInFrames - 5, beat.durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const l = beat.layout;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: safe.left, right: safe.right, top: 330, bottom: safe.bottom + 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 40, opacity: out }}>
        {l.kind === 'bigNumber' && <BigNumber l={l} />}
        {l.kind === 'quote' && <Quote l={l} />}
        {l.kind === 'tags' && <Tags l={l} />}
        {l.kind === 'date' && <DateCard l={l} renderDateISO={renderDateISO} />}
        {l.kind === 'poll' && <Poll l={l} />}
        {l.kind === 'title' && <Title l={l} />}
        {beat.seal && <SealStamp seal={beat.seal} />}
      </div>
      {beat.sourceLabel && (
        <div style={{ position: 'absolute', left: safe.left, right: safe.right, bottom: safe.bottom - 110, fontFamily: fonts.mono, fontSize: 28, color: color.muted, letterSpacing: 1 }}>
          FONTE: {beat.sourceLabel}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const ShortVideo: React.FC<ShortProps> = (p) => {
  const allCaptions = p.beats.flatMap((b) => b.captions);
  return (
    <AbsoluteFill style={{ fontFamily: fonts.body }}>
      <Background />
      {p.beats.map((b, i) => (
        <Sequence key={i} from={b.from} durationInFrames={b.durationInFrames}>
          <BeatView beat={b} renderDateISO={p.renderDateISO} />
        </Sequence>
      ))}
      <TopBar beats={p.beats} channel={p.channel} />
      <Captions chunks={allCaptions} />
      {p.voiceSrc && <Audio src={staticFile(p.voiceSrc)} />}
      {p.bedSrc && <Audio src={staticFile(p.bedSrc)} volume={0.16} />}
    </AbsoluteFill>
  );
};
