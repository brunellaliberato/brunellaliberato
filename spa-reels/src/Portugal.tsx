import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import geo from "./data/geo.json";
import roteiro from "./data/roteiro.json";
import duracoes from "./data/duracoes.json";
import palavras from "./data/palavras.json";
import { Cam, Keyframe, LonLat, W, H, arcPoints, cameraAt, scale, toScreen, toScreenN, mx, my } from "./geo";
import { AZUL, AZUL_ESCURO, DOURADO, Captions, CaptionChunk, CompareCard, PhotoCard, Pill, Pin, StatCard, fontFamily, useEnter } from "./ui";

export const FPS = 30;
const LEAD = 0.3; // respiro antes da primeira fala
const TAIL = 1.4; // segura o último quadro

type SegId = keyof typeof duracoes;
type Words = { w: string; s: number; e: number }[];

// ---------- linha do tempo a partir da narração ----------
const starts = {} as Record<SegId, number>;
{
  let t = LEAD;
  for (const s of roteiro.segmentos) {
    starts[s.id as SegId] = t;
    t += duracoes[s.id as SegId];
  }
}
export const TOTAL_SECONDS = LEAD + Object.values(duracoes).reduce((a, b) => a + b, 0) + TAIL;
const S = (id: SegId, rel = 0) => starts[id] + rel;
const E = (id: SegId) => starts[id] + duracoes[id];
/** momento (s) em que a palavra de índice i do trecho começa */
const Wd = (id: SegId, i: number) => {
  const ws = (palavras as Record<string, Words>)[id];
  return starts[id] + ws[Math.min(i, ws.length - 1)].s;
};
const f = (sec: number) => Math.round(sec * FPS);

// legendas: cada bloco começa na palavra correspondente
const captions: CaptionChunk[] = [];
for (const s of roteiro.segmentos) {
  const id = s.id as SegId;
  let idx = 0;
  s.legendas.forEach((txt, i) => {
    const start = Wd(id, idx);
    idx += txt.replace(/\*\*/g, "").split(/\s+/).filter(Boolean).length;
    captions.push({ text: txt, start, end: i === s.legendas.length - 1 ? E(id) + (id === "cta" ? TAIL : 0) : Wd(id, idx) });
  });
}

// ---------- lugares ----------
const P = {
  saoPaulo: [-46.63, -23.55] as LonLat,
  rio: [-43.17, -22.91] as LonLat,
  lisboa: [-9.14, 38.72] as LonLat,
  belem: [-9.206, 38.697] as LonLat,
  roca: [-9.5, 38.781] as LonLat,
  nazare: [-9.08, 39.605] as LonLat,
  coimbra: [-8.426, 40.207] as LonLat,
  pinhao: [-7.545, 41.191] as LonLat,
};

const ROUTE = { lon: -27, lat: 11, zoom: 4.55 };
const D = duracoes;

// ---------- câmera ----------
const KF: Keyframe[] = [
  { t: 0, lon: -8.0, lat: 39.75, zoom: 6.85 },
  { t: E("gancho") - 0.2, lon: -8.0, lat: 39.75, zoom: 7.05 },
  { t: S("voo", 1.7), ...ROUTE },
  { t: E("corte") - 0.3, ...ROUTE, zoom: 4.7 },
  { t: S("nata", 1.8), lon: -9.17, lat: 38.715, zoom: 10.7 },
  { t: E("nata") - 0.2, lon: -9.18, lat: 38.72, zoom: 10.9 },
  { t: S("roca", 1.2), lon: -9.4, lat: 38.775, zoom: 10.5 },
  { t: E("roca") - 0.2, lon: -9.41, lat: 38.78, zoom: 10.7 },
  { t: S("nazare", 1.2), lon: -9.04, lat: 39.655, zoom: 10.3 },
  { t: E("nazare") - 0.2, lon: -9.05, lat: 39.65, zoom: 10.5 },
  { t: S("coimbra", 1.1), lon: -8.42, lat: 40.245, zoom: 10.2 },
  { t: E("coimbra") - 0.2, lon: -8.42, lat: 40.24, zoom: 10.4 },
  { t: S("douro", 1.1), lon: -7.58, lat: 41.245, zoom: 9.7 },
  { t: E("douro") - 0.2, lon: -7.6, lat: 41.24, zoom: 9.9 },
  { t: S("fecho", 1.4), lon: -8.1, lat: 39.75, zoom: 7.95 },
  { t: E("fecho"), lon: -8.1, lat: 39.75, zoom: 8.05 },
  { t: S("cta", 1.6), ...ROUTE },
  { t: TOTAL_SECONDS, ...ROUTE, zoom: 4.65 },
];

// ---------- mapa ----------
type Layer = { src: string; x0: number; y0: number; x1: number; y1: number };
const LAYERS: { layer: Layer; fadeIn: [number, number] }[] = [
  { layer: geo.layers.world, fadeIn: [-99, -98] },
  { layer: geo.layers.iberia, fadeIn: [5.4, 6.2] },
  { layer: geo.layers.portugal, fadeIn: [7.5, 8.2] },
];

const MapLayers: React.FC<{ cam: Cam }> = ({ cam }) => (
  <>
    {LAYERS.map(({ layer, fadeIn }) => {
      const [x, y] = toScreenN(cam, layer.x0, layer.y0);
      const k = scale(cam.zoom);
      const op = interpolate(cam.zoom, fadeIn, [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return (
        <Img key={layer.src} src={staticFile(layer.src)} style={{ position: "absolute", left: x, top: y, width: (layer.x1 - layer.x0) * k, height: (layer.y1 - layer.y0) * k, opacity: op, maxWidth: "none" }} />
      );
    })}
  </>
);

const pathOf = (cam: Cam, rings: number[][][]) =>
  rings
    .map((r) => "M" + r.map(([lon, lat]) => toScreen(cam, [lon, lat]).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z")
    .join("");

const polyline = (cam: Cam, pts: [number, number][]) =>
  "M" + pts.map(([x, y]) => toScreenN(cam, x, y).map((v) => v.toFixed(1)).join(" ")).join("L");

const Glow: React.FC<{ d: string; color: string; width: number; opacity?: number; dash?: string; fill?: string; draw?: number }> = ({ d, color, width, opacity = 1, dash, fill = "none", draw = 1 }) => (
  <g opacity={opacity}>
    <path d={d} fill={fill} stroke="none" />
    <path d={d} fill="none" stroke={color} strokeWidth={width * 4} strokeOpacity={0.35} filter="url(#blur)" pathLength={1} strokeDasharray={draw < 1 ? `${draw} 1` : dash} strokeLinejoin="round" />
    <path d={d} fill="none" stroke={color} strokeWidth={width} pathLength={dash ? undefined : 1} strokeDasharray={draw < 1 ? `${draw} 1` : dash} strokeLinejoin="round" strokeLinecap="round" />
  </g>
);

const Plane: React.FC<{ x: number; y: number; angle: number; opacity: number }> = ({ x, y, angle, opacity }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle})`} opacity={opacity}>
    <path d="M 26 0 L 6 -5 L -6 -22 L -12 -22 L -4 -5 L -16 -4 L -22 -11 L -27 -11 L -23 0 L -27 11 L -22 11 L -16 4 L -4 5 L -12 22 L -6 22 L 6 5 Z" fill="white" stroke={AZUL_ESCURO} strokeWidth={2} />
  </g>
);

const Route: React.FC<{ cam: Cam; pts: [number, number][]; progress: number; color: string; opacity: number }> = ({ cam, pts, progress, color, opacity }) => {
  if (progress <= 0 || opacity <= 0) return null;
  const n = Math.max(2, Math.round(progress * (pts.length - 1)) + 1);
  const shown = pts.slice(0, n);
  const [x, y] = toScreenN(cam, ...shown[shown.length - 1]);
  const [px, py] = toScreenN(cam, ...shown[Math.max(0, shown.length - 3)]);
  const angle = (Math.atan2(y - py, x - px) * 180) / Math.PI;
  return (
    <g opacity={opacity}>
      <path d={polyline(cam, pts)} fill="none" stroke="white" strokeOpacity={0.18} strokeWidth={3} strokeDasharray="10 12" />
      <Glow d={polyline(cam, shown)} color={color} width={6} />
      {progress < 1 && <Plane x={x} y={y} angle={angle} opacity={1} />}
    </g>
  );
};

const ROUTE_SP_LIS = arcPoints(P.saoPaulo, P.lisboa, -0.28);
const ROUTE_LIS_RIO = arcPoints(P.lisboa, P.rio, -0.22);

// ---------- vídeo ----------
export const Portugal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cam = cameraAt(KF, t);
  const ramp = (a: number, b: number) => interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scr = (p: LonLat) => toScreen(cam, p);

  const ptOpacity = interpolate(cam.zoom, [9.2, 10], [1, 0.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const districtsOp = interpolate(cam.zoom, [7.3, 8.2], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const countriesOp = interpolate(cam.zoom, [5.5, 7], [0.5, 0.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const brazilOp = interpolate(cam.zoom, [5, 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ptDraw = ramp(0.1, 1.4);
  const peOp = ramp(Wd("gancho", 6) - 0.2, Wd("gancho", 6) + 0.4) * (1 - ramp(E("gancho") - 0.1, E("gancho") + 0.4));
  const ptFill = interpolate(cam.zoom, [9, 10], [0.16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const [lisX, lisY] = scr(P.lisboa);
  const [spX, spY] = scr(P.saoPaulo);
  const [rioX, rioY] = scr(P.rio);

  return (
    <AbsoluteFill style={{ background: "#0a1322", fontFamily, overflow: "hidden" }}>
      <MapLayers cam={cam} />
      {/* vinheta para dar leitura ao texto */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 60% at 50% 42%, transparent 55%, rgba(5,10,20,0.55) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(transparent 52%, rgba(5,10,20,0.55) 75%, rgba(5,10,20,0.7) 100%)" }} />

      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <path d={pathOf(cam, geo.countries)} fill="none" stroke="white" strokeOpacity={countriesOp} strokeWidth={1.6} />
        <path d={pathOf(cam, geo.districts)} fill="none" stroke="white" strokeOpacity={districtsOp} strokeWidth={1.5} />
        <Glow d={pathOf(cam, geo.brazil)} color={AZUL} width={3.5} opacity={brazilOp} />
        <Glow d={pathOf(cam, geo.portugal)} color={AZUL} width={5} opacity={ptOpacity} draw={ptDraw} fill={`rgba(0,174,239,${ptFill})`} />
        <Glow d={pathOf(cam, geo.pernambucoOverPortugal)} color={DOURADO} width={4.5} opacity={peOp} dash="16 12" fill="rgba(255,201,77,0.18)" />
        <Route cam={cam} pts={ROUTE_SP_LIS} progress={ramp(S("voo", 0.9), S("voo", 3.6))} color={AZUL} opacity={1 - ramp(S("corte", 0.6), S("corte", 1.2))} />
        <Route cam={cam} pts={ROUTE_LIS_RIO} progress={ramp(Wd("corte", 9) - 0.6, Wd("corte", 13))} color={DOURADO} opacity={1 - ramp(E("corte") - 0.4, E("corte"))} />
      </svg>

      {/* ---- 1. gancho ---- */}
      <Sequence from={0} durationInFrames={f(E("gancho") + 0.3)} layout="none">
        <MapLabel cam={cam} at={[-8.15, 41.35]} text="PORTUGAL" from={f(0.5)} />
        <MapLabel cam={cam} at={[-6.6, 38.2]} text="PERNAMBUCO" color={DOURADO} from={f(Wd("gancho", 6))} />
        <CompareCard from={f(Wd("gancho", 6) - 0.1)} to={f(E("gancho") + 0.3)} rows={[
          { label: "Pernambuco", value: 98064, color: DOURADO },
          { label: "Portugal", value: 92225, color: AZUL },
        ]} />
      </Sequence>

      {/* ---- 2. voo ---- */}
      <Pin x={spX} y={spY} from={f(S("voo", 0.6))} to={f(S("corte", 1))} label="São Paulo" labelSide="right" />
      <Pin x={lisX} y={lisY} from={f(S("voo", 0.6))} to={f(S("nata", 0.8))} label="Lisboa" labelSide="right" />
      <Pill x={W / 2} y={300} from={f(S("voo", 1.2))} to={f(S("corte", 0.4))} text="São Paulo → Lisboa · ~10h de voo" size={38} />
      <PhotoCard x={lisX} y={lisY} dx={-300} dy={250} from={f(S("voo", 3.4))} to={f(S("corte", 1.4))} src="lisboa.jpg" label="Lisboa" />

      {/* ---- 3. corte ---- */}
      <StatCard from={f(Wd("corte", 0))} to={f(Wd("corte", 14))} valueFrom={1700} valueTo={1808} noGrouping title="A corte portuguesa foge de Napoleão" />
      <StatCard from={f(Wd("corte", 14))} to={f(E("corte") + 0.2)} valueFrom={0} valueTo={13} unit="anos" title="Rio de Janeiro, capital do império (1808–1821)" color={DOURADO} />
      <Pin x={rioX} y={rioY} from={f(Wd("corte", 11))} to={f(E("corte"))} label="Rio de Janeiro" labelSide="right" color={DOURADO} />

      {/* ---- 4. pastel de nata ---- */}
      <PlaceScene cam={cam} id="nata" at={P.belem} label="Belém" photo="nata.jpg" photoLabel="Pastéis de Belém" dx={60} dy={-330}
        pill={{ text: "Pastéis de Belém · desde 1837", from: Wd("nata", 8) }} />

      {/* ---- 5. Cabo da Roca ---- */}
      <PlaceScene cam={cam} id="roca" at={P.roca} label="Cabo da Roca" photo="roca.jpg" photoLabel="Cabo da Roca" dx={140} dy={-330}
        pill={{ text: "← ponto mais a oeste da Europa continental", from: Wd("roca", 8), size: 30 }} />

      {/* ---- 6. Nazaré ---- */}
      <PlaceScene cam={cam} id="nazare" at={P.nazare} label="Nazaré" photo="nazare.jpg" photoLabel="Praia do Norte, Nazaré" dx={150} dy={-200} />
      <StatCard from={f(Wd("nazare", 11))} to={f(E("nazare") + 0.2)} valueFrom={0} valueTo={24.38} decimals={2} unit="m" title="Onda de Rodrigo Koxa · recorde em 2017" />

      {/* ---- 7. Coimbra ---- */}
      <PlaceScene cam={cam} id="coimbra" at={P.coimbra} label="Coimbra" photo="coimbra.jpg" photoLabel="Universidade de Coimbra" dx={40} dy={-200} />
      <StatCard from={f(Wd("coimbra", 10))} to={f(E("coimbra") + 0.2)} valueFrom={1100} valueTo={1290} noGrouping title="Ano de fundação da Universidade" />

      {/* ---- 8. Douro ---- */}
      <PlaceScene cam={cam} id="douro" at={P.pinhao} label="Vale do Douro" photo="douro.jpg" photoLabel="Pinhão, Vale do Douro" dx={-60} dy={-200} />
      <StatCard from={f(Wd("douro", 12))} to={f(E("douro") + 0.2)} valueFrom={1600} valueTo={1756} noGrouping title="Região Demarcada do Douro · UNESCO desde 2001" />

      {/* ---- 9. fecho ---- */}
      <Pill x={W / 2 - 250} y={330} from={f(S("fecho", 1.2))} to={f(S("cta", 0.4))} text="1808" bg={DOURADO} size={32} />
      <Pill x={W / 2 + 10} y={330} from={f(S("fecho", 1.45))} to={f(S("cta", 0.4))} text="Pastel de nata" bg={AZUL} size={32} />
      <Pill x={W / 2 + 290} y={330} from={f(S("fecho", 1.7))} to={f(S("cta", 0.4))} text="Ondas" bg="white" size={32} />
      <Pill x={W / 2 - 120} y={410} from={f(S("fecho", 1.95))} to={f(S("cta", 0.4))} text="Universidade" bg="white" size={32} />
      <Pill x={W / 2 + 200} y={410} from={f(S("fecho", 2.2))} to={f(S("cta", 0.4))} text="Vinho do Porto" bg={DOURADO} size={32} />

      {/* ---- 10. CTA ---- */}
      <CtaCard from={f(S("cta", 0.2))} to={f(Wd("cta", 9))} title="Qual destino no próximo?" sub="Comenta aqui embaixo ↓" />
      <CtaCard from={f(Wd("cta", 9))} title="Quer conhecer Portugal?" sub="Chama a SPA no direct" spa />

      <Captions chunks={captions} />
      <Brand />
      <Credits />

      {roteiro.segmentos.map((s) => (
        <Sequence key={s.id} from={f(S(s.id as SegId))} layout="none">
          <Audio src={staticFile(`audio/${s.id}.wav`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const MapLabel: React.FC<{ cam: Cam; at: LonLat; text: string; from: number; color?: string }> = ({ cam, at, text, from, color = "white" }) => {
  const a = useEnter(from);
  const [x, y] = toScreen(cam, at);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity: a, color, fontSize: 48, fontWeight: 800, letterSpacing: 8, textShadow: "0 3px 14px rgba(0,0,0,0.9)" }}>{text}</div>
  );
};

const PlaceScene: React.FC<{ cam: Cam; id: SegId; at: LonLat; label: string; photo: string; photoLabel: string; dx: number; dy: number; pill?: { text: string; from: number; size?: number } }> = ({ cam, id, at, label, photo, photoLabel, dx, dy, pill }) => {
  const [x, y] = toScreen(cam, at);
  const from = f(S(id, 0.9));
  const to = f(E(id) + 0.25);
  return (
    <>
      <Pin x={x} y={y} from={from} to={to} label={label} labelSide={dx > 0 ? "left" : "right"} />
      <PhotoCard x={x} y={y} dx={dx} dy={dy} from={f(S(id, 1.3))} to={to} src={photo} label={photoLabel} />
      {pill && <Pill x={W / 2} y={300} from={f(pill.from)} to={to} text={pill.text} size={pill.size ?? 34} />}
    </>
  );
};

const CtaCard: React.FC<{ from: number; to?: number; title: string; sub: string; spa?: boolean }> = ({ from, to, title, sub, spa }) => {
  const a = useEnter(from, to);
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 250, padding: "36px 40px", textAlign: "center", background: spa ? AZUL : "rgba(27,42,74,0.86)", border: spa ? "none" : "2px solid rgba(0,174,239,0.5)", borderRadius: 32, opacity: a, transform: `scale(${0.9 + 0.1 * a})`, boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
      <div style={{ fontSize: 58, fontWeight: 800, color: spa ? AZUL_ESCURO : "white", lineHeight: 1.1 }}>{title}</div>
      <div style={{ fontSize: 38, fontWeight: 700, color: spa ? "white" : AZUL, marginTop: 14 }}>{sub}</div>
    </div>
  );
};

// marca provisória (trocar pelo logo oficial)
const Brand: React.FC = () => (
  <div style={{ position: "absolute", left: 70, top: 120, display: "flex", alignItems: "center", gap: 14, opacity: 0.95 }}>
    <div style={{ background: AZUL, color: AZUL_ESCURO, fontWeight: 800, fontSize: 34, padding: "6px 16px", borderRadius: 12, letterSpacing: 1 }}>SPA</div>
    <div style={{ color: "white", fontWeight: 600, fontSize: 28, textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>Sua Passagem Aérea</div>
  </div>
);

const Credits: React.FC = () => (
  <div style={{ position: "absolute", left: 40, right: 40, bottom: 26, color: "rgba(255,255,255,0.55)", fontSize: 18, textAlign: "center" }}>
    Mapa: Sentinel-2 cloudless 2016 by EOX (CC BY 4.0) · Fotos: Wikimedia Commons (créditos na legenda)
  </div>
);

// evita aviso de import não usado em builds futuros
void mx; void my;
