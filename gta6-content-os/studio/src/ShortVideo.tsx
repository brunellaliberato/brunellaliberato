import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { color, fonts, safe, sealStyle, sticker, type Seal } from './brand';
import type { CaptionChunk, Layout, ShortProps, TimelineBeat } from './types';

/* =====================================================================================
 * CENÁRIO "PÔR DO SOL DE LEONIDA" — 100% desenhado pelo canal (SVG procedural)
 * ===================================================================================== */

const HORIZON = 1210;

/** Palmeira em silhueta: tronco curvo + folhas. Balança devagar (vento). */
const Palm: React.FC<{ x: number; base: number; h: number; lean: number; fill: string; phase: number }> = ({ x, base, h, lean, fill, phase }) => {
  const f = useCurrentFrame();
  const sway = Math.sin(f / 38 + phase) * 2.2;
  const topX = x + lean;
  const topY = base - h;
  const fronds = [-150, -115, -80, -45, -10, 25, 60, 200, 165];
  return (
    <g>
      <path d={`M ${x - 16} ${base} Q ${x + lean * 0.2} ${base - h * 0.55} ${topX - 7} ${topY} L ${topX + 7} ${topY} Q ${x + lean * 0.25 + 14} ${base - h * 0.5} ${x + 16} ${base} Z`} fill={fill} />
      <g transform={`rotate(${sway} ${topX} ${topY})`}>
        {fronds.map((a, i) => {
          const len = 190 + (i % 3) * 40;
          return (
            <path
              key={i}
              transform={`rotate(${a} ${topX} ${topY})`}
              d={`M ${topX} ${topY} q ${len * 0.45} -${len * 0.32} ${len} ${len * 0.18} q -${len * 0.5} -${len * 0.05} -${len} -${len * 0.12} Z`}
              fill={fill}
            />
          );
        })}
        <circle cx={topX} cy={topY + 6} r={16} fill={fill} />
      </g>
    </g>
  );
};

const Skyline: React.FC = () => {
  // prédios determinísticos (sem aleatório: o render precisa ser reproduzível)
  const blocks = Array.from({ length: 26 }, (_, i) => ({ w: 34 + ((i * 37) % 45), h: 70 + ((i * 53) % 210) + (i % 5 === 2 ? 120 : 0) }));
  let x = -20;
  return (
    <g fill={color.silhouetteFar} opacity={0.85}>
      {blocks.map((b, i) => {
        const r = <rect key={i} x={x} y={HORIZON - b.h} width={b.w} height={b.h} />;
        x += b.w + 6;
        return r;
      })}
    </g>
  );
};

const Background: React.FC = () => {
  const f = useCurrentFrame();
  const shimmer = (k: number) => Math.sin(f / 9 + k) * 18;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color.skyTop} />
            <stop offset="0.35" stopColor={color.skyMauve} />
            <stop offset="0.55" stopColor={color.skyPink} />
            <stop offset="0.66" stopColor={color.skyOrange} />
          </linearGradient>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color.skyPink} />
            <stop offset="0.35" stopColor={color.water} />
            <stop offset="1" stopColor={color.ink} />
          </linearGradient>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color.sun} />
            <stop offset="1" stopColor={color.hotPink} />
          </linearGradient>
          <clipPath id="sunCut">
            {/* listras do sol retrô: faixas que engrossam perto do horizonte */}
            <rect x="0" y="0" width="1080" height={HORIZON - 260} />
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} x="0" y={HORIZON - 260 + i * 24 + i * i} width="1080" height={14 - i * 1.5} />
            ))}
          </clipPath>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(f / 2) % 8} />
          </filter>
        </defs>
        <rect width="1080" height={HORIZON} fill="url(#sky)" />
        <circle cx="330" cy={HORIZON - 170} r="250" fill="url(#sun)" clipPath="url(#sunCut)" opacity={0.95} />
        <Skyline />
        <rect y={HORIZON} width="1080" height={1920 - HORIZON} fill="url(#water)" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={170 + shimmer(i) + i * 6} y={HORIZON + 18 + i * 26} width={260 - i * 22} height={6} rx={3} fill={color.sun} opacity={0.5 - i * 0.05} />
        ))}
        <Palm x={60} base={1500} h={820} lean={120} fill={color.silhouette} phase={0} />
        <Palm x={1040} base={1560} h={980} lean={-150} fill={color.silhouette} phase={1.7} />
        <Palm x={900} base={1300} h={520} lean={-60} fill={color.silhouetteFar} phase={3.1} />
        <rect width="1080" height="1920" fill={color.ink} opacity={0.12} />
        <rect width="1080" height="1920" filter="url(#grain)" opacity={0.06} />
      </svg>
    </AbsoluteFill>
  );
};

const neonStroke = (w = 6) => ({ WebkitTextStroke: `${w}px ${color.ink}`, paintOrder: 'stroke fill' as const });

/* ---------- topo: marca + progresso por segmentos ---------- */
const TopBar: React.FC<{ beats: TimelineBeat[]; channel: string }> = ({ beats, channel }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', top: 110, left: safe.left, right: safe.left, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {beats.map((b, i) => {
          const p = interpolate(f, [b.from, b.from + b.durationInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ flex: 1, height: 12, borderRadius: 6, background: `${color.ink}66`, overflow: 'hidden', border: `3px solid ${color.ink}` }}>
              <div style={{ width: `${p * 100}%`, height: '100%', background: color.white }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ fontFamily: fonts.display, fontSize: 40, ...sticker(7, 5) }}>★6 {channel}</div>
        <div style={{ fontFamily: fonts.neon, fontSize: 48, color: color.hotPink, ...neonStroke(5) }}>notícia checada</div>
      </div>
    </div>
  );
};

/* ---------- selo de status (adesivo carimbado) ---------- */
const SealStamp: React.FC<{ seal: Seal; delay?: number }> = ({ seal, delay = 8 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 11, stiffness: 180 } });
  const st = sealStyle[seal];
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        transform: `rotate(-4deg) scale(${interpolate(s, [0, 1], [1.6, 1])})`,
        opacity: s > 0.01 ? 1 : 0,
        background: st.color,
        border: `7px solid ${color.ink}`,
        boxShadow: `6px 9px 0 ${color.ink}`,
        color: color.ink,
        padding: '10px 26px',
        borderRadius: 18,
        fontFamily: fonts.display,
        fontSize: 42,
        letterSpacing: 2,
      }}
    >
      ✓ {st.label}
    </div>
  );
};

/* ---------- layouts ---------- */
const enter = (f: number, fps: number, delay = 0) => spring({ frame: f - delay, fps, config: { damping: 18, stiffness: 140 } });

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ alignSelf: 'flex-start', fontFamily: fonts.mono, fontWeight: 700, fontSize: 32, letterSpacing: 3, color: color.white, background: color.ink, padding: '8px 16px', borderRadius: 10 }}>{children}</div>
);

const BigNumber: React.FC<{ l: Extract<Layout, { kind: 'bigNumber' }> }> = ({ l }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Número factual NUNCA anima por valores intermediários: qualquer quadro pode virar capa.
  // Quadro 0 = composição final limpa; pulso de 0,4 s logo depois dá o impacto.
  const slam = interpolate(f, [0, 0.12 * fps, 0.4 * fps], [1, 1.05, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const meterP = l.meter ? interpolate(f, [4, 4 + fps], [0, l.value / l.meter.max], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }) : 0;
  const danger = l.meter && meterP * l.meter.max >= l.meter.danger;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {l.label && <Label>{l.label}</Label>}
      <div style={{ fontFamily: fonts.display, lineHeight: 0.95, display: 'flex', alignItems: 'baseline', gap: 18, transform: `scale(${slam})`, transformOrigin: 'left center' }}>
        {l.prefix && <span style={{ fontSize: 120, ...sticker(10, 10) }}>{l.prefix}</span>}
        <span style={{ fontSize: 330, letterSpacing: '-0.06em', ...sticker(16, 18) }}>{l.value}</span>
        {l.suffix && <span style={{ fontSize: 150, ...sticker(12, 12), color: color.sun }}>{l.suffix}</span>}
      </div>
      {l.meter && (
        <div style={{ width: 820, height: 58, borderRadius: 16, border: `7px solid ${color.ink}`, padding: 5, background: `${color.white}cc`, boxShadow: `6px 9px 0 ${color.ink}` }}>
          <div style={{ height: '100%', width: `${meterP * 100}%`, borderRadius: 8, background: danger ? color.hotPink : color.aqua }} />
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
        transform: `translateY(${(1 - e) * 60}px) rotate(-1deg)`,
        opacity: e,
        background: color.panel,
        border: `8px solid ${color.ink}`,
        outline: `4px solid ${color.hotPink}`,
        outlineOffset: -18,
        boxShadow: `10px 14px 0 ${color.ink}`,
        borderRadius: 28,
        padding: '58px 56px',
        width: 860,
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
      }}
    >
      <div style={{ fontFamily: fonts.neon, fontSize: 64, color: color.hotPink, lineHeight: 0.8 }}>direto da fonte</div>
      <div style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 60, lineHeight: 1.18, color: color.white }}>
        {words.map((w, i) => {
          const isHl = hl && hl.split(' ').some((h) => w.toLowerCase().replace(/[^\w]/g, '') === h.replace(/[^\w]/g, ''));
          return (
            <span key={i} style={{ opacity: i < shown ? 1 : 0.15, background: isHl && i < shown ? color.sun : 'transparent', color: isHl && i < shown ? color.ink : undefined, padding: isHl ? '0 8px' : 0, borderRadius: 8 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      {l.counter && <div style={{ fontFamily: fonts.neon, fontSize: 92, color: color.sun, lineHeight: 0.8, ...neonStroke(6) }}>{l.counter}</div>}
      <div style={{ fontFamily: fonts.display, fontSize: 180, lineHeight: 0.95, transform: `translateX(${(1 - e) * -80}px)`, opacity: e, ...sticker(14, 16) }}>{l.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {l.tags.map((t, i) => {
          const s = enter(f, fps, 10 + i * 5);
          return (
            <div
              key={t}
              style={{
                alignSelf: 'flex-start',
                transform: `translateY(${(1 - s) * 40}px) rotate(${i % 2 ? 1.5 : -1.5}deg)`,
                opacity: s,
                fontFamily: fonts.body,
                fontWeight: 900,
                fontSize: 50,
                color: color.ink,
                background: color.white,
                border: `6px solid ${color.ink}`,
                boxShadow: `6px 8px 0 ${color.ink}`,
                padding: '12px 28px',
                borderRadius: 18,
              }}
            >
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
  const pulse = interpolate(f, [0, 0.12 * fps, 0.4 * fps], [1, 1.04, 1], { extrapolateRight: 'clamp' });
  const days = Math.round((Date.parse(l.date) - Date.parse(renderDateISO.slice(0, 10))) / 86_400_000);
  const [, m, d] = l.date.split('-');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <Label>{l.label}</Label>
      <div style={{ fontFamily: fonts.display, fontSize: 290, letterSpacing: '-0.06em', lineHeight: 0.95, transform: `scale(${pulse})`, transformOrigin: 'left center', ...sticker(16, 18) }}>
        {d}/{m}
      </div>
      {days > 0 && (
        <div style={{ fontFamily: fonts.display, fontSize: 58, color: color.ink, background: color.sun, border: `7px solid ${color.ink}`, boxShadow: `6px 9px 0 ${color.ink}`, alignSelf: 'flex-start', padding: '10px 28px', borderRadius: 18, transform: 'rotate(-2deg)' }}>
          FALTAM {days} {days === 1 ? 'DIA' : 'DIAS'}
        </div>
      )}
    </div>
  );
};

const Poll: React.FC<{ l: Extract<Layout, { kind: 'poll' }> }> = ({ l }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = (k: number) => 1 + 0.035 * Math.max(0, Math.sin((f / fps) * Math.PI * 1.5 + k * Math.PI));
  const side = (t: string, k: number, bg: string) => {
    const e = enter(f, fps, k * 5);
    return (
      <div style={{ background: bg, border: `8px solid ${color.ink}`, boxShadow: `8px 12px 0 ${color.ink}`, color: color.ink, borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.display, fontSize: 120, transform: `scale(${pulse(k) * e}) rotate(${k ? 1.5 : -1.5}deg)`, height: 280, textAlign: 'center', lineHeight: 1 }}>
        {t}
      </div>
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, width: 860 }}>
      {l.question && <div style={{ fontFamily: fonts.display, fontSize: 62, lineHeight: 1.05, ...sticker(9, 8) }}>{l.question}</div>}
      {side(l.left, 0, color.white)}
      <div style={{ fontFamily: fonts.neon, fontSize: 90, color: color.hotPink, textAlign: 'center', lineHeight: 0.8, ...neonStroke(6) }}>ou</div>
      {side(l.right, 1, color.sun)}
    </div>
  );
};

const Title: React.FC<{ l: Extract<Layout, { kind: 'title' }> }> = ({ l }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = enter(f, fps);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, opacity: e }}>
      <div style={{ fontFamily: fonts.display, fontSize: 150, lineHeight: 0.98, ...sticker(14, 16) }}>{l.text}</div>
      {l.sub && <div style={{ fontFamily: fonts.neon, fontSize: 80, color: color.sun, ...neonStroke(6) }}>{l.sub}</div>}
    </div>
  );
};

/* ---------- legendas sincronizadas (adesivo) ---------- */
const Captions: React.FC<{ chunks: CaptionChunk[] }> = ({ chunks }) => {
  const f = useCurrentFrame();
  const c = chunks.find((c) => f >= c.from && f < c.to);
  if (!c) return null;
  const pop = interpolate(f - c.from, [0, 4], [0.9, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: safe.left, right: safe.right, bottom: safe.bottom + 10, display: 'flex', justifyContent: 'center' }}>
      <div style={{ transform: `scale(${pop})`, fontFamily: fonts.display, fontSize: 62, lineHeight: 1.1, textAlign: 'center', ...sticker(11, 8), color: c.emphasis ? color.sun : color.white }}>{c.text}</div>
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
        <div style={{ position: 'absolute', left: safe.left, bottom: safe.bottom - 110, fontFamily: fonts.mono, fontWeight: 700, fontSize: 26, color: color.white, background: `${color.ink}cc`, padding: '6px 12px', borderRadius: 8, letterSpacing: 1 }}>
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
